import { StorageError, StorageErrorCode } from 'storage-manager';
import { OperationLogEntry } from '../models/showcase.models';

let logSequence = 0;

/**
 * Construye una entrada de bitácora para operaciones exitosas o errores controlados.
 */
export function createLogEntry(
  operation: string,
  status: 'ok' | 'error',
  message: string,
  errorCode?: StorageErrorCode,
  payload?: string,
): OperationLogEntry {
  logSequence += 1;
  return {
    id: logSequence,
    timestamp: new Date().toLocaleTimeString('es-CO', { hour12: false }),
    operation,
    status,
    message,
    errorCode,
    payload,
  };
}

/**
 * Extrae el mensaje y el código `StorageErrorCode` desde una excepción capturada.
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  code?: StorageErrorCode;
} {
  if (error instanceof StorageError) {
    return { message: error.message, code: error.code };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error) };
}

/**
 * Formatea un valor arbitrario para mostrarlo en el inspector del Showcase.
 */
export function formatDisplayValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
