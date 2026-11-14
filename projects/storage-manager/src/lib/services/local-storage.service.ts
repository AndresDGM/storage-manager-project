import { Injectable } from '@angular/core';
import { IStorageService } from '../interfaces/storage-service.interface';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService implements IStorageService {
  public setItem<T = unknown>(key: string, value: T): void {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  }

  public getItem<T>(key: string): T | null {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) {
      return null;
    }
    return JSON.parse(rawValue) as T;
  }

  public updateItem<T>(key: string, value: T): void {
    this.setItem(key, value);
  }

  public removeItem(key: string): void {
    window.localStorage.removeItem(key);
  }

  public clear(): void {
    window.localStorage.clear();
  }

  public hasKey(key: string): boolean {
    return window.localStorage.getItem(key) !== null;
  }

  public keys(): string[] {
    const result: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key !== null) {
        result.push(key);
      }
    }
    return result;
  }
}
