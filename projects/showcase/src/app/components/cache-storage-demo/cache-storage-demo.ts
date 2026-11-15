import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CacheStorageService } from 'storage-manager';
import { CacheEntrySnapshot, OperationLogEntry } from '../../models/showcase.models';
import {
  createLogEntry,
  extractErrorDetails,
  formatDisplayValue,
} from '../../utils/showcase-log.util';

/**
 * Componente demostrativo interactivo para todas las operaciones de `CacheStorageService`.
 */
@Component({
  selector: 'app-cache-storage-demo',
  imports: [FormsModule],
  templateUrl: './cache-storage-demo.html',
  styleUrl: './cache-storage-demo.css',
})
export class CacheStorageDemoComponent implements OnInit {
  private readonly cacheStorageService = inject(CacheStorageService);

  /** Emite la cantidad de cachés registradas. */
  public readonly cachesCountChange = output<number>();

  /** Emite si la API nativa `window.caches` está disponible en el navegador actual. */
  public readonly cacheAvailableChange = output<boolean>();

  protected readonly cacheNameInput = signal('api-v1');
  protected readonly activeCache = signal('api-v1');

  protected readonly resourceUrlInput = signal('/api/productos/1');
  protected readonly responseStatusInput = signal(200);
  protected readonly responseContentType = signal<'application/json' | 'text/plain'>(
    'application/json',
  );
  protected readonly responseBodyInput = signal(
    '{\n  "id": 1,\n  "producto": "Módulo Angular",\n  "disponible": true\n}',
  );
  protected readonly fetchUrlInput = signal('/demo-data.json');

  protected readonly cacheNames = signal<string[]>([]);
  protected readonly cacheEntries = signal<CacheEntrySnapshot[]>([]);
  protected readonly inspectedOutput = signal<string | null>(null);
  protected readonly inspectedMeta = signal<string>('Sin consulta reciente.');
  protected readonly cacheSupported = signal<boolean>(true);
  protected readonly logs = signal<OperationLogEntry[]>([]);

  public async ngOnInit(): Promise<void> {
    await this.refreshCaches();
  }

  /** Abre o crea una caché mediante `openCache`. */
  public async openOrCreateCache(): Promise<void> {
    const cacheName = this.cacheNameInput();
    try {
      await this.cacheStorageService.openCache(cacheName);
      this.activeCache.set(cacheName);
      this.recordLog('openCache', 'ok', `Caché "${cacheName}" abierta o creada.`);
      await this.refreshCaches();
      await this.loadCacheEntries(cacheName);
    } catch (error: unknown) {
      this.recordCaughtError('openCache', error);
    }
  }

  /** Verifica si una caché existe mediante `hasCache`. */
  public async checkCacheExists(): Promise<void> {
    const cacheName = this.cacheNameInput();
    try {
      const exists = await this.cacheStorageService.hasCache(cacheName);
      this.recordLog(
        'hasCache',
        'ok',
        exists ? `La caché "${cacheName}" existe.` : `La caché "${cacheName}" no existe.`,
      );
    } catch (error: unknown) {
      this.recordCaughtError('hasCache', error);
    }
  }

  /** Selecciona una caché existente y lista sus recursos. */
  public async selectCache(cacheName: string): Promise<void> {
    this.cacheNameInput.set(cacheName);
    this.activeCache.set(cacheName);
    await this.loadCacheEntries(cacheName);
  }

  /** Elimina una caché completa mediante `deleteCache`. */
  public async removeCache(cacheName: string): Promise<void> {
    try {
      const deleted = await this.cacheStorageService.deleteCache(cacheName);
      this.recordLog(
        'deleteCache',
        'ok',
        deleted
          ? `Caché "${cacheName}" eliminada por completo.`
          : `La caché "${cacheName}" no existía.`,
      );
      if (this.activeCache() === cacheName) {
        this.cacheEntries.set([]);
      }
      await this.refreshCaches();
    } catch (error: unknown) {
      this.recordCaughtError('deleteCache', error);
    }
  }

  /** Almacena una respuesta HTTP simulada usando `put`. */
  public async putSimulatedResponse(): Promise<void> {
    const cacheName = this.activeCache() || this.cacheNameInput();
    const url = this.resourceUrlInput().trim();

    if (!url) {
      this.recordLog('put', 'error', 'Ingresa una URL o ruta válida para almacenar el recurso.');
      return;
    }

    try {
      const response = new Response(this.responseBodyInput(), {
        status: Number(this.responseStatusInput()) || 200,
        headers: {
          'Content-Type': this.responseContentType(),
        },
      });

      await this.cacheStorageService.put(cacheName, url, response);
      this.activeCache.set(cacheName);
      this.recordLog('put', 'ok', `Recurso "${url}" almacenado en caché "${cacheName}".`);
      await this.refreshCaches();
      await this.loadCacheEntries(cacheName);
    } catch (error: unknown) {
      this.recordCaughtError('put', error);
    }
  }

