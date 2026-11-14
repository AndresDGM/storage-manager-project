/**
 * Códigos estandarizados de error para las operaciones de almacenamiento de la librería.
 *
 * @description
 * Permite categorizar y manejar de forma tipada las excepciones ocurridas durante
 * el acceso, serialización o validación en `LocalStorage`.
 */
export enum StorageErrorCode {
  /**
   * Indica que el almacenamiento nativo (`window.localStorage`) no está disponible
   * (por ejemplo, en entornos SSR o por restricciones de seguridad del navegador).
   */
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',

  /**
   * Indica que se ha superado el límite de cuota de almacenamiento del navegador (`QuotaExceededError`).
   */
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  /**
   * Indica que el contenido almacenado no posee un formato JSON válido para su deserialización.
   */
  INVALID_JSON = 'INVALID_JSON',

  /**
   * Indica que ocurrió un fallo al serializar el dato hacia formato JSON (ej. referencias circulares o `undefined`).
   */
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',

  /**
   * Indica que la clave proporcionada es vacía o inválida.
   */
  INVALID_KEY = 'INVALID_KEY',

  /**
   * Indica que la clave solicitada para una operación de actualización no existe en el almacenamiento.
   */
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',

  /**
   * Representa cualquier otro error inesperado durante la interacción con la API de almacenamiento.
   */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Modelo que representa un par clave-valor tipado dentro del almacenamiento.
 *
 * @template T Tipo del valor almacenado en la entrada.
 */
export interface StorageEntry<T = unknown> {
  /**
   * Clave identificadora única del elemento en el almacenamiento.
   */
  key: string;

  /**
   * Valor tipado asociado a la clave.
   */
  value: T;
}
