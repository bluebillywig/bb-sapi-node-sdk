import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { basename, extname } from 'node:path';
import { Entity } from '../entity.js';
import { SapiResponse } from '../response.js';
import type { Listable } from '../contracts/listable.js';
import type { Gettable } from '../contracts/gettable.js';
import type { Creatable } from '../contracts/creatable.js';
import type { Updatable } from '../contracts/updatable.js';
import type { Deletable } from '../contracts/deletable.js';
import type { MediaClipProps } from '../types/media-clip-props.js';
import type { UploadData } from '../types/upload.js';
import type { HTTPRequestException } from '../exceptions/http-request-exception.js';
import { buildQuery } from '../util/query-params.js';

/** Default delay (in ms) between upload progress polling requests. */
const DEFAULT_UPLOAD_PROGRESS_POLL_INTERVAL = 2000;

/** Maps file extensions to MIME types for media upload content-type detection. */
const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mkv': 'video/x-matroska',
  '.m4v': 'video/x-m4v',
  '.3gp': 'video/3gpp',
  '.3g2': 'video/3gpp2',
  '.ts': 'video/mp2t',
  '.mts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.mpd': 'application/dash+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus',
  '.oga': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.heif': 'image/heif',
  '.heic': 'image/heic',
  '.mxf': 'application/mxf',
};

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

export class MediaClip extends Entity implements Listable, Gettable, Creatable<MediaClipProps>, Updatable<MediaClipProps>, Deletable {
  async list(
    limit: number = 15,
    offset: number = 0,
    sort: string = 'createddate desc',
  ): Promise<SapiResponse> {
    return this.sdk.sendRequest('GET', '/sapi/mediaclip', {
      query: buildQuery({ limit, offset, sort }),
    });
  }

  async get(
    id: number | string,
    lang?: string | null,
    includeJobs: boolean = true,
  ): Promise<SapiResponse> {
    return this.sdk.sendRequest('GET', `/sapi/mediaclip/${id}`, {
      query: buildQuery({ includejobs: includeJobs, lang }),
    });
  }

