export interface IStorageService {
  setItem<T = unknown>(key: string, value: T): void;
  getItem<T>(key: string): T | null;
  updateItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
  hasKey(key: string): boolean;
  keys(): string[];
}

export interface StorageOperationResult<T = unknown> {
  success: boolean;
  key?: string;
  data?: T | null;
  error?: string;
  timestamp: number;
}
