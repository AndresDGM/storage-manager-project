import { TestBed } from '@angular/core/testing';
import { CacheStorageService, StorageError, StorageErrorCode } from '../../public-api';

describe('CacheStorageService', () => {
  let service: CacheStorageService;
  let cacheStorage: {
    open: ReturnType<typeof vi.fn>;
    has: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let cache: Cache;
  let put: ReturnType<typeof vi.fn>;
  let add: ReturnType<typeof vi.fn>;
  let match: ReturnType<typeof vi.fn>;
  let cacheKeys: ReturnType<typeof vi.fn>;
  let deleteResource: ReturnType<typeof vi.fn>;
  let originalCachesDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    put = vi.fn().mockResolvedValue(undefined);
    add = vi.fn().mockResolvedValue(undefined);
    match = vi.fn().mockResolvedValue(undefined);
    cacheKeys = vi.fn().mockResolvedValue([]);
    deleteResource = vi.fn().mockResolvedValue(false);
    cache = { put, add, match, keys: cacheKeys, delete: deleteResource } as unknown as Cache;

    cacheStorage = {
      open: vi.fn().mockResolvedValue(cache),
      has: vi.fn().mockResolvedValue(true),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    };

    originalCachesDescriptor = Object.getOwnPropertyDescriptor(window, 'caches');
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: cacheStorage,
    });

    TestBed.configureTestingModule({ providers: [CacheStorageService] });
    service = TestBed.inject(CacheStorageService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();

    if (originalCachesDescriptor) {
      Object.defineProperty(window, 'caches', originalCachesDescriptor);
    } else {
      delete (window as unknown as { caches?: CacheStorage }).caches;
    }
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('administración de cachés', () => {
    it('debe abrir o crear una caché', async () => {
      await expect(service.openCache('usuarios')).resolves.toBe(cache);
      expect(cacheStorage.open).toHaveBeenCalledWith('usuarios');
    });

    it('debe verificar si una caché existe', async () => {
      cacheStorage.has.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await expect(service.hasCache('existente')).resolves.toBe(true);
      await expect(service.hasCache('inexistente')).resolves.toBe(false);
    });

    it('debe listar y eliminar cachés', async () => {
      cacheStorage.keys.mockResolvedValue(['usuarios', 'configuracion']);

      await expect(service.keys()).resolves.toEqual(['usuarios', 'configuracion']);
      await expect(service.deleteCache('usuarios')).resolves.toBe(true);
      expect(cacheStorage.delete).toHaveBeenCalledWith('usuarios');
    });

    it('debe retornar false al eliminar una caché inexistente', async () => {
      cacheStorage.delete.mockResolvedValue(false);

      await expect(service.deleteCache('inexistente')).resolves.toBe(false);
    });

    it('debe rechazar nombres de caché vacíos o inválidos', async () => {
      await expect(service.openCache('')).rejects.toMatchObject({
        code: StorageErrorCode.INVALID_KEY,
      });
      await expect(service.hasCache('   ')).rejects.toMatchObject({
        code: StorageErrorCode.INVALID_KEY,
      });
      await expect(service.deleteCache(null as unknown as string)).rejects.toBeInstanceOf(
        StorageError,
      );
    });

    it('debe convertir los errores de las operaciones de caché', async () => {
      const nativeError = new Error('fallo nativo');
      cacheStorage.open.mockRejectedValueOnce(nativeError);
      cacheStorage.has.mockRejectedValueOnce(nativeError);
      cacheStorage.keys.mockRejectedValueOnce(nativeError);
      cacheStorage.delete.mockRejectedValueOnce(nativeError);

      await expect(service.openCache('a')).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
        originalError: nativeError,
      });
      await expect(service.hasCache('b')).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
      });
      await expect(service.keys()).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
      });
      await expect(service.deleteCache('c')).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
      });
    });
  });

  describe('operaciones sobre recursos', () => {
    it('debe guardar una respuesta clonando el objeto original', async () => {
      const response = new Response(JSON.stringify({ id: 1 }));

      await service.put('usuarios', '/usuarios/1', response);

      expect(put).toHaveBeenCalledWith('/usuarios/1', expect.any(Response));
      expect(put.mock.calls[0][1]).not.toBe(response);
    });

    it('debe convertir errores de put', async () => {
      const nativeError = new Error('no se pudo guardar');
      put.mockRejectedValue(nativeError);

      await expect(
        service.put('usuarios', '/usuarios/1', new Response('ok')),
      ).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
        originalError: nativeError,
      });
    });

    it('debe descargar y agregar una petición a la caché', async () => {
      await service.add('recursos', '/assets/logo.svg');

      expect(add).toHaveBeenCalledWith('/assets/logo.svg');
    });

    it('debe reportar errores de red al agregar una petición', async () => {
      const networkError = new Error('red no disponible');
      add.mockRejectedValue(networkError);

      await expect(service.add('recursos', '/api/datos')).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_NETWORK_ERROR,
        originalError: networkError,
      });
    });

    it('debe consultar una respuesta existente y retornar null cuando no existe', async () => {
      const response = new Response('contenido');
      match.mockResolvedValueOnce(response).mockResolvedValueOnce(undefined);

      await expect(service.match('recursos', '/assets/logo.svg')).resolves.toBe(response);
      await expect(service.match('recursos', '/assets/no-existe.svg')).resolves.toBeNull();
    });

    it('debe retornar null al consultar una caché inexistente', async () => {
      cacheStorage.has.mockResolvedValue(false);

      await expect(service.match('inexistente', '/recurso')).resolves.toBeNull();
      await expect(service.listEntries('inexistente')).resolves.toEqual([]);
      await expect(service.deleteResource('inexistente', '/recurso')).resolves.toBe(false);
      expect(cacheStorage.open).not.toHaveBeenCalled();
    });

    it('debe convertir errores de match', async () => {
      const nativeError = new Error('fallo al consultar');
      match.mockRejectedValue(nativeError);

      await expect(service.match('recursos', '/recurso')).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
        originalError: nativeError,
      });
    });

    it('debe recuperar JSON tipado', async () => {
      match.mockResolvedValue(new Response(JSON.stringify({ id: 7, activo: true })));

      await expect(
        service.matchJson<{ id: number; activo: boolean }>('usuarios', '/7'),
      ).resolves.toEqual({ id: 7, activo: true });
    });

    it('debe retornar null cuando el JSON solicitado no existe', async () => {
      match.mockResolvedValue(null);

      await expect(service.matchJson('usuarios', '/inexistente')).resolves.toBeNull();
    });

    it('debe reportar JSON corrupto', async () => {
      match.mockResolvedValue(new Response('{"id":}'));

      await expect(service.matchJson('usuarios', '/corrupto')).rejects.toMatchObject({
        code: StorageErrorCode.INVALID_JSON,
      });
    });

    it('debe listar y eliminar recursos específicos', async () => {
      const requests = [new Request('https://example.com/a'), new Request('https://example.com/b')];
      cacheKeys.mockResolvedValue(requests);
      deleteResource.mockResolvedValue(true);

      await expect(service.listEntries('recursos')).resolves.toEqual(requests);
      await expect(service.deleteResource('recursos', '/a')).resolves.toBe(true);
      expect(cacheKeys).toHaveBeenCalledWith();
      expect(deleteResource).toHaveBeenCalledWith('/a', undefined);
    });

    it('debe convertir errores al listar y eliminar recursos', async () => {
      const nativeError = new Error('fallo de recursos');
      cacheKeys.mockRejectedValueOnce(nativeError);
      deleteResource.mockRejectedValueOnce(nativeError);

      await expect(service.listEntries('recursos')).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
      });
      await expect(service.deleteResource('recursos', '/a')).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_OPERATION_ERROR,
      });
    });
  });

  describe('disponibilidad del entorno', () => {
    it('debe reportar cuando Cache Storage no está disponible', async () => {
      Object.defineProperty(window, 'caches', {
        configurable: true,
        value: undefined,
      });

      await expect(service.keys()).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_UNAVAILABLE,
      });
    });

    it('debe reportar cuando window no existe', async () => {
      vi.stubGlobal('window', undefined);

      await expect(service.keys()).rejects.toMatchObject({
        code: StorageErrorCode.CACHE_UNAVAILABLE,
      });
    });
  });
});
