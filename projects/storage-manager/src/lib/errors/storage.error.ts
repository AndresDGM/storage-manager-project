import { StorageErrorCode } from '../models/storage-error-type.model';

/**
 * Excepción personalizada para representar errores controlados en las operaciones de almacenamiento.
 *
 * @description
 * Extiende la clase nativa `Error` agregando metadatos diagnósticos como el código de error
 * tipado (`StorageErrorCode`), la clave afectada y la causa original de la excepción.
 */
export class StorageError extends Error {
  /**
   * Código tipado que identifica la categoría del error de almacenamiento.
   */
  public readonly code: StorageErrorCode;

  /**
   * Clave de almacenamiento involucrada en la operación que produjo el error.
   */
  public readonly key?: string;

  /**
   * Error original capturado desde la API nativa del navegador o del motor de serialización.
   */
  public readonly originalError?: unknown;

  /**
   * Crea una nueva instancia de `StorageError`.
   *
   * @param message Descripción detallada en español sobre la causa del error.
   * @param code Código categorizado del error según `StorageErrorCode`.
   * @param key Clave opcional asociada a la operación fallida.
   * @param originalError Excepción original opcional capturada internamente.
   */
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
