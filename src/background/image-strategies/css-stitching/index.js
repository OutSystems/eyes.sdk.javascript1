import {
  FullPageCaptureAlgorithm,
  NullDebugScreenshotProvider,
  NullCutProvider,
  FixedScaleProviderFactory,
  FixedScaleProvider,
  ReadOnlyPropertyHandler,
  EyesSimpleScreenshotFactory,
  Region,
} from '@applitools/eyes-sdk-core'

import ScrollPositionProvider from './ScrollPositionProvider'
import CSSTranslatePositionProvider from './CSSTranslatePositionProvider'
import WebExtensionImageProvider from './WebExtensionImageProvider'

const REGION_POSITION_COMPENSATION = undefined
const DEFAULT_WAIT_BEFORE_SCREENSHOTS = 100 // Milliseconds
const DEFAULT_STITCHING_OVERLAP = 50 // pixels

export function buildCheckWindowFullFunction(eyes, tabId, devicePixelRatio) {
  const fullPageCapture = initFullPageCapture(
    eyes._logger,
    tabId,
    devicePixelRatio
  )
  return () =>
    fullPageCapture.getStitchedRegion(
      Region.EMPTY,
      null,
      new CSSTranslatePositionProvider(eyes._logger, tabId)
    )
}

function initFullPageCapture(logger, tabId, devicePixelRatio) {
  return new FullPageCaptureAlgorithm(
    logger,
    REGION_POSITION_COMPENSATION,
    DEFAULT_WAIT_BEFORE_SCREENSHOTS,
    new NullDebugScreenshotProvider(),
    new EyesSimpleScreenshotFactory(),
    new ScrollPositionProvider(logger, tabId),
    new FixedScaleProviderFactory(
      1 / devicePixelRatio,
      new ReadOnlyPropertyHandler(
        logger,
        new FixedScaleProvider(1 / devicePixelRatio)
      )
    ),
    new NullCutProvider(),
    DEFAULT_STITCHING_OVERLAP,
    new WebExtensionImageProvider(tabId)
  )
}
