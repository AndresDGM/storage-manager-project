import { StorageErrorCode } from '../models/storage-error-type.model';

export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  public readonly key?: string;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    code: StorageErrorCode,
    key?: string,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.key = key;
    this.originalError = originalError;
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
