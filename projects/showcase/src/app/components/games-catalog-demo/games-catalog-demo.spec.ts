import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from '@andresdgm/storage-manager';
import { GamesCatalogDemoComponent } from './games-catalog-demo';

describe('GamesCatalogDemoComponent', () => {
  let httpTesting: HttpTestingController;
  let localStorageService: LocalStorageService;
  let cacheMock: {
    add: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
  let cacheStorageMock: {
    open: ReturnType<typeof vi.fn>;
    has: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let originalCachesDescriptor: PropertyDescriptor | undefined;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    cacheMock = {
      add: vi.fn().mockResolvedValue(undefined),
      match: vi.fn().mockResolvedValue(
        new Response(new Blob(['img'], { type: 'image/jpeg' }), {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      ),
      delete: vi.fn().mockResolvedValue(true),
      keys: vi.fn().mockResolvedValue([]),
      put: vi.fn().mockResolvedValue(undefined),
    };

    cacheStorageMock = {
      open: vi.fn().mockResolvedValue(cacheMock),
      has: vi.fn().mockResolvedValue(true),
      keys: vi.fn().mockResolvedValue(['juegos-imagenes']),
      delete: vi.fn().mockResolvedValue(true),
    };

    originalCachesDescriptor = Object.getOwnPropertyDescriptor(window, 'caches');
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: cacheStorageMock,
    });

    await TestBed.configureTestingModule({
      imports: [GamesCatalogDemoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    localStorageService = TestBed.inject(LocalStorageService);
  });

  afterEach(() => {
    httpTesting.verify();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    if (originalCachesDescriptor) {
      Object.defineProperty(window, 'caches', originalCachesDescriptor);
    } else {
      delete (window as unknown as { caches?: CacheStorage }).caches;
    }
  });

  it('debe consultar ofertas AAA de CheapShark y guardar un juego en LocalStorage y Cache Storage', async () => {
    const fixture = TestBed.createComponent(GamesCatalogDemoComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const fetchPromise = component.fetchGames('');
    const req = httpTesting.expectOne(
      'https://www.cheapshark.com/api/1.0/deals?storeID=1&AAA=1&pageSize=9',
    );
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        gameID: '202350',
        title: 'Cyberpunk 2077',
        salePrice: '29.99',
        normalPrice: '59.99',
        savings: '50.0',
        metacriticScore: '86',
        steamAppID: '1091500',
        thumb: 'https://shared.fastly.steamstatic.com/cyberpunk.jpg',
      },
    ]);
    await fetchPromise;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cyberpunk 2077');

    const saveButton = fixture.nativeElement.querySelector(
      '.game-card .btn-cta',
    ) as HTMLButtonElement;
    expect(saveButton).toBeTruthy();
    saveButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(localStorageService.getItem<{ title: string }>('juego_202350')?.title).toBe(
      'Cyberpunk 2077',
    );
    expect(cacheMock.add).toHaveBeenCalledWith('https://shared.fastly.steamstatic.com/cyberpunk.jpg');
    expect(fixture.nativeElement.textContent).toContain('Guardado ✓');
  });

  it('debe buscar juegos por título y eliminar un juego guardado', async () => {
    const fixture = TestBed.createComponent(GamesCatalogDemoComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const searchPromise = component.fetchGames('Batman');
    const req = httpTesting.expectOne(
      'https://www.cheapshark.com/api/1.0/games?title=Batman&limit=9',
    );
    req.flush([
      {
        gameID: '146200',
        steamAppID: '208650',
        cheapest: '4.99',
        external: 'Batman: Arkham Knight',
        thumb: 'https://shared.fastly.steamstatic.com/batman.jpg',
      },
    ]);
    await searchPromise;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Batman: Arkham Knight');

    await component.saveGame({
      gameID: '146200',
      title: 'Batman: Arkham Knight',
      price: '4.99',
      thumb: 'https://shared.fastly.steamstatic.com/batman.jpg',
    });
    fixture.detectChanges();

    await component.removeSavedGame({
      gameID: '146200',
      title: 'Batman: Arkham Knight',
      price: '4.99',
      thumb: 'https://shared.fastly.steamstatic.com/batman.jpg',
    });
    fixture.detectChanges();

    expect(localStorageService.hasKey('juego_146200')).toBe(false);
    expect(cacheMock.delete).toHaveBeenCalledWith(
      'https://shared.fastly.steamstatic.com/batman.jpg',
      undefined,
    );
  });
});
