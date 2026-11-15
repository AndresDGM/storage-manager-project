import { StorageErrorCode } from 'storage-manager';

/**
 * Tipos de datos soportados en el editor interactivo de LocalStorage.
 */
export type LocalStorageValueType = 'string' | 'number' | 'boolean' | 'null' | 'json';

/**
 * Representación visual de un registro almacenado en `LocalStorage`.
 */
export interface LocalStorageSnapshotItem {
  key: string;
  value: unknown;
  preview: string;
  detectedType: string;
}

/**
 * Representación visual de un recurso guardado en `Cache Storage`.
 */
export interface CacheEntrySnapshot {
  url: string;
  method: string;
}

/**
 * Registro estructurado de una operación ejecutada desde el Showcase.
 */
export interface OperationLogEntry {
  id: number;
  timestamp: string;
  operation: string;
  status: 'ok' | 'error';
  message: string;
  errorCode?: StorageErrorCode;
  payload?: string;
}
