'use strict';

const {ArgumentGuard, PositionProvider, Location} = require('eyes.sdk');

const EyesSeleniumUtils = require('../EyesSeleniumUtils');
const ScrollPositionMemento = require('./ScrollPositionMemento');

class ScrollPositionProvider extends PositionProvider {

    /**
     * @param {Logger} logger A Logger instance.
     * @param {EyesJsExecutor} executor
     */
    constructor(logger, executor) {
        super();

        ArgumentGuard.notNull(logger, "logger");
        ArgumentGuard.notNull(executor, "executor");

        this._logger = logger;
        this._executor = executor;

        this._logger.verbose("creating ScrollPositionProvider");
    }

    /**
     * @override
     * @inheritDoc
     */
    getCurrentPosition() {
        this._logger.verbose("ScrollPositionProvider - getCurrentPosition()");

        const that = this;
        return EyesSeleniumUtils.getCurrentScrollPosition(this._executor).catch(err => {
            throw new Error("EyesDriverOperationException: Failed to extract current scroll position! Error: " + err);
        }).then(result => {
            that._logger.verbose(`Current position: ${result}`);
            return result;
        });
    }

    /**
     * @override
     * @inheritDoc
     */
    setPosition(location) {
        const that = this;
        that._logger.verbose(`ScrollPositionProvider - Scrolling to ${location}`);
        return EyesSeleniumUtils.setCurrentScrollPosition(this._executor, location).then(() => {
            that._logger.verbose("ScrollPositionProvider - Done scrolling!");
        });
    }

    /**
     * @override
     * @inheritDoc
     */
    getEntireSize() {
        const that = this;
        return EyesSeleniumUtils.getCurrentFrameContentEntireSize(this._executor).then(result => {
            that._logger.verbose(`ScrollPositionProvider - Entire size: ${result}`);
            return result;
        });
    }

    /**
     * @override
     * @return {Promise.<ScrollPositionMemento>}
     */
    getState() {
        return this.getCurrentPosition().then(position => new ScrollPositionMemento(position));
    }

    // noinspection JSCheckFunctionSignatures
    /**
     * @override
     * @param {ScrollPositionMemento} state The initial state of position
     * @return {Promise}
     */
    restoreState(state) {
        const that = this;
        return this.setPosition(new Location(state.getX(), state.getY())).then(() => {
            that._logger.verbose("Position restored.");
        });
    }
}

module.exports = ScrollPositionProvider;
