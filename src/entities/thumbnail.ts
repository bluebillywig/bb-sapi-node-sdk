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

  /**
   * Absolute URL of a media clip's poster image.
   *
   * Use this rather than building a URL from the clip payload. A clip's `src` is
   * its SOURCE MEDIA file, so `defaultMediaAssetPath + clip.src` yields a link
   * to a .mov — the service says as much, replying
   * "Invalid src mime type: video/quicktime". That mistake shows up as a grid
   * full of broken images.
   *
   * `'default'` is accepted for either dimension and lets the service choose.
   *
   * A draft (unpublished) clip's poster is not public. Pass an RPC token minted
   * from the READ-ONLY key — never the write key, because this URL ends up in
   * page source — to see those.
   */
  getMediaClipPosterPath(
    mediaClipId: number | string,
    width: number | 'default' = 'default',
    height: number | 'default' = 'default',
    rpcToken?: string,
  ): string {
    const dimension = (value: number | 'default'): string =>
      typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 100000
        ? String(value)
        : 'default';

    const url =
      `${this.sdk.baseUri}/mediaclip/${encodeURIComponent(String(mediaClipId))}` +
      `/spthumbnail/${dimension(width)}/${dimension(height)}.webp`;

    return rpcToken ? `${url}?useSession=true&rpctoken=${encodeURIComponent(rpcToken)}` : url;
  }

}
