import { HttpClient } from '@angular/common/http';
import { DestroyRef, Component, OnInit, computed, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CacheStorageService, LocalStorageService } from '@andresdgm/storage-manager';
import {
  CheapSharkDealDto,
  CheapSharkGameCard,
  CheapSharkGameDto,
  OperationLogEntry,
} from '../../models/showcase.models';
import { createLogEntry, extractErrorDetails } from '../../utils/showcase-log.util';
import { readSessionState, writeSessionState } from '../../utils/showcase-persistence.util';

const CHEAPSHARK_API_BASE = 'https://www.cheapshark.com/api/1.0';
const GAME_STORAGE_PREFIX = 'juego_';
const GAMES_IMAGE_CACHE = 'juegos-imagenes';
const GAMES_UI_STATE_KEY = 'showcase:games-catalog-ui';

interface GamesCatalogUiState {
  searchQuery: string;
  catalogGames: CheapSharkGameCard[];
  logs: OperationLogEntry[];
}

/**
 * Componente que consulta juegos desde CheapShark API, los muestra en tarjetas
 * y permite guardarlos en `LocalStorageService` junto con su imagen en `CacheStorageService`.
 */
@Component({
  selector: 'app-games-catalog-demo',
  imports: [FormsModule],
  templateUrl: './games-catalog-demo.html',
  styleUrl: './games-catalog-demo.css',
})
export class GamesCatalogDemoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly cacheStorageService = inject(CacheStorageService);
  private readonly destroyRef = inject(DestroyRef);

  /** Notifica al componente padre que `LocalStorage` o `Cache Storage` cambiaron. */
  public readonly storageSynced = output<void>();

  protected readonly searchQuery = signal('');
  protected readonly catalogGames = signal<CheapSharkGameCard[]>([]);
  protected readonly savedGames = signal<CheapSharkGameCard[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly savingGameId = signal<string | null>(null);
  protected readonly logs = signal<OperationLogEntry[]>([]);

  protected readonly savedGameIds = computed(
    () => new Set(this.savedGames().map((game) => game.gameID)),
  );

  private readonly objectUrls = new Set<string>();
  private uiRestored = false;

  constructor() {
    effect(() => {
      const snapshot = this.buildUiState();
      if (this.uiRestored) {
        writeSessionState<GamesCatalogUiState>(GAMES_UI_STATE_KEY, snapshot);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.revokeObjectUrls();
    });
  }

  public async ngOnInit(): Promise<void> {
    this.restoreUiState();
    this.uiRestored = true;
    await this.loadSavedGames();
  }

  /** Consulta la lista de juegos en CheapShark (por título o catálogo AAA en oferta). */
  public async fetchGames(customQuery?: string): Promise<void> {
    const query = (customQuery ?? this.searchQuery()).trim();
    if (customQuery !== undefined) {
      this.searchQuery.set(customQuery);
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const cards = query
        ? await this.fetchGamesByTitle(query)
        : await this.fetchAaaDeals();

      this.catalogGames.set(cards);
      this.recordLog(
        'CheapShark list',
        'ok',
        query
          ? `Se consultaron ${cards.length} juegos para "${query}".`
          : `Se consultaron ${cards.length} ofertas AAA en Steam.`,
      );
    } catch (error: unknown) {
      const details = extractErrorDetails(error);
      this.errorMessage.set(
        `No se pudo consultar CheapShark API: ${details.message}`,
      );
      this.recordLog('CheapShark list', 'error', details.message, details.code);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Guarda un juego en `LocalStorageService` y su miniatura en `CacheStorageService`. */
  public async saveGame(game: CheapSharkGameCard): Promise<void> {
    this.savingGameId.set(game.gameID);
    try {
      const storageKey = `${GAME_STORAGE_PREFIX}${game.gameID}`;
      const record: CheapSharkGameCard = {
        gameID: game.gameID,
        title: game.title,
        price: game.price,
        normalPrice: game.normalPrice,
        savingsPercent: game.savingsPercent,
        metacriticScore: game.metacriticScore,
        thumb: game.thumb,
      };

      this.localStorageService.setItem(storageKey, record);

      let cacheInfo = 'sin imagen en caché';
      try {
        await this.cacheStorageService.add(GAMES_IMAGE_CACHE, game.thumb);
        cacheInfo = `imagen cacheada en "${GAMES_IMAGE_CACHE}"`;
      } catch {
        cacheInfo = 'metadatos en LocalStorage (imagen no cacheada por CORS/entorno)';
      }

      this.recordLog(
        'Guardar juego',
        'ok',
        `"${game.title}" guardado en "${storageKey}" (${cacheInfo}).`,
      );
      await this.loadSavedGames();
      this.storageSynced.emit();
    } catch (error: unknown) {
      const details = extractErrorDetails(error);
      this.recordLog('Guardar juego', 'error', details.message, details.code);
    } finally {
      this.savingGameId.set(null);
    }
  }

  /** Elimina un juego guardado de `LocalStorageService` y su imagen de `CacheStorageService`. */
  public async removeSavedGame(game: CheapSharkGameCard): Promise<void> {
    const storageKey = `${GAME_STORAGE_PREFIX}${game.gameID}`;
    try {
      this.localStorageService.removeItem(storageKey);
      try {
        await this.cacheStorageService.deleteResource(GAMES_IMAGE_CACHE, game.thumb);
      } catch {
        // Cache Storage puede no estar disponible en ciertos entornos
      }

      this.recordLog('Eliminar juego', 'ok', `"${game.title}" eliminado de guardados.`);
      await this.loadSavedGames();
      this.storageSynced.emit();
    } catch (error: unknown) {
      const details = extractErrorDetails(error);
      this.recordLog('Eliminar juego', 'error', details.message, details.code);
    }
  }

  /** Carga los juegos guardados desde `LocalStorageService` e hidrata sus imágenes cacheadas. */
  public async loadSavedGames(): Promise<void> {
    this.revokeObjectUrls();
    const gameKeys = this.localStorageService
      .keys()
      .filter((key) => key.startsWith(GAME_STORAGE_PREFIX));

    const games: CheapSharkGameCard[] = [];
    for (const key of gameKeys) {
      const item = this.localStorageService.getItem<CheapSharkGameCard>(key);
      if (!item) {
        continue;
      }

      const cachedImageUrl = await this.resolveCachedImageUrl(item.thumb);
      games.push({ ...item, cachedImageUrl });
    }

    this.savedGames.set(games);
  }

  private async fetchAaaDeals(): Promise<CheapSharkGameCard[]> {
    const url = `${CHEAPSHARK_API_BASE}/deals?storeID=1&AAA=1&pageSize=9`;
    const deals = await firstValueFrom(this.http.get<CheapSharkDealDto[]>(url));
    return deals.map((deal) => ({
      gameID: deal.gameID,
      title: deal.title,
      price: deal.salePrice,
      normalPrice: deal.normalPrice,
      savingsPercent: Math.round(Number(deal.savings) || 0),
      metacriticScore: deal.metacriticScore !== '0' ? deal.metacriticScore : undefined,
      thumb: deal.thumb,
    }));
  }

  private async fetchGamesByTitle(title: string): Promise<CheapSharkGameCard[]> {
    const url = `${CHEAPSHARK_API_BASE}/games?title=${encodeURIComponent(title)}&limit=9`;
    const games = await firstValueFrom(this.http.get<CheapSharkGameDto[]>(url));
    return games.map((game) => ({
      gameID: game.gameID,
      title: game.external,
      price: game.cheapest,
      thumb: game.thumb,
    }));
  }

  private async resolveCachedImageUrl(thumbUrl: string): Promise<string | undefined> {
    try {
      const response = await this.cacheStorageService.match(GAMES_IMAGE_CACHE, thumbUrl);
      if (!response || typeof URL.createObjectURL !== 'function') {
        return undefined;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      this.objectUrls.add(objectUrl);
      return objectUrl;
    } catch {
      return undefined;
    }
  }

  private revokeObjectUrls(): void {
    if (typeof URL.revokeObjectURL !== 'function') {
      this.objectUrls.clear();
      return;
    }
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  private buildUiState(): GamesCatalogUiState {
    return {
      searchQuery: this.searchQuery(),
      catalogGames: this.catalogGames(),
      logs: this.logs(),
    };
  }

  private restoreUiState(): void {
    const saved = readSessionState<GamesCatalogUiState>(GAMES_UI_STATE_KEY);
    if (!saved) {
      return;
    }

    this.searchQuery.set(saved.searchQuery ?? '');
    this.catalogGames.set(saved.catalogGames ?? []);
    this.logs.set(saved.logs ?? []);
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
