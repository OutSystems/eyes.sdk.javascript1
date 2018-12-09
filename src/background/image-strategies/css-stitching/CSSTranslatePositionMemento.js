import { PositionMemento } from '@applitools/eyes-sdk-core'

export default class CssTranslatePositionMemento extends PositionMemento {
  constructor(transforms, position) {
    super()

    this._transforms = transforms
    this._position = position
  }

  getTransform() {
    return this._transforms
  }

  getPosition() {
    return this._position
  }
}
