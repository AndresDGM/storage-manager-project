/**
 * Contrato asíncrono para la administración de cachés y recursos HTTP mediante
 * la API nativa de Cache Storage.
 */
export interface ICacheStorageService {
  /**
   * Abre una caché existente o la crea si todavía no existe.
   *
   * @param cacheName Nombre único de la caché.
   * @returns Promesa con la instancia de la caché abierta.
   */
  openCache(cacheName: string): Promise<Cache>;

  /**
   * Verifica si una caché existe en Cache Storage.
   *
   * @param cacheName Nombre de la caché que se desea consultar.
   * @returns `true` si existe; en caso contrario, `false`.
   */
  hasCache(cacheName: string): Promise<boolean>;

  /**
   * Obtiene los nombres de todas las cachés disponibles.
   *
   * @returns Promesa con el listado de nombres de caché.
   */
  keys(): Promise<string[]>;

  /**
   * Elimina una caché completa.
   *
   * @param cacheName Nombre de la caché que se desea eliminar.
   * @returns `true` si fue eliminada; `false` si no existía.
   */
  deleteCache(cacheName: string): Promise<boolean>;

  /**
   * Guarda una respuesta asociada a una petición dentro de una caché.
   *
   * @param cacheName Nombre de la caché destino.
   * @param request Petición o URL que identifica el recurso.
   * @param response Respuesta HTTP que se almacenará.
   */
  put(cacheName: string, request: RequestInfo, response: Response): Promise<void>;

  /**
   * Obtiene una petición y la almacena en una caché.
   *
   * @param cacheName Nombre de la caché destino.
   * @param request URL o petición que se descargará y almacenará.
   */
  add(cacheName: string, request: RequestInfo): Promise<void>;

  /**
   * Busca una respuesta dentro de una caché.
   *
   * @param cacheName Nombre de la caché donde se buscará.
   * @param request Petición o URL del recurso.
   * @param options Opciones nativas de consulta de Cache Storage.
   * @returns La respuesta encontrada o `null` si no existe.
   */
  match(
    cacheName: string,
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<Response | null>;

  /**
   * Busca una respuesta y deserializa su cuerpo como JSON tipado.
   *
   * @template T Tipo esperado del JSON recuperado.
   * @param cacheName Nombre de la caché donde se buscará.
   * @param request Petición o URL del recurso.
   * @param options Opciones nativas de consulta de Cache Storage.
   * @returns El JSON deserializado o `null` si no existe.
   */
  matchJson<T>(
    cacheName: string,
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<T | null>;

  /**
   * Lista las peticiones registradas dentro de una caché.
   *
   * @param cacheName Nombre de la caché que se desea inspeccionar.
   * @returns Las peticiones almacenadas o un arreglo vacío si la caché no existe.
   */
  listEntries(cacheName: string): Promise<ReadonlyArray<Request>>;

  /**
   * Elimina un recurso específico de una caché.
   *
   * @param cacheName Nombre de la caché donde se eliminará el recurso.
   * @param request Petición o URL del recurso.
   * @param options Opciones nativas de eliminación de Cache Storage.
   * @returns `true` si el recurso fue eliminado; `false` si no existía.
   */
  deleteResource(
    cacheName: string,
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<boolean>;
}
