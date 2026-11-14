/**
 * Contrato base que define las operaciones estándar para la gestión de almacenamiento clave-valor.
 *
 * @description
 * Establece una interfaz común, tipada y consistente para los servicios de almacenamiento
 * de la librería `storage-manager`.
 */
export interface IStorageService {
  /**
   * Almacena un valor asociado a una clave específica serializándolo en formato JSON.
   *
   * @template T Tipo del valor a almacenar.
   * @param key Clave única bajo la cual se almacenará el valor.
   * @param value Valor primitivo u objeto a almacenar.
   */
  setItem<T = unknown>(key: string, value: T): void;

  /**
   * Recupera y deserializa un valor almacenado previamente bajo la clave indicada.
   *
   * @template T Tipo esperado del valor recuperado.
   * @param key Clave del elemento que se desea consultar.
   * @returns El valor deserializado de tipo `T`, o `null` si no existe o el JSON es inválido.
   */
  getItem<T>(key: string): T | null;

  /**
   * Actualiza de forma controlada el valor de una clave previamente existente.
   *
   * @template T Tipo del nuevo valor a almacenar.
   * @param key Clave existente cuyo valor será reemplazado.
   * @param value Nuevo valor a guardar.
   */
  updateItem<T>(key: string, value: T): void;

  /**
   * Elimina el elemento asociado a la clave especificada del almacenamiento.
   *
   * @param key Clave del elemento a eliminar.
   */
  removeItem(key: string): void;

  /**
   * Elimina todos los elementos almacenados actualmente.
   */
  clear(): void;

  /**
   * Verifica si existe un elemento registrado bajo la clave proporcionada.
   *
   * @param key Clave cuya existencia se desea comprobar.
   * @returns `true` si la clave existe en el almacenamiento; `false` en caso contrario.
   */
  hasKey(key: string): boolean;

  /**
   * Obtiene el listado completo de todas las claves almacenadas actualmente.
   *
   * @returns Arreglo de cadenas con los nombres de todas las claves presentes.
   */
  keys(): string[];
}

/**
 * Representa el resultado estructurado de una operación sobre el almacenamiento.
 *
 * @template T Tipo de dato contenido en la respuesta de la operación.
 */
export interface StorageOperationResult<T = unknown> {
  /**
   * Indica si la operación se ejecutó exitosamente.
   */
  success: boolean;

  /**
   * Clave involucrada en la operación, si aplica.
   */
  key?: string;

  /**
   * Datos obtenidos o procesados durante la operación.
   */
  data?: T | null;

  /**
   * Mensaje descriptivo del error en caso de fallo.
   */
  error?: string;

  /**
   * Marca de tiempo (en milisegundos UNIX) en la que se completó la operación.
   */
  timestamp: number;
}
