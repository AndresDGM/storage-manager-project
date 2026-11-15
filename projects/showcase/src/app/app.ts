import { Component, signal, viewChild } from '@angular/core';
import { StorageErrorCode } from 'storage-manager';
import { CacheStorageDemoComponent } from './components/cache-storage-demo/cache-storage-demo';
import { GamesCatalogDemoComponent } from './components/games-catalog-demo/games-catalog-demo';
import { LocalStorageDemoComponent } from './components/local-storage-demo/local-storage-demo';

/**
 * Componente raíz de la aplicación Showcase que demuestra la API pública de `storage-manager`.
 */
@Component({
  selector: 'app-root',
  imports: [LocalStorageDemoComponent, CacheStorageDemoComponent, GamesCatalogDemoComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly localStorageDemo = viewChild(LocalStorageDemoComponent);
  private readonly cacheStorageDemo = viewChild(CacheStorageDemoComponent);
  private readonly gamesCatalogDemo = viewChild(GamesCatalogDemoComponent);

  protected readonly localStorageKeysCount = signal(0);
  protected readonly cachesCount = signal(0);
  protected readonly cacheApiAvailable = signal(true);

  protected readonly errorCodes: ReadonlyArray<{ code: StorageErrorCode; description: string }> = [
    {
      code: StorageErrorCode.INVALID_KEY,
      description: 'Clave de almacenamiento o nombre de caché vacío o compuesto solo por espacios.',
    },
    {
      code: StorageErrorCode.KEY_NOT_FOUND,
      description: 'Intento de actualizar (updateItem) una clave inexistente en LocalStorage.',
    },
    {
      code: StorageErrorCode.QUOTA_EXCEEDED,
      description: 'El navegador alcanzó el límite de almacenamiento permitido.',
    },
    {
      code: StorageErrorCode.SERIALIZATION_ERROR,
      description: 'Valor undefined o estructura no serializable (referencias circulares).',
    },
    {
      code: StorageErrorCode.INVALID_JSON,
      description: 'Contenido almacenado que no corresponde a JSON válido al ejecutar matchJson.',
    },
    {
      code: StorageErrorCode.CACHE_UNAVAILABLE,
      description: 'La API nativa window.caches no está expuesta en el entorno actual.',
    },
    {
      code: StorageErrorCode.CACHE_NETWORK_ERROR,
      description: 'Fallo de red o respuesta inválida al ejecutar CacheStorageService.add().',
    },
    {
      code: StorageErrorCode.CACHE_OPERATION_ERROR,
      description: 'Error general devuelto por la API nativa de Cache Storage.',
    },
  ];

  protected async onGamesStorageSynced(): Promise<void> {
    this.localStorageDemo()?.refreshEntries();
    await this.cacheStorageDemo()?.refreshCaches();
  }

  protected onLocalStorageCountChange(count: number): void {
    this.localStorageKeysCount.set(count);
    void this.gamesCatalogDemo()?.loadSavedGames();
  }

  protected onCachesCountChange(count: number): void {
    this.cachesCount.set(count);
    void this.gamesCatalogDemo()?.loadSavedGames();
  }
}
