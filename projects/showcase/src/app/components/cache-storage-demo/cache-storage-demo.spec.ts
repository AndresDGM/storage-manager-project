import { TestBed } from '@angular/core/testing';
import { CacheStorageDemoComponent } from './cache-storage-demo';

describe('CacheStorageDemoComponent', () => {
  let cacheStorageMock: {
    open: ReturnType<typeof vi.fn>;
    has: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let cacheMock: {
    put: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    match: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let originalCachesDescriptor: PropertyDescriptor | undefined;

  beforeEach(async () => {
    cacheMock = {
      put: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue(undefined),
      match: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      keys: vi.fn().mockResolvedValue([new Request('http://localhost/api/productos/1')]),
      delete: vi.fn().mockResolvedValue(true),
    };

    cacheStorageMock = {
      open: vi.fn().mockResolvedValue(cacheMock),
      has: vi.fn().mockResolvedValue(true),
      keys: vi.fn().mockResolvedValue(['api-v1']),
      delete: vi.fn().mockResolvedValue(true),
    };

    originalCachesDescriptor = Object.getOwnPropertyDescriptor(window, 'caches');
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: cacheStorageMock,
    });

    await TestBed.configureTestingModule({
      imports: [CacheStorageDemoComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCachesDescriptor) {
      Object.defineProperty(window, 'caches', originalCachesDescriptor);
    } else {
      delete (window as unknown as { caches?: CacheStorage }).caches;
    }
  });

  it('debe abrir cachés, guardar respuestas y consultarlas con match y matchJson', async () => {
    const fixture = TestBed.createComponent(CacheStorageDemoComponent);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    await component.openOrCreateCache();
    expect(cacheStorageMock.open).toHaveBeenCalledWith('api-v1');

    await component.checkCacheExists();
    expect(cacheStorageMock.has).toHaveBeenCalledWith('api-v1');

    await component.putSimulatedResponse();
    expect(cacheMock.put).toHaveBeenCalled();

    await component.fetchAndAddResource();
    expect(cacheMock.add).toHaveBeenCalledWith('/demo-data.json');

    await component.inspectRawMatch('/api/productos/1');
    await component.inspectJsonMatch('/api/productos/1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('"ok": true');

    await component.removeResource('/api/productos/1');
    expect(cacheMock.delete).toHaveBeenCalledWith('/api/productos/1', undefined);

    await component.removeCache('api-v1');
    expect(cacheStorageMock.delete).toHaveBeenCalledWith('api-v1');
  });
});
