'use strict';
const puppeteer = require('puppeteer');
const getStories = require('../dist/getStories');
const {makeVisualGridClient} = require('@applitools/visual-grid-client');
const {presult} = require('@applitools/functional-commons');
const chalk = require('./chalkify');
const makeInitPage = require('./initPage');
const makeRenderStory = require('./renderStory');
const makeRenderStories = require('./renderStories');
const makeGetStoryData = require('./getStoryData');
const ora = require('ora');
const filterStories = require('./filterStories');
const addVariationStories = require('./addVariationStories');
const browserLog = require('./browserLog');
const memoryLog = require('./memoryLog');
const getIframeUrl = require('./getIframeUrl');
const createPagePool = require('./pagePool');
const getClientAPI = require('../dist/getClientAPI');
const {takeDomSnapshots} = require('@applitools/eyes-sdk-core');
const {Driver} = require('@applitools/eyes-puppeteer');
const {refineErrorMessage} = require('./errMessages');
const {splitConfigsByBrowser} = require('./shouldRenderIE');
const executeRenders = require('./executeRenders');

const CONCURRENT_PAGES = 3;

async function eyesStorybook({
  config,
  logger,
  performance,
  timeItAsync,
  outputStream = process.stderr,
}) {
  let memoryTimeout;
  let renderIE = false;
  let transitioning = false;
  takeMemLoop();
  logger.log('eyesStorybook started');
  const {storybookUrl, waitBeforeScreenshot, readStoriesTimeout, reloadPagePerStory} = config;

  let iframeUrl;
  try {
    iframeUrl = getIframeUrl(storybookUrl);
  } catch (ex) {
    logger.log(ex);
    throw new Error(`Storybook URL is not valid: ${storybookUrl}`);
  }

  const browser = await puppeteer.launch(config.puppeteerOptions);
  logger.log('browser launched');
  const page = await browser.newPage();
  const userAgent = await page.evaluate('navigator.userAgent');

  const {
    testWindow,
    closeBatch,
    globalState,
    getIosDevicesSizes,
    getEmulatedDevicesSizes,
    getResourceUrlsInCache,
  } = makeVisualGridClient({
    userAgent,
    ...config,
    logger: logger.extend('vgc'),
  });

  const initPage = makeInitPage({
    iframeUrl,
    config,
    browser,
    logger,
    getTransitiongIntoIE,
    getRenderIE,
  });
  const pagePool = createPagePool({initPage, logger});

  const doTakeDomSnapshots = async ({page, layoutBreakpoints}) => {
    const driver = new Driver(logger, page);
    const skipResources = getResourceUrlsInCache();
    const result = await takeDomSnapshots({
      logger,
      driver,
      breakpoints: layoutBreakpoints !== undefined ? layoutBreakpoints : config.layoutBreakpoints,
      browsers: config.browser || [true], // this is a hack, since takeDomSnapshots expects an array. And VGC has a default in case browser is not specified. So we just need an array with length of 1 here.
      skipResources,
      showLogs: !!config.showLogs,
      disableBrowserFetching: !!config.disableBrowserFetching,
      getViewportSize: () => config.viewportSize,
      getIosDevicesSizes,
      getEmulatedDevicesSizes,
    });
    return result;
  };

  logger.log('got script for processPage');
  browserLog({
    page,
    onLog: text => {
      logger.log(`master tab: ${text}`);
    },
  });
  try {
    const [stories] = await Promise.all(
      [getStoriesWithSpinner()].concat(
        new Array(CONCURRENT_PAGES).fill().map(async () => {
          const {pageId} = await pagePool.createPage();
          pagePool.addToPool(pageId);
        }),
      ),
    );

    const filteredStories = filterStories({stories, config});
    const storiesIncludingVariations = addVariationStories({stories: filteredStories, config});

    logger.log(`starting to run ${storiesIncludingVariations.length} stories`);

    const getStoryData = makeGetStoryData({
      logger,
      takeDomSnapshots: doTakeDomSnapshots,
      waitBeforeScreenshot,
    });

    const renderStory = makeRenderStory({
      logger: logger.extend('renderStory'),
      testWindow,
      performance,
      timeItAsync,
      reloadPagePerStory,
    });

    const renderStories = makeRenderStories({
      getStoryData,
      renderStory,
      getClientAPI,
      storybookUrl,
      logger,
      stream: outputStream,
      waitForQueuedRenders: globalState.waitForQueuedRenders,
      storyDataGap: config.storyDataGap,
      pagePool,
    });

    logger.log('finished creating functions');

    const configs = splitConfigsByBrowser(config);

    const [error, results] = await presult(
      executeRenders({
        renderStories,
        setRenderIE,
        setTransitioningIntoIE,
        configs,
        stories: storiesIncludingVariations,
        pagePool,
        logger,
        timeItAsync,
      }),
    );

    const [closeBatchErr] = await presult(closeBatch());

    if (closeBatchErr) {
      logger.log('failed to close batch', closeBatchErr);
    }

    if (error) {
      const msg = refineErrorMessage({prefix: 'Error in executeRenders:', error});
      logger.log(error);
      throw new Error(msg);
    } else {
      return results;
    }
  } finally {
    logger.log('total time: ', performance['renderStories']);
    logger.log('perf results', performance);
    await browser.close();
    clearTimeout(memoryTimeout);
  }

  async function getStoriesWithSpinner() {
    let hasConsoleErr;
    page.on('console', msg => {
      hasConsoleErr =
        msg.args()[0] &&
        msg.args()[0]._remoteObject &&
        msg.args()[0]._remoteObject.subtype === 'error';
    });

    logger.log('Getting stories from storybook');
    const spinner = ora({text: 'Reading stories', stream: outputStream});
    spinner.start();
    logger.log('navigating to storybook url:', storybookUrl);
    const [navigateErr] = await presult(page.goto(storybookUrl, {timeout: readStoriesTimeout}));
    if (navigateErr) {
      logger.log('Error when loading storybook', navigateErr);
      const failMsg = refineErrorMessage({
        prefix: 'Error when loading storybook.',
        error: navigateErr,
      });
      spinner.fail(failMsg);
      throw new Error();
    }
    const [getStoriesErr, stories] = await presult(
      page.evaluate(getStories, {timeout: readStoriesTimeout}),
    );
    if (getStoriesErr) {
      logger.log('Error in getStories:', getStoriesErr);
      const failMsg = refineErrorMessage({
        prefix: 'Error when reading stories:',
        error: getStoriesErr,
      });
      spinner.fail(failMsg);
      throw new Error();
    }

    if (!stories.length && hasConsoleErr) {
      return [
        new Error(
          'Could not load stories, make sure your storybook renders correctly. Perhaps no stories were rendered?',
        ),
      ];
    }

    const badParamsError = stories
      .map(s => s.error)
      .filter(Boolean)
      .join('\n');
    if (badParamsError) {
      console.log(chalk.red(`\n${badParamsError}`));
    }

    spinner.succeed();
    logger.log(`got ${stories.length} stories:`, JSON.stringify(stories));
    return stories;
  }

  function takeMemLoop() {
    logger.log(memoryLog(process.memoryUsage()));
    memoryTimeout = setTimeout(takeMemLoop, 30000);
  }

  function getRenderIE() {
    return renderIE;
  }

  function setRenderIE(value) {
    renderIE = value;
  }

  function setTransitioningIntoIE(value) {
    transitioning = value;
  }

  function getTransitiongIntoIE() {
    return transitioning;
  }
}

module.exports = eyesStorybook;
