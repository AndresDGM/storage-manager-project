import { Injectable } from '@angular/core';
import { StorageError } from '../errors/storage.error';
import { ICacheStorageService } from '../interfaces/cache-storage-service.interface';
import { StorageErrorCode } from '../models/storage-error-type.model';

/**
 * Servicio Angular para administrar cachés y recursos HTTP mediante Cache Storage.
 *
 * @description
 * Proporciona una fachada tipada sobre `window.caches`, con operaciones para crear,
 * consultar, listar y eliminar cachés, además de guardar y recuperar respuestas HTTP.
 * Todas las operaciones son asíncronas y convierten los errores de la API nativa en
 * instancias de `StorageError`.
 */
@Injectable({
  providedIn: 'root',
})
export class CacheStorageService implements ICacheStorageService {
  /**
   * Abre una caché existente o la crea si todavía no existe.
   *
   * @param cacheName Nombre no vacío de la caché.
   * @returns Promesa con la caché abierta.
   * @throws {StorageError} Si el nombre es inválido, Cache Storage no está disponible
   * o la API nativa rechaza la operación.
   */
  public async openCache(cacheName: string): Promise<Cache> {
    this.validateCacheName(cacheName);
    const cacheStorage = this.getCacheStorage();

    try {
      return await cacheStorage.open(cacheName);
    } catch (error: unknown) {
      throw this.operationError(
        `No se pudo abrir o crear la caché "${cacheName}".`,
        cacheName,
        error,
      );
    }
  }

  /**
   * Verifica si existe una caché.
   *
   * @param cacheName Nombre de la caché que se desea consultar.
   * @returns `true` si existe; en caso contrario, `false`.
   * @throws {StorageError} Si el nombre es inválido, Cache Storage no está disponible
   * o la API nativa rechaza la consulta.
   */
  public async hasCache(cacheName: string): Promise<boolean> {
    this.validateCacheName(cacheName);
    const cacheStorage = this.getCacheStorage();

    try {
      return await cacheStorage.has(cacheName);
    } catch (error: unknown) {
      throw this.operationError(
        `No se pudo verificar la existencia de la caché "${cacheName}".`,
        cacheName,
        error,
      );
    }
  }

  /**
   * Lista todas las cachés disponibles.
   *
   * @returns Promesa con los nombres de las cachés.
   * @throws {StorageError} Si Cache Storage no está disponible o la consulta falla.
   */
  public async keys(): Promise<string[]> {
    const cacheStorage = this.getCacheStorage();

    try {
      return await cacheStorage.keys();
    } catch (error: unknown) {
      throw this.operationError('No se pudieron listar las cachés disponibles.', undefined, error);
    }
  }

  /**
   * Elimina una caché completa.
   *
   * @param cacheName Nombre de la caché que se desea eliminar.
   * @returns `true` si fue eliminada; `false` si no existía.
   * @throws {StorageError} Si el nombre es inválido, Cache Storage no está disponible
   * o la API nativa rechaza la operación.
   */
  public async deleteCache(cacheName: string): Promise<boolean> {
    this.validateCacheName(cacheName);
    const cacheStorage = this.getCacheStorage();

    try {
      return await cacheStorage.delete(cacheName);
    } catch (error: unknown) {
      throw this.operationError(`No se pudo eliminar la caché "${cacheName}".`, cacheName, error);
    }
  }

  /**
   * Guarda una respuesta asociada a una petición dentro de una caché.
   *
   * La respuesta se clona antes de almacenarse para que el cuerpo de la respuesta
   * recibida por el consumidor no quede consumido por Cache Storage.
   *
   * @param cacheName Nombre de la caché destino.
   * @param request Petición o URL que identifica el recurso.
   * @param response Respuesta HTTP que se almacenará.
   * @throws {StorageError} Si la caché no puede abrirse o la operación falla.
   */
  public async put(cacheName: string, request: RequestInfo, response: Response): Promise<void> {
    this.validateCacheName(cacheName);
    const cache = await this.openCache(cacheName);

    try {
      await cache.put(request, response.clone());
    } catch (error: unknown) {
      throw this.operationError(
        `No se pudo guardar el recurso en la caché "${cacheName}".`,
        cacheName,
        error,
      );
    }
  }

  /**
   * Descarga una petición y almacena su respuesta en una caché.
   *
   * @param cacheName Nombre de la caché destino.
   * @param request URL o petición que se descargará.
   * @throws {StorageError} Si la caché no puede abrirse o la red/operación falla.
   */
  public async add(cacheName: string, request: RequestInfo): Promise<void> {
    this.validateCacheName(cacheName);
    const cache = await this.openCache(cacheName);

    try {
      await cache.add(request);
    } catch (error: unknown) {
      throw new StorageError(
        `No se pudo descargar y guardar el recurso en la caché "${cacheName}".`,
        StorageErrorCode.CACHE_NETWORK_ERROR,
        cacheName,
        error,
      );
    }
  }

