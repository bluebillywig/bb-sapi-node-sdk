# Blue Billywig SAPI Node.js SDK

This Node.js SDK provides abstractions to interact with the Blue Billywig Server API.

## Requirements

- Node.js >= 18
- Zero runtime dependencies

## Installation

```bash
npm install @bluebillywig/bb-sapi-node-sdk
```

## Quick Start

```typescript
import { Sdk } from '@bluebillywig/bb-sapi-node-sdk';

const sdk = Sdk.withRPCTokenAuthentication(
  'my-publication',
  1,              // token ID
  'shared-secret' // shared secret
);

// List media clips
const response = await sdk.mediaclip.list();
const data = response.json();
console.log(data);
```

## Authentication

The SDK uses HOTP-based RPC token authentication. You need a **token ID** and **shared secret** from your Blue Billywig publication settings.

```typescript
// Recommended: use the convenience factory
const sdk = Sdk.withRPCTokenAuthentication('my-publication', tokenId, sharedSecret);

// Or provide a custom authenticator
import { Sdk, RPCTokenAuthenticator } from '@bluebillywig/bb-sapi-node-sdk';

const authenticator = new RPCTokenAuthenticator(tokenId, sharedSecret);
const sdk = new Sdk('my-publication', authenticator);
```

**Clock synchronization**: The RPC token is time-based (HOTP). Both client and server clocks must be reasonably synchronized (within the token expiration window, default 120 seconds). Significant clock drift will cause authentication failures.

## Entities

All entities support standard CRUD operations where applicable:

| Entity | List | Get | Create | Update | Delete |
|---|---|---|---|---|---|
| `sdk.mediaclip` | Yes | Yes | Yes | Yes | Yes |
| `sdk.playlist` | Yes | Yes | Yes | Yes | Yes |
| `sdk.channel` | Yes | Yes | Yes | Yes | Yes |
| `sdk.playout` | Yes | Yes | Yes | Yes | Yes |
| `sdk.subtitle` | Yes | Yes | Yes | Yes | Yes |
| `sdk.thumbnail` | - | - | - | - | - |

### Media Clips

```typescript
// List
const response = await sdk.mediaclip.list(15, 0, 'createddate desc');

// Get (with optional language and job inclusion)
const response = await sdk.mediaclip.get(123);
const response = await sdk.mediaclip.get(123, 'en', false);

// Create
const response = await sdk.mediaclip.create({ title: 'My Video' });

// Update
const response = await sdk.mediaclip.update(123, { title: 'Updated Title' });

// Delete (with optional purge)
const response = await sdk.mediaclip.delete(123);
const response = await sdk.mediaclip.delete(123, true); // purge
```

### Playlists, Channels, Playouts, Subtitles

```typescript
// All follow the same pattern
const response = await sdk.playlist.list();
const response = await sdk.playlist.get(1);
const response = await sdk.playlist.create({ title: 'My Playlist' });
const response = await sdk.playlist.update(1, { title: 'Updated' });
const response = await sdk.playlist.delete(1);
```

## File Uploads

The SDK supports single-chunk and multi-part streaming uploads to S3 via presigned URLs.

```typescript
// 1. Initialize the upload
const initResponse = await sdk.mediaclip.initializeUpload('/path/to/video.mp4');
initResponse.assertOk();
const uploadData = initResponse.json();

// 2. Execute the upload (streams file data, no full-file buffering)
const success = await sdk.mediaclip.executeUpload('/path/to/video.mp4', uploadData);

// 3. (Optional) Track upload progress
for await (const progress of sdk.mediaclip.uploadProgressGenerator(
  uploadData.listPartsUrl,
  uploadData.headObjectUrl,
  uploadData.chunks,
)) {
  console.log(`Upload progress: ${progress}%`);
}
```

## Thumbnails

```typescript
// Generate an absolute thumbnail URL with dimensions
const url = sdk.thumbnail.getAbsoluteImagePath('/path/to/image.jpg', 640, 360);
// => https://my-publication.bbvms.com/image/640/360/path/to/image.jpg
```

## Response Handling

All entity methods return a `SapiResponse` object:

```typescript
const response = await sdk.mediaclip.get(123);

// Check status
if (response.ok) {
  const data = response.json();
}

// Or assert (throws on non-2xx)
response.assertOk();
const data = response.json();

// Access response details
response.statusCode;           // e.g. 200
response.body;                 // raw body string
response.header('Content-Type');
response.queryParam('limit');  // query param from the request URL
response.statusCategory;       // HTTPStatusCodeCategory enum

// Batch response utilities
SapiResponse.allOk(responses);         // true if all 2xx
SapiResponse.assertAllOk(responses);   // throws on first non-2xx
SapiResponse.failedResponses(responses); // generator yielding non-2xx responses
```

## Error Handling

The SDK throws typed exceptions for HTTP errors:

```typescript
import {
  HTTPRequestException,
  HTTPClientErrorException,
  HTTPServerErrorException,
} from '@bluebillywig/bb-sapi-node-sdk';

try {
  const response = await sdk.mediaclip.get(999);
  response.assertOk();
} catch (error) {
  if (error instanceof HTTPClientErrorException) {
    // 4xx error
    console.error(`Client error ${error.statusCode}: ${error.message}`);
    console.error('Response body:', error.responseBody);
  } else if (error instanceof HTTPServerErrorException) {
    // 5xx error
    console.error(`Server error ${error.statusCode}: ${error.message}`);
  }
}
```

## Configuration

```typescript
const sdk = Sdk.withRPCTokenAuthentication('my-publication', tokenId, sharedSecret, {
  // Override the base URI (useful for testing or custom deployments)
  baseUri: 'https://custom-host.example.com',

  // Inject a custom fetch implementation (useful for testing)
  fetch: customFetchFn,
});
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Run tests
npm test

# Build
npm run build
```
