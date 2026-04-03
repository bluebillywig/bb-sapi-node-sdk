import { describe, it, expect } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Sdk } from '../../src/sdk.js';
import { EmptyAuthenticator } from '../../src/authentication/empty-authenticator.js';
import { HTTPServerErrorException } from '../../src/exceptions/http-server-error-exception.js';
import { createMockFetch, type MockResponse } from '../helpers/mock-fetch.js';

function makeTempFile(): { path: string; cleanup: () => Promise<void> } {
  const path = join(tmpdir(), `bb-sdk-test-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  return {
    path,
    cleanup: async () => {
      await unlink(path).catch(() => {});
    },
  };
}

describe('MediaClip', () => {
  it('should list mediaclips with correct params', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const limit = 15;
    const offset = 1;
    const sort = 'createddate asc';

    await sdk.mediaclip.list(limit, offset, sort);

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('limit')).toBe('15');
    expect(url.searchParams.get('offset')).toBe('1');
    expect(url.searchParams.get('sort')).toBe('createddate asc');
    expect(url.pathname).toBe('/sapi/mediaclip');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should delete a mediaclip', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.delete(1);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/mediaclip/1');
    expect(calls[0].init?.method).toBe('DELETE');
  });

  it('should delete a mediaclip with purge', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.delete(1, true);

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('purge')).toBe('true');
    expect(url.pathname).toBe('/sapi/mediaclip/1');
    expect(calls[0].init?.method).toBe('DELETE');
  });

  it('should throw for non-existing file on initializeUpload', async () => {
    const { fetch } = createMockFetch([]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const mediaClipPath = './path/to/a/non/existing/mediaclip/file';

    await expect(sdk.mediaclip.initializeUpload(mediaClipPath)).rejects.toThrow(
      `File ${mediaClipPath} is not a file or does not exist.`,
    );
  });

  it('should initialize upload with correct params', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    // Use the package.json as a test file (it exists and is a file)
    const mediaClipPath = new URL('../../package.json', import.meta.url).pathname;

    await sdk.mediaclip.initializeUpload(mediaClipPath);

    const url = new URL(calls[0].url);
    expect(url.pathname).toBe('/sapi/mediaclip/0/upload');
    expect(url.searchParams.get('filename')).toBe('package.json');
    expect(url.searchParams.get('filesize')).toBeTruthy();
    expect(url.searchParams.get('contenttype')).toBeTruthy();
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should initialize upload with mediaclip ID', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const mediaClipPath = new URL('../../package.json', import.meta.url).pathname;

    await sdk.mediaclip.initializeUpload(mediaClipPath, 1);

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('clipid')).toBe('1');
  });

  it('should abort upload', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.abortUpload('/prefix/my-video.mp4', '12345');

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('s3filekey')).toBe('/prefix/my-video.mp4');
    expect(url.searchParams.get('s3uploadid')).toBe('12345');
    expect(url.pathname).toBe('/sapi/mediaclip/0/abortUpload');
    expect(calls[0].init?.method).toBe('PUT');
  });

  it('should complete upload', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const s3Parts = [
      { ETag: '12345', PartNumber: '1' },
      { ETag: '12346', PartNumber: '2' },
      { ETag: '12347', PartNumber: '3' },
    ];

    await sdk.mediaclip.completeUpload('/prefix/my-video.mp4', '12345', s3Parts);

    expect(calls[0].url).toBe('https://my-publication.bbvms.com/sapi/mediaclip/0/completeUpload');
    expect(calls[0].init?.method).toBe('PUT');

    const body = JSON.parse(calls[0].init?.body as string);
    expect(body).toEqual({
      s3FileKey: '/prefix/my-video.mp4',
      s3UploadId: '12345',
      s3Parts,
    });
  });

  it('should get a mediaclip', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.get(1);

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('includejobs')).toBe('true');
    expect(url.pathname).toBe('/sapi/mediaclip/1');
    expect(calls[0].init?.method).toBe('GET');
  });

  it('should get a mediaclip with lang and no jobs', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    await sdk.mediaclip.get(1, 'en', false);

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('includejobs')).toBe('false');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.pathname).toBe('/sapi/mediaclip/1');
  });

  it('should create a mediaclip', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { title: 'My Mediaclip' };

    await sdk.mediaclip.create(props);

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('softsave')).toBe('false');
    expect(url.pathname).toBe('/sapi/mediaclip');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should create a mediaclip with lang and softsave', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { title: 'My Mediaclip' };

    await sdk.mediaclip.create(props, true, 'en');

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('softsave')).toBe('true');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should update a mediaclip', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { title: 'My Mediaclip' };

    await sdk.mediaclip.update(1, props);

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('softsave')).toBe('false');
    expect(url.pathname).toBe('/sapi/mediaclip/1');
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  it('should update a mediaclip with lang and softsave', async () => {
    const { fetch, calls } = createMockFetch([{ status: 200 }]);
    const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

    const props = { title: 'My Mediaclip' };

    await sdk.mediaclip.update(1, props, true, 'en');

    const url = new URL(calls[0].url);
    expect(url.searchParams.get('softsave')).toBe('true');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(JSON.parse(calls[0].init?.body as string)).toEqual(props);
  });

  describe('executeUpload', () => {
    it('should execute single-chunk upload', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(10, 0x41));

      try {
        const result = await sdk.mediaclip.executeUpload(tmp.path, {
          chunks: 1,
          presignedUrls: [
            {
              presignedUrl: 'https://s3.example.com/presigned-url',
              chunkSize: 10,
            },
          ],
        });

        expect(result).toBe(true);
        expect(calls).toHaveLength(1);
        expect(calls[0].init?.method).toBe('PUT');
        expect(calls[0].url).toBe('https://s3.example.com/presigned-url');
      } finally {
        await tmp.cleanup();
      }
    });

    it('should default chunkSize to file size when not specified', async () => {
      const { fetch, calls } = createMockFetch([{ status: 200 }]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(10, 0x41));

      try {
        const result = await sdk.mediaclip.executeUpload(tmp.path, {
          chunks: 1,
          presignedUrls: [
            {
              presignedUrl: 'https://s3.example.com/presigned-url',
            },
          ],
        });

        expect(result).toBe(true);
        expect(calls).toHaveLength(1);
      } finally {
        await tmp.cleanup();
      }
    });

    it('should execute multi-chunk upload', async () => {
      const { fetch, calls } = createMockFetch([
        { status: 200, headers: { ETag: '"some-etag-1"' } },
        { status: 200, headers: { ETag: '"some-etag-2"' } },
        { status: 200, headers: { ETag: '"some-etag-3"' } },
        { status: 200 }, // completeUpload
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(30, 0x42));

      try {
        const result = await sdk.mediaclip.executeUpload(tmp.path, {
          key: '/prefix/blank.mp4',
          uploadId: '12345',
          chunks: 3,
          presignedUrls: [
            {
              presignedUrl: 'https://s3.example.com/presigned-url/1?partNumber=1',
              chunkSize: 10,
              offset: 0,
            },
            {
              presignedUrl: 'https://s3.example.com/presigned-url/2?partNumber=2',
              chunkSize: 10,
              offset: 10,
            },
            {
              presignedUrl: 'https://s3.example.com/presigned-url/3?partNumber=3',
              chunkSize: 10,
              offset: 20,
            },
          ],
        });

        expect(result).toBe(true);
        expect(calls).toHaveLength(4);

        // Verify chunk uploads
        for (let i = 0; i < 3; i++) {
          expect(calls[i].init?.method).toBe('PUT');
        }

        // Verify complete call
        const completeCall = calls[3];
        expect(completeCall.init?.method).toBe('PUT');
        const completeUrl = new URL(completeCall.url);
        expect(completeUrl.pathname).toBe('/sapi/mediaclip/0/completeUpload');
        const completeBody = JSON.parse(completeCall.init?.body as string);
        expect(completeBody.s3FileKey).toBe('/prefix/blank.mp4');
        expect(completeBody.s3UploadId).toBe('12345');
        expect(completeBody.s3Parts).toHaveLength(3);
        // Parts are collected from parallel responses; verify each PartNumber has an ETag
        const partNumbers = completeBody.s3Parts.map((p: { PartNumber: string }) => p.PartNumber).sort();
        expect(partNumbers).toEqual(['1', '2', '3']);
        for (const part of completeBody.s3Parts) {
          expect(part.ETag).toMatch(/^some-etag-\d$/);
        }
      } finally {
        await tmp.cleanup();
      }
    });

    it('should handle missing ETag and partNumber in multi-chunk upload', async () => {
      // Both chunk responses are identical to avoid FIFO mock queue race
      // when Promise.all uploads chunks concurrently
      const { fetch, calls } = createMockFetch([
        { status: 200 },
        { status: 200 },
        { status: 200 }, // completeUpload
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(20, 0x44));

      try {
        const result = await sdk.mediaclip.executeUpload(tmp.path, {
          key: '/prefix/blank.mp4',
          uploadId: '12345',
          chunks: 2,
          presignedUrls: [
            {
              presignedUrl: 'https://s3.example.com/presigned-url/1',
              chunkSize: 10,
              offset: 0,
            },
            {
              presignedUrl: 'https://s3.example.com/presigned-url/2?partNumber=2',
              chunkSize: 10,
              offset: 10,
            },
          ],
        });

        expect(result).toBe(true);
        const completeBody = JSON.parse(calls[2].init?.body as string);
        // Both parts have no ETag (responses had no ETag header)
        expect(completeBody.s3Parts[0].ETag).toBe('');
        expect(completeBody.s3Parts[1].ETag).toBe('');
        // partNumber comes from the presigned URL query string, not the response
        // so ordering is preserved via Promise.all index mapping
        const partNumbers = completeBody.s3Parts.map((p: { PartNumber: string }) => p.PartNumber);
        expect(partNumbers).toContain('');  // first URL has no partNumber
        expect(partNumbers).toContain('2'); // second URL has partNumber=2
      } finally {
        await tmp.cleanup();
      }
    });

    it('should abort upload on chunk failure', async () => {
      const { fetch, calls } = createMockFetch([
        { status: 200, headers: { ETag: '"some-etag-1"' } },
        { status: 200, headers: { ETag: '"some-etag-2"' } },
        { status: 500, statusText: 'Internal Server Error' },
        { status: 200 }, // abortUpload
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(30, 0x43));

      try {
        await expect(
          sdk.mediaclip.executeUpload(tmp.path, {
            key: '/prefix/blank.mp4',
            uploadId: '12345',
            chunks: 3,
            presignedUrls: [
              {
                presignedUrl: 'https://s3.example.com/presigned-url/1?partNumber=1',
                chunkSize: 10,
                offset: 0,
              },
              {
                presignedUrl: 'https://s3.example.com/presigned-url/2?partNumber=2',
                chunkSize: 10,
                offset: 10,
              },
              {
                presignedUrl: 'https://s3.example.com/presigned-url/3?partNumber=3',
                chunkSize: 10,
                offset: 20,
              },
            ],
          }),
        ).rejects.toThrow(HTTPServerErrorException);

        expect(calls).toHaveLength(4);
        // Last call should be abort
        const abortCall = calls[3];
        expect(abortCall.init?.method).toBe('PUT');
        const abortUrl = new URL(abortCall.url);
        expect(abortUrl.pathname).toBe('/sapi/mediaclip/0/abortUpload');
        expect(abortUrl.searchParams.get('s3filekey')).toBe('/prefix/blank.mp4');
        expect(abortUrl.searchParams.get('s3uploadid')).toBe('12345');
      } finally {
        await tmp.cleanup();
      }
    });

    it('should still throw original error when abort also fails', async () => {
      const { fetch } = createMockFetch([
        { status: 200, headers: { ETag: '"some-etag-1"' } },
        { status: 200, headers: { ETag: '"some-etag-2"' } },
        { status: 500, statusText: 'Internal Server Error' }, // chunk 3 fails
        { status: 500, statusText: 'Internal Server Error' }, // abort also fails
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(30, 0x43));

      try {
        await expect(
          sdk.mediaclip.executeUpload(tmp.path, {
            key: '/prefix/blank.mp4',
            uploadId: '12345',
            chunks: 3,
            presignedUrls: [
              {
                presignedUrl: 'https://s3.example.com/presigned-url/1?partNumber=1',
                chunkSize: 10,
                offset: 0,
              },
              {
                presignedUrl: 'https://s3.example.com/presigned-url/2?partNumber=2',
                chunkSize: 10,
                offset: 10,
              },
              {
                presignedUrl: 'https://s3.example.com/presigned-url/3?partNumber=3',
                chunkSize: 10,
                offset: 20,
              },
            ],
          }),
        ).rejects.toThrow(HTTPServerErrorException);
      } finally {
        await tmp.cleanup();
      }
    });

    it('should throw for invalid file path', async () => {
      const { fetch } = createMockFetch([]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      await expect(
        sdk.mediaclip.executeUpload('./nonexistent', {
          chunks: 1,
          presignedUrls: [{ presignedUrl: 'https://s3.example.com/url' }],
        }),
      ).rejects.toThrow('is not a file or does not exist');
    });

    it('should throw for missing chunks/presignedUrls in uploadData', async () => {
      const { fetch } = createMockFetch([]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(10, 0x41));

      try {
        await expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sdk.mediaclip.executeUpload(tmp.path, {} as any),
        ).rejects.toThrow("uploadData must contain 'chunks' and 'presignedUrls' keys.");
      } finally {
        await tmp.cleanup();
      }
    });

    it('should throw for multi-part upload missing key/uploadId', async () => {
      const { fetch } = createMockFetch([]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const tmp = makeTempFile();
      await writeFile(tmp.path, Buffer.alloc(10, 0x41));

      try {
        await expect(
          sdk.mediaclip.executeUpload(tmp.path, {
            chunks: 3,
            presignedUrls: [
              { presignedUrl: 'https://s3.example.com/url/1' },
              { presignedUrl: 'https://s3.example.com/url/2' },
              { presignedUrl: 'https://s3.example.com/url/3' },
            ],
          }),
        ).rejects.toThrow("uploadData for multi-part uploads must contain 'key' and 'uploadId' keys.");
      } finally {
        await tmp.cleanup();
      }
    });
  });

  describe('getUploadProgress', () => {
    it('should return 0 when upload not started', async () => {
      const { fetch } = createMockFetch([
        { status: 404 },
        { status: 404 },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const progress = await sdk.mediaclip.getUploadProgress(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
      );

      expect(progress).toBe(0);
    });

    it('should return 100 when upload completed', async () => {
      const { fetch } = createMockFetch([
        { status: 404 },
        { status: 200 },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const progress = await sdk.mediaclip.getUploadProgress(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
      );

      expect(progress).toBe(100);
    });

    it('should return percentage for single part finished', async () => {
      const { fetch } = createMockFetch([
        {
          status: 200,
          body: JSON.stringify({ Part: { PartNumber: 1 } }),
        },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const progress = await sdk.mediaclip.getUploadProgress(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
      );

      expect(progress).toBe(20);
    });

    it('should return percentage for multiple parts finished', async () => {
      const { fetch } = createMockFetch([
        {
          status: 200,
          body: JSON.stringify({ Part: [{}, {}, {}] }),
        },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const progress = await sdk.mediaclip.getUploadProgress(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
      );

      expect(progress).toBe(60);
    });

    it('should return 100 for all parts finished', async () => {
      const { fetch } = createMockFetch([
        {
          status: 200,
          body: JSON.stringify({ Part: [{}, {}, {}, {}, {}] }),
        },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const progress = await sdk.mediaclip.getUploadProgress(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
      );

      expect(progress).toBe(100);
    });
  });

  describe('uploadProgressGenerator', () => {
    it('should yield progress until 100', async () => {
      const responses: MockResponse[] = [
        { status: 404 },
        { status: 404 },
        { status: 200, body: JSON.stringify({ Part: [{}] }) },
        { status: 200, body: JSON.stringify({ Part: [{}, {}] }) },
        { status: 200, body: JSON.stringify({ Part: [{}, {}, {}] }) },
        { status: 200, body: JSON.stringify({ Part: [{}, {}, {}, {}] }) },
        { status: 404 },
        { status: 200 },
      ];
      const { fetch } = createMockFetch(responses);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const progress: number[] = [];
      for await (const p of sdk.mediaclip.uploadProgressGenerator(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
        10, // very short poll interval for testing
      )) {
        progress.push(p);
      }

      expect(progress).toEqual([0, 20, 40, 60, 80, 100]);
    });

    it('should throw when max iterations exceeded', async () => {
      const { fetch } = createMockFetch([
        { status: 404 },
        { status: 404 },
        { status: 404 },
        { status: 404 },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const gen = sdk.mediaclip.uploadProgressGenerator(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
        10,
        2,
      );

      const results: number[] = [];
      await expect(async () => {
        for await (const p of gen) {
          results.push(p);
        }
      }).rejects.toThrow('Upload progress polling exceeded the maximum of 2 iterations.');
    });
  });

  describe('getUploadProgress edge cases', () => {
    it('should throw on unexpected status code', async () => {
      const { fetch } = createMockFetch([
        { status: 500, statusText: 'Internal Server Error' },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      await expect(
        sdk.mediaclip.getUploadProgress(
          'https://s3.example.com/list-part',
          'https://s3.example.com/head-object',
          5,
        ),
      ).rejects.toThrow();
    });

    it('should return 0 for no parts in 200 response', async () => {
      const { fetch } = createMockFetch([
        { status: 200, body: JSON.stringify({}) },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const progress = await sdk.mediaclip.getUploadProgress(
        'https://s3.example.com/list-part',
        'https://s3.example.com/head-object',
        5,
      );

      expect(progress).toBe(0);
    });
  });

  describe('getSourcePath', () => {
    it('should throw when response lacks src field', async () => {
      const { fetch } = createMockFetch([
        { status: 200, body: JSON.stringify({ title: 'No src here' }) },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      await expect(sdk.mediaclip.getSourcePath(1)).rejects.toThrow(
        "MediaClip response does not contain a 'src' field.",
      );
    });

    it('should return relative source path', async () => {
      const mediaClip = { src: '/some/source/of/mediaclip.mp4' };
      const { fetch } = createMockFetch([
        { status: 200, body: JSON.stringify(mediaClip) },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const path = await sdk.mediaclip.getSourcePath(1, false);

      expect(path).toBe(mediaClip.src);
    });

    it('should return absolute source path', async () => {
      const mediaClip = { src: '/some/source/of/mediaclip.mp4' };
      const publicationData = {
        defaultMediaAssetPath: 'https://my-cfn.bluebillywig.com',
      };
      const { fetch } = createMockFetch([
        { status: 200, body: JSON.stringify(mediaClip) },
        { status: 200, body: JSON.stringify(publicationData) },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      const path = await sdk.mediaclip.getSourcePath(1, true);

      expect(path).toBe(
        publicationData.defaultMediaAssetPath + '/' + mediaClip.src.replace(/^\//, ''),
      );
    });

    it('should throw when publication data is missing defaultMediaAssetPath', async () => {
      const mediaClip = { src: '/some/source/of/mediaclip.mp4' };
      const { fetch } = createMockFetch([
        { status: 200, body: JSON.stringify(mediaClip) },
        { status: 200, body: JSON.stringify({}) },
      ]);
      const sdk = new Sdk('my-publication', new EmptyAuthenticator(), { fetch });

      await expect(sdk.mediaclip.getSourcePath(1, true)).rejects.toThrow(
        "Publication data missing 'defaultMediaAssetPath'.",
      );
    });
  });
});