  /**
   * Busca una respuesta dentro de una caché.
   *
   * @param cacheName Nombre de la caché donde se buscará.
   * @param request Petición o URL del recurso.
   * @param options Opciones nativas de consulta.
   * @returns La respuesta encontrada o `null` si la caché o el recurso no existen.
   * @throws {StorageError} Si Cache Storage no está disponible o la consulta falla.
   */
  public async match(
    cacheName: string,
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<Response | null> {
    this.validateCacheName(cacheName);
    const cacheStorage = this.getCacheStorage();

    try {
      const cache = await this.getExistingCache(cacheStorage, cacheName);
      return cache ? ((await cache.match(request, options)) ?? null) : null;
    } catch (error: unknown) {
      throw this.operationError(
        `No se pudo consultar el recurso en la caché "${cacheName}".`,
        cacheName,
        error,
      );
    }
  }

  /**
   * Busca una respuesta y deserializa su cuerpo como JSON tipado.
   *
   * @template T Tipo esperado del JSON recuperado.
   * @param cacheName Nombre de la caché donde se buscará.
   * @param request Petición o URL del recurso.
   * @param options Opciones nativas de consulta.
   * @returns El JSON deserializado o `null` si no existe.
   * @throws {StorageError} Con código `INVALID_JSON` si el cuerpo no es JSON válido.
   */
  public async matchJson<T>(
    cacheName: string,
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<T | null> {
    const response = await this.match(cacheName, request, options);
    if (!response) {
      return null;
    }

    try {
      return (await response.clone().json()) as T;
    } catch (error: unknown) {
      throw new StorageError(
        `El recurso consultado en la caché "${cacheName}" no contiene JSON válido.`,
        StorageErrorCode.INVALID_JSON,
        cacheName,
        error,
      );
    }
  }

  /**
   * Lista las peticiones registradas dentro de una caché.
   *
   * @param cacheName Nombre de la caché que se desea inspeccionar.
   * @returns Las peticiones almacenadas o un arreglo vacío si la caché no existe.
   * @throws {StorageError} Si Cache Storage no está disponible o la consulta falla.
   */
  public async listEntries(cacheName: string): Promise<ReadonlyArray<Request>> {
    this.validateCacheName(cacheName);
    const cacheStorage = this.getCacheStorage();

    try {
      const cache = await this.getExistingCache(cacheStorage, cacheName);
      return cache ? await cache.keys() : [];
    } catch (error: unknown) {
      throw this.operationError(
        `No se pudieron listar los recursos de la caché "${cacheName}".`,
        cacheName,
        error,
      );
    }
  }

  /**
   * Elimina un recurso específico de una caché.
   *
   * @param cacheName Nombre de la caché donde se eliminará el recurso.
   * @param request Petición o URL del recurso.
   * @param options Opciones nativas de eliminación.
   * @returns `true` si fue eliminado; `false` si la caché o el recurso no existen.
   * @throws {StorageError} Si Cache Storage no está disponible o la operación falla.
   */
  public async deleteResource(
    cacheName: string,
    request: RequestInfo,
    options?: CacheQueryOptions,
  ): Promise<boolean> {
    this.validateCacheName(cacheName);
    const cacheStorage = this.getCacheStorage();

    try {
      const cache = await this.getExistingCache(cacheStorage, cacheName);
      return cache ? await cache.delete(request, options) : false;
    } catch (error: unknown) {
      throw this.operationError(
        `No se pudo eliminar el recurso de la caché "${cacheName}".`,
        cacheName,
        error,
      );
    }
  }

  /**
   * Obtiene la API nativa de Cache Storage de forma segura.
   *
   * @returns La instancia nativa de Cache Storage.
   * @throws {StorageError} Con código `CACHE_UNAVAILABLE` si el entorno no la expone.
   */
  private getCacheStorage(): CacheStorage {
    if (typeof window === 'undefined' || !window.caches) {
      throw new StorageError(
        'Cache Storage no está disponible en el entorno actual.',
        StorageErrorCode.CACHE_UNAVAILABLE,
      );
    }

    return window.caches;
  }

  /**
   * Valida el nombre de una caché.
   *
   * @param cacheName Nombre que se desea validar.
   * @throws {StorageError} Con código `INVALID_KEY` si está vacío o solo contiene espacios.
   */
  private validateCacheName(cacheName: string): void {
    if (typeof cacheName !== 'string' || cacheName.trim().length === 0) {
      throw new StorageError(
        'El nombre de la caché debe ser una cadena de texto no vacía.',
        StorageErrorCode.INVALID_KEY,
        cacheName,
      );
    }
  }

  /**
   * Obtiene una caché únicamente si ya existe, evitando crearla durante una lectura.
   *
   * @param cacheStorage API nativa de Cache Storage.
   * @param cacheName Nombre de la caché que se desea abrir.
   * @returns La caché existente o `null` si no está registrada.
   */
  private async getExistingCache(
    cacheStorage: CacheStorage,
    cacheName: string,
  ): Promise<Cache | null> {
    if (!(await cacheStorage.has(cacheName))) {
      return null;
    }

    return cacheStorage.open(cacheName);
  }

  /**
   * Construye un error uniforme para fallos de la API nativa.
   *
   * @param message Mensaje descriptivo del fallo.
   * @param key Caché asociada a la operación, si aplica.
   * @param originalError Error original capturado.
   * @returns Error tipado de la librería.
   */
  private operationError(
    message: string,
    key: string | undefined,
    originalError: unknown,
  ): StorageError {
    return new StorageError(message, StorageErrorCode.CACHE_OPERATION_ERROR, key, originalError);
  }
}
