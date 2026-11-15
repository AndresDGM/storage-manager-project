import { Injectable } from '@angular/core';
import { StorageError } from '../errors/storage.error';
import { IStorageService } from '../interfaces/storage-service.interface';
import { StorageErrorCode } from '../models/storage-error-type.model';

/**
 * Servicio Angular encargado de gestionar de forma segura y tipada el almacenamiento en `LocalStorage`.
 *
 * @description
 * Proporciona una fachada desacoplada sobre la API nativa `window.localStorage` con soporte para:
 * - Serialización y deserialización automática en formato JSON tanto de valores primitivos como de objetos complejos.
 * - Tipado fuerte mediante el uso de genéricos `<T>`.
 * - Compatibilidad con Server-Side Rendering (SSR) verificando la disponibilidad de `window.localStorage`.
 * - Manejo controlado de excepciones para claves inválidas, JSON corrupto y límite de cuota (`QuotaExceededError`).
 *
 * @example
 * ```typescript
 * // Guardar un objeto tipado
 * localStorageService.setItem<Usuario>('perfil', { id: 1, nombre: 'Ana' });
 *
 * // Consultar el objeto con tipado fuerte
 * const perfil = localStorageService.getItem<Usuario>('perfil');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class LocalStorageService implements IStorageService {
  /**
   * Almacena un valor primitivo u objeto bajo la clave especificada en `LocalStorage`.
   *
   * @description
   * Serializa el valor proporcionado mediante `JSON.stringify` antes de guardarlo.
   * Si `window.localStorage` no está disponible (por ejemplo, en SSR), la operación finaliza de forma segura sin efecto.
   *
   * @template T Tipo del valor que se desea almacenar.
   * @param key Clave única no vacía bajo la cual se registrará el valor.
   * @param value Valor primitivo (`string`, `number`, `boolean`, `null`) u objeto a almacenar.
   * @throws {StorageError} Con código `INVALID_KEY` si la clave es vacía o contiene únicamente espacios.
   * @throws {StorageError} Con código `QUOTA_EXCEEDED` si el almacenamiento supera la cuota permitida por el navegador.
   * @throws {StorageError} Con código `SERIALIZATION_ERROR` si el valor es `undefined` o posee referencias circulares.
   */
  public setItem<T = unknown>(key: string, value: T): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    this.validateKey(key);

    if (value === undefined) {
      throw new StorageError(
        `No se puede almacenar un valor undefined para la clave "${key}".`,
        StorageErrorCode.SERIALIZATION_ERROR,
        key
      );
    }

    try {
      const serialized = JSON.stringify(value);
      storage.setItem(key, serialized);
    } catch (error: unknown) {
      if (this.isQuotaExceededError(error)) {
        throw new StorageError(
          `Se ha excedido la cuota máxima de almacenamiento en LocalStorage al guardar la clave "${key}".`,
          StorageErrorCode.QUOTA_EXCEEDED,
          key,
          error
        );
      }

      throw new StorageError(
        `Error al serializar o almacenar el valor para la clave "${key}".`,
        StorageErrorCode.SERIALIZATION_ERROR,
        key,
        error
      );
    }
  }

  /**
   * Obtiene y deserializa un elemento almacenado en `LocalStorage` a partir de su clave.
   *
   * @description
   * Utiliza `JSON.parse` para reconstruir el valor con el tipo genérico `<T>`.
   * Si la clave no existe, el entorno no dispone de `LocalStorage` o el contenido JSON está corrupto,
   * retorna `null` de manera segura sin interrumpir la ejecución de la aplicación.
   *
   * @template T Tipo esperado del valor recuperado.
   * @param key Clave del elemento que se desea consultar.
   * @returns El valor deserializado de tipo `T`, o `null` si no existe o el formato JSON es inválido.
   */
  public getItem<T>(key: string): T | null {
    const storage = this.getStorage();
    if (!storage || !this.isValidKey(key)) {
      return null;
    }

    const rawValue = storage.getItem(key);
    if (rawValue === null) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  /**
   * Actualiza de manera controlada el valor asociado a una clave previamente existente en `LocalStorage`.
   *
   * @description
   * Verifica que la clave sea válida y que exista actualmente en `LocalStorage` antes de sobrescribir su contenido.
   *
   * @template T Tipo del nuevo valor que se almacenará.
   * @param key Clave existente cuyo contenido se desea actualizar.
   * @param value Nuevo valor tipado que reemplazará al valor anterior.
   * @throws {StorageError} Con código `INVALID_KEY` si la clave proporcionada es vacía.
   * @throws {StorageError} Con código `KEY_NOT_FOUND` si la clave no existe previamente en `LocalStorage`.
   * @throws {StorageError} Con código `QUOTA_EXCEEDED` o `SERIALIZATION_ERROR` si falla la escritura del nuevo valor.
   */
  public updateItem<T>(key: string, value: T): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    this.validateKey(key);

    if (!this.hasKey(key)) {
      throw new StorageError(
        `No se puede actualizar la clave "${key}" porque no existe en LocalStorage.`,
        StorageErrorCode.KEY_NOT_FOUND,
        key
      );
    }

    this.setItem(key, value);
  }

  /**
   * Elimina un elemento específico de `LocalStorage` según su clave.
   *
   * @param key Clave no vacía del elemento que se desea eliminar.
   * @throws {StorageError} Con código `INVALID_KEY` si la clave proporcionada es vacía.
   */
  public removeItem(key: string): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    this.validateKey(key);
    storage.removeItem(key);
  }

  /**
   * Vacía por completo todos los registros almacenados en `LocalStorage`.
   *
   * @description
   * Si `window.localStorage` no está disponible en el entorno de ejecución, no realiza ninguna acción.
   */
  public clear(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.clear();
  }

  /**
   * Comprueba si existe un valor registrado bajo la clave especificada en `LocalStorage`.
   *
   * @param key Clave cuya existencia se desea verificar.
   * @returns `true` si la clave es válida y existe en `LocalStorage`; `false` en caso contrario.
   */
  public hasKey(key: string): boolean {
    const storage = this.getStorage();
    if (!storage || !this.isValidKey(key)) {
      return false;
    }

    return storage.getItem(key) !== null;
  }

  /**
   * Obtiene un arreglo con todas las claves almacenadas actualmente en `LocalStorage`.
   *
   * @returns Arreglo de cadenas (`string[]`) con los nombres de las claves registradas, o `[]` si está vacío o en SSR.
   */
  public keys(): string[] {
    const storage = this.getStorage();
    if (!storage) {
      return [];
    }

    const result: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const currentKey = storage.key(i);
      if (currentKey !== null) {
        result.push(currentKey);
      }
    }
    return result;
  }

  /**
   * Obtiene una referencia segura a `window.localStorage` verificando su disponibilidad.
   *
   * @returns La instancia nativa `Storage` si está disponible y accesible, o `null` en SSR o bloqueo de seguridad.
   */
  private getStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }
      return window.localStorage;
    } catch {
      return null;
    }
  }

  /**
   * Evalúa si una clave es una cadena de texto válida y no contiene únicamente espacios en blanco.
   *
   * @param key Clave a evaluar.
   * @returns `true` si la clave es válida; `false` en caso contrario.
   */
  private isValidKey(key: string): boolean {
    return typeof key === 'string' && key.trim().length > 0;
  }

  /**
   * Valida que la clave proporcionada no sea vacía, lanzando un `StorageError` en caso contrario.
   *
   * @param key Clave a validar.
   * @throws {StorageError} Con código `INVALID_KEY` si la clave no es válida.
   */
  private validateKey(key: string): void {
    if (!this.isValidKey(key)) {
      throw new StorageError(
        'La clave de almacenamiento debe ser una cadena de texto no vacía.',
        StorageErrorCode.INVALID_KEY,
        key
      );
    }
  }

  /**
   * Determina si un error capturado corresponde a una excepción de cuota excedida del navegador.
   *
   * @param error Error capturado durante la invocación de `localStorage.setItem`.
   * @returns `true` si el error es `QuotaExceededError` o `NS_ERROR_DOM_QUOTA_REACHED`; `false` en otro caso.
   */
  private isQuotaExceededError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('name' in error)) {
      return false;
    }
    const errorName = (error as { name: unknown }).name;
    return errorName === 'QuotaExceededError' || errorName === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
}
