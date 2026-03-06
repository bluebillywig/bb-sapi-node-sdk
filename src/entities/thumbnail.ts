import { Entity } from '../entity.js';

export class Thumbnail extends Entity {
  /**
   * Constructs an absolute thumbnail URL with optional dimensions.
   * @param relativeImagePath - The relative path to the image (with or without leading slash).
   * @param width - Desired width in pixels (0 for original). Must be non-negative.
   * @param height - Desired height in pixels (0 for original). Must be non-negative.
   * @throws {RangeError} if width or height is negative.
   */
  getAbsoluteImagePath(
    relativeImagePath: string,
    width: number = 0,
    height: number = 0,
  ): string {
    if (width < 0) {
      throw new RangeError('Given width is lower than 0.');
    }
    if (height < 0) {
      throw new RangeError('Given height is lower than 0.');
    }
    relativeImagePath = relativeImagePath.replace(/^\//, '');
    return `${this.sdk.baseUri}/image/${width}/${height}/${relativeImagePath}`;
  }
}
