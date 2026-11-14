import { Injectable } from '@angular/core';
import { StorageError } from '../errors/storage.error';
import { IStorageService } from '../interfaces/storage-service.interface';
import { StorageErrorCode } from '../models/storage-error-type.model';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService implements IStorageService {
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

  public removeItem(key: string): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    this.validateKey(key);
    storage.removeItem(key);
  }

  public clear(): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.clear();
  }

  public hasKey(key: string): boolean {
    const storage = this.getStorage();
    if (!storage || !this.isValidKey(key)) {
      return false;
    }

    return storage.getItem(key) !== null;
  }

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

  private isValidKey(key: string): boolean {
    return typeof key === 'string' && key.trim().length > 0;
  }

  private validateKey(key: string): void {
    if (!this.isValidKey(key)) {
      throw new StorageError(
        'La clave de almacenamiento debe ser una cadena de texto no vacía.',
        StorageErrorCode.INVALID_KEY,
        key
      );
    }
  }

  private isQuotaExceededError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('name' in error)) {
      return false;
    }
    const errorName = (error as { name: unknown }).name;
    return errorName === 'QuotaExceededError' || errorName === 'NS_ERROR_DOM_QUOTA_REACHED';
  }
}
