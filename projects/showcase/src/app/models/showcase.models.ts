import { StorageErrorCode } from '@andresdgm/storage-manager';

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

/**
 * Respuesta parcial del endpoint `/api/1.0/deals` de CheapShark.
 */
export interface CheapSharkDealDto {
  gameID: string;
  title: string;
  salePrice: string;
  normalPrice: string;
  savings: string;
  metacriticScore: string;
  steamAppID: string | null;
  thumb: string;
}

/**
 * Respuesta parcial del endpoint `/api/1.0/games` de CheapShark.
 */
export interface CheapSharkGameDto {
  gameID: string;
  steamAppID: string | null;
  cheapest: string;
  external: string;
  thumb: string;
}

/**
 * Modelo unificado de juego mostrado en las tarjetas del catálogo CheapShark.
 */
export interface CheapSharkGameCard {
  gameID: string;
  title: string;
  price: string;
  normalPrice?: string;
  savingsPercent?: number;
  metacriticScore?: string;
  thumb: string;
  cachedImageUrl?: string;
}
