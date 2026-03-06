export enum HTTPStatusCodeCategory {
  Informational = 'Informational',
  Successful = 'Successful',
  Redirection = 'Redirection',
  ClientError = 'ClientError',
  ServerError = 'ServerError',
}

export function getStatusCodeCategory(statusCode: number): HTTPStatusCodeCategory {
  if (statusCode >= 100 && statusCode <= 199) return HTTPStatusCodeCategory.Informational;
  if (statusCode >= 200 && statusCode <= 299) return HTTPStatusCodeCategory.Successful;
  if (statusCode >= 300 && statusCode <= 399) return HTTPStatusCodeCategory.Redirection;
  if (statusCode >= 400 && statusCode <= 499) return HTTPStatusCodeCategory.ClientError;
  if (statusCode >= 500 && statusCode <= 599) return HTTPStatusCodeCategory.ServerError;
  throw new RangeError(`Unexpected HTTP status code: ${statusCode}`);
}