  async create(
    props: MediaClipProps,
    softSave: boolean = false,
    lang?: string | null,
  ): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', '/sapi/mediaclip', {
      query: buildQuery({ softsave: softSave, lang }),
      json: props,
    });
  }

  async update(
    id: number | string,
    props: MediaClipProps,
    softSave: boolean = false,
    lang?: string | null,
  ): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', `/sapi/mediaclip/${id}`, {
      query: buildQuery({ softsave: softSave, lang }),
      json: props,
    });
  }

  async delete(id: number | string, purge: boolean = false): Promise<SapiResponse> {
    return this.sdk.sendRequest('DELETE', `/sapi/mediaclip/${id}`, {
      query: purge ? buildQuery({ purge }) : undefined,
    });
  }

  async initializeUpload(
    mediaClipPath: string,
    mediaClipId?: number | null,
  ): Promise<SapiResponse> {
    const fileStat = await stat(mediaClipPath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      throw new Error(`File ${mediaClipPath} is not a file or does not exist.`);
    }

    return this.sdk.sendRequest('GET', '/sapi/mediaclip/0/upload', {
      query: buildQuery({
        filename: basename(mediaClipPath),
        filesize: fileStat.size,
        contenttype: getMimeType(mediaClipPath),
        clipid: mediaClipId,
      }),
    });
  }

  async abortUpload(s3FileKey: string, s3UploadId: string): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', '/sapi/mediaclip/0/abortUpload', {
      query: buildQuery({ s3filekey: s3FileKey, s3uploadid: s3UploadId }),
    });
  }

  async completeUpload(
    s3FileKey: string,
    s3UploadId: string,
    s3Parts: Array<{ ETag: string; PartNumber: string }>,
  ): Promise<SapiResponse> {
    return this.sdk.sendRequest('PUT', '/sapi/mediaclip/0/completeUpload', {
      json: { s3FileKey, s3UploadId, s3Parts },
    });
  }

  /**
   * Executes a file upload using presigned URLs from the SAPI.
   * Handles both single-chunk and multi-part uploads with streaming.
   * On multi-part failure, automatically aborts the upload before re-throwing.
   * @param mediaClipPath - Absolute path to the local file.
   * @param uploadData - Upload configuration returned by `initializeUpload()`.
   * @returns `true` on success.
   */
  async executeUpload(mediaClipPath: string, uploadData: UploadData): Promise<boolean> {
    const fileStat = await stat(mediaClipPath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      throw new Error(`File ${mediaClipPath} is not a file or does not exist.`);
    }

    if (uploadData.chunks === undefined || uploadData.presignedUrls === undefined) {
      throw new Error("uploadData must contain 'chunks' and 'presignedUrls' keys.");
    }

    if (uploadData.chunks === 1) {
      const response = await this.performUpload(mediaClipPath, uploadData.presignedUrls[0]);
      response.assertOk();
      return true;
    }

    if (!uploadData.key || !uploadData.uploadId) {
      throw new Error("uploadData for multi-part uploads must contain 'key' and 'uploadId' keys.");
    }

    const responses = await this.performMultiPartUpload(mediaClipPath, uploadData.presignedUrls);
    try {
      SapiResponse.assertAllOk(responses);
    } catch (e) {
      const abortResponse = await this.abortUpload(uploadData.key, uploadData.uploadId);
      abortResponse.assertOk();
      throw e as HTTPRequestException;
    }

    const parts: Array<{ ETag: string; PartNumber: string }> = [];
    for (const response of responses) {
      const etag = response.header('ETag');
      const partNumber = response.queryParam('partNumber');
      parts.push({
        ETag: etag ? etag.replace(/"/g, '') : '',
        PartNumber: partNumber ?? '',
      });
    }

    const completeResponse = await this.completeUpload(uploadData.key, uploadData.uploadId, parts);
    completeResponse.assertOk();
    return true;
  }

  private async performMultiPartUpload(
    mediaClipPath: string,
    presignedUrls: UploadData['presignedUrls'],
  ): Promise<SapiResponse[]> {
    return Promise.all(presignedUrls.map((url) => this.performUpload(mediaClipPath, url)));
  }

  private async performUpload(
    mediaClipPath: string,
    presignedUrl: UploadData['presignedUrls'][0],
  ): Promise<SapiResponse> {
    const fileStat = await stat(mediaClipPath);
    const chunkSize = presignedUrl.chunkSize ?? fileStat.size;
    const offset = presignedUrl.offset ?? 0;

    const nodeStream = createReadStream(mediaClipPath, {
      start: offset,
      end: offset + chunkSize - 1,
    });
    const body = Readable.toWeb(nodeStream) as ReadableStream;

    return this.sdk.sendRequest('PUT', presignedUrl.presignedUrl, { body });
  }

  /**
   * Polls S3 to determine upload progress as a percentage (0-100).
   * @param listPartsUrl - S3 URL to list uploaded parts.
   * @param headObjectUrl - S3 URL to check if the object exists (upload complete).
   * @param partsCount - Total number of expected parts.
   * @param requestDelay - Delay in ms before making the request.
   */
  async getUploadProgress(
    listPartsUrl: string,
    headObjectUrl: string,
    partsCount: number,
    requestDelay: number = 0,
  ): Promise<number> {
    if (requestDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, requestDelay));
    }

    const response = await this.sdk.sendRequest('GET', listPartsUrl);

    if (response.statusCode === 404) {
      const headResponse = await this.sdk.sendRequest('HEAD', headObjectUrl);
      return headResponse.statusCode === 404 ? 0 : 100;
    } else if (response.statusCode === 200) {
      const contents = response.json<{ Part?: unknown }>();
      const parts = contents?.Part;
      let uploadedPartsCount: number;
      if (Array.isArray(parts)) {
        uploadedPartsCount = parts.length;
      } else if (parts != null && typeof parts === 'object') {
        // S3 returns a single object instead of a 1-element array for one part
        uploadedPartsCount = 1;
      } else {
        uploadedPartsCount = 0;
      }
      return (uploadedPartsCount / partsCount) * 100;
    } else {
      response.assertOk();
      return 0; // unreachable, assertOk throws
    }
  }

  /**
   * Async generator that yields upload progress percentages until complete.
   * @param listPartsUrl - S3 URL to list uploaded parts.
   * @param headObjectUrl - S3 URL to check if the object exists.
   * @param partsCount - Total number of expected parts.
   * @param pollInterval - Minimum interval (ms) between polls.
   * @param maxIterations - Maximum number of polls (0 = unlimited).
   */
  async *uploadProgressGenerator(
    listPartsUrl: string,
    headObjectUrl: string,
    partsCount: number,
    pollInterval: number = DEFAULT_UPLOAD_PROGRESS_POLL_INTERVAL,
    maxIterations: number = 0,
  ): AsyncGenerator<number> {
    let uploadProgress = 0;
    let timePrevStart = 0;
    let iterations = 0;

    while (uploadProgress !== 100) {
      if (maxIterations > 0 && iterations >= maxIterations) {
        throw new Error(`Upload progress polling exceeded the maximum of ${maxIterations} iterations.`);
      }

      const timeStart = Date.now();
      const delayTime = Math.max(0, pollInterval - (timeStart - timePrevStart));

      uploadProgress = await this.getUploadProgress(listPartsUrl, headObjectUrl, partsCount, delayTime);
      yield uploadProgress;
      timePrevStart = timeStart;
      iterations++;
    }
  }

  /**
   * Retrieves the source video path for a media clip.
   * @param mediaClipId - The media clip ID.
   * @param absolute - If `true`, returns an absolute URL using the publication's default media asset path.
   */
  async getSourcePath(mediaClipId: number | string, absolute: boolean = true): Promise<string> {
    const response = await this.get(mediaClipId);
    response.assertOk();
    const data = response.json<Record<string, unknown>>();
    if (!data || !('src' in data)) {
      throw new Error("MediaClip response does not contain a 'src' field.");
    }
    const src = data.src as string;
    return absolute ? this.getAbsoluteVideoPath(src) : src;
  }

  /**
   * Converts a relative video path to an absolute URL using publication data.
   * @param relativeVideoPath - The relative path (with or without leading slash).
   */
  async getAbsoluteVideoPath(relativeVideoPath: string): Promise<string> {
    const publicationData = await this.sdk.getPublicationData();
    const dmap = (publicationData as Record<string, string>).defaultMediaAssetPath;
    if (!dmap) {
      throw new Error("Publication data missing 'defaultMediaAssetPath'.");
    }
    return `${dmap}/${relativeVideoPath.replace(/^\//, '')}`;
  }
}