  /** Descarga una petición real y la almacena usando `add`. */
  public async fetchAndAddResource(): Promise<void> {
    const cacheName = this.activeCache() || this.cacheNameInput();
    const url = this.fetchUrlInput().trim();

    if (!url) {
      this.recordLog('add', 'error', 'Ingresa una URL para descargar con add().');
      return;
    }

    try {
      await this.cacheStorageService.add(cacheName, url);
      this.activeCache.set(cacheName);
      this.recordLog('add', 'ok', `Recurso "${url}" descargado y guardado en "${cacheName}".`);
      await this.refreshCaches();
      await this.loadCacheEntries(cacheName);
    } catch (error: unknown) {
      this.recordCaughtError('add', error);
    }
  }

  /** Consulta una respuesta HTTP sin parsear usando `match`. */
  public async inspectRawMatch(url: string): Promise<void> {
    const cacheName = this.activeCache();
    try {
      const response = await this.cacheStorageService.match(cacheName, url);
      if (!response) {
        this.inspectedMeta.set(`match("${url}") -> null`);
        this.inspectedOutput.set('null');
        this.recordLog('match', 'ok', `El recurso "${url}" no se encontró en "${cacheName}".`);
        return;
      }

      const bodyText = await response.clone().text();
      const contentType = response.headers.get('content-type') ?? 'sin cabecera';
      this.inspectedMeta.set(
        `match("${url}") · HTTP ${response.status} · Content-Type: ${contentType}`,
      );
      this.inspectedOutput.set(bodyText);
      this.recordLog('match', 'ok', `Respuesta HTTP recuperada para "${url}".`);
    } catch (error: unknown) {
      this.recordCaughtError('match', error);
    }
  }

  /** Consulta y deserializa una respuesta como JSON usando `matchJson`. */
  public async inspectJsonMatch(url: string): Promise<void> {
    const cacheName = this.activeCache();
    try {
      const json = await this.cacheStorageService.matchJson<unknown>(cacheName, url);
      if (json === null) {
        this.inspectedMeta.set(`matchJson("${url}") -> null`);
        this.inspectedOutput.set('null');
        this.recordLog('matchJson', 'ok', `El recurso "${url}" no existe en "${cacheName}".`);
        return;
      }

      this.inspectedMeta.set(`matchJson("${url}") · JSON tipado deserializado`);
      this.inspectedOutput.set(formatDisplayValue(json));
      this.recordLog('matchJson', 'ok', `JSON deserializado correctamente desde "${url}".`);
    } catch (error: unknown) {
      this.inspectedMeta.set(`matchJson("${url}") falló con StorageError`);
      this.recordCaughtError('matchJson', error);
    }
  }

  /** Elimina un recurso específico dentro de la caché activa usando `deleteResource`. */
  public async removeResource(url: string): Promise<void> {
    const cacheName = this.activeCache();
    try {
      const removed = await this.cacheStorageService.deleteResource(cacheName, url);
      this.recordLog(
        'deleteResource',
        'ok',
        removed
          ? `Recurso "${url}" eliminado de "${cacheName}".`
          : `El recurso "${url}" no existía en "${cacheName}".`,
      );
      await this.loadCacheEntries(cacheName);
    } catch (error: unknown) {
      this.recordCaughtError('deleteResource', error);
    }
  }

  /** Sincroniza el listado de cachés usando `keys`. */
  public async refreshCaches(): Promise<void> {
    try {
      const names = await this.cacheStorageService.keys();
      this.cacheSupported.set(true);
      this.cacheAvailableChange.emit(true);
      this.cacheNames.set(names);
      this.cachesCountChange.emit(names.length);

      if (names.length > 0 && !names.includes(this.activeCache())) {
        this.activeCache.set(names[0]);
      }

      if (names.includes(this.activeCache())) {
        await this.loadCacheEntries(this.activeCache());
      } else {
        this.cacheEntries.set([]);
      }
    } catch (error: unknown) {
      this.cacheSupported.set(false);
      this.cacheAvailableChange.emit(false);
      this.cachesCountChange.emit(0);
      this.recordCaughtError('keys', error);
    }
  }

  /** Carga las peticiones almacenadas dentro de una caché usando `listEntries`. */
  public async loadCacheEntries(cacheName: string): Promise<void> {
    try {
      const requests = await this.cacheStorageService.listEntries(cacheName);
      this.cacheEntries.set(
        requests.map((req) => ({
          url: req.url,
          method: req.method,
        })),
      );
    } catch (error: unknown) {
      this.recordCaughtError('listEntries', error);
    }
  }

  private recordCaughtError(operation: string, error: unknown): void {
    const details = extractErrorDetails(error);
    this.recordLog(operation, 'error', details.message, details.code);
  }

  private recordLog(
    operation: string,
    status: 'ok' | 'error',
    message: string,
    errorCode?: OperationLogEntry['errorCode'],
  ): void {
    const entry = createLogEntry(operation, status, message, errorCode);
    this.logs.update((current) => [entry, ...current].slice(0, 6));
  }
}
