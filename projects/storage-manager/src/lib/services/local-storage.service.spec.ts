import { TestBed } from '@angular/core/testing';
import {
  LocalStorageService,
  StorageError,
  StorageErrorCode,
  StorageEntry,
  StorageOperationResult,
} from '../../public-api';

interface TestUser {
  id: number;
  nombre: string;
  activo: boolean;
}

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalStorageService],
    });
    service = TestBed.inject(LocalStorageService);
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('debe crearse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('setItem y getItem', () => {
    it('debe almacenar y recuperar valores primitivos (string, number, boolean, null)', () => {
      service.setItem('clave_texto', 'Hola Mundo');
      service.setItem('clave_numero', 2026);
      service.setItem('clave_booleano', true);
      service.setItem('clave_nula', null);

      expect(service.getItem<string>('clave_texto')).toBe('Hola Mundo');
      expect(service.getItem<number>('clave_numero')).toBe(2026);
      expect(service.getItem<boolean>('clave_booleano')).toBe(true);
      expect(service.getItem<null>('clave_nula')).toBeNull();
    });

    it('debe almacenar y recuperar objetos complejos y arreglos con tipado genérico <T>', () => {
      const usuario: TestUser = { id: 1, nombre: 'Javier', activo: true };
      const etiquetas: string[] = ['angular', 'typescript', 'arquitectura'];

      service.setItem<TestUser>('usuario', usuario);
      service.setItem<string[]>('etiquetas', etiquetas);

      expect(service.getItem<TestUser>('usuario')).toEqual(usuario);
      expect(service.getItem<string[]>('etiquetas')).toEqual(etiquetas);
    });

    it('debe retornar null al consultar una clave inexistente', () => {
      expect(service.getItem<string>('no_existe')).toBeNull();
    });

    it('debe retornar null al consultar una clave vacía o con solo espacios', () => {
      expect(service.getItem<string>('')).toBeNull();
      expect(service.getItem<string>('   ')).toBeNull();
    });

    it('debe retornar null de forma segura cuando el valor almacenado es JSON corrupto', () => {
      window.localStorage.setItem('json_corrupto', '{nombre: "sin_cerrar"');

      const resultado = service.getItem<TestUser>('json_corrupto');
      expect(resultado).toBeNull();
    });

    it('debe lanzar StorageError (INVALID_KEY) si se intenta guardar con una clave vacía', () => {
      expect(() => service.setItem('', 'valor')).toThrowError(StorageError);
      try {
        service.setItem('   ', 'valor');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.INVALID_KEY);
      }
    });

    it('debe lanzar StorageError (SERIALIZATION_ERROR) si se intenta guardar undefined', () => {
      expect(() => service.setItem('clave_undef', undefined)).toThrowError(StorageError);
      try {
        service.setItem('clave_undef', undefined);
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.SERIALIZATION_ERROR);
        expect((error as StorageError).key).toBe('clave_undef');
      }
    });

    it('debe lanzar StorageError (QUOTA_EXCEEDED) cuando se excede la cuota (QuotaExceededError)', () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });

      try {
        service.setItem('archivo_grande', 'datos');
        expect.fail('Debió lanzar StorageError por cuota excedida');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
        expect((error as StorageError).originalError).toBe(quotaError);
      }
    });

    it('debe lanzar StorageError (QUOTA_EXCEEDED) con NS_ERROR_DOM_QUOTA_REACHED en Firefox', () => {
      const firefoxQuotaError = new Error('Quota reached');
      firefoxQuotaError.name = 'NS_ERROR_DOM_QUOTA_REACHED';
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw firefoxQuotaError;
      });

      expect(() => service.setItem('clave_ff', 'datos')).toThrowError(StorageError);
      try {
        service.setItem('clave_ff', 'datos');
      } catch (error) {
        expect((error as StorageError).code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
      }
    });

    it('debe lanzar StorageError (SERIALIZATION_ERROR) ante referencias circulares o errores no Error', () => {
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;

      try {
        service.setItem('circular', circular);
        expect.fail('Debió lanzar StorageError por referencia circular');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.SERIALIZATION_ERROR);
      }

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw 'error_primitivo';
      });

      try {
        service.setItem('otra_clave', 'valor');
      } catch (error) {
        expect((error as StorageError).code).toBe(StorageErrorCode.SERIALIZATION_ERROR);
      }
    });
  });

  describe('updateItem', () => {
    it('debe sobrescribir de forma controlada una clave existente', () => {
      service.setItem<TestUser>('usuario', { id: 1, nombre: 'Inicial', activo: false });
      service.updateItem<TestUser>('usuario', { id: 1, nombre: 'Actualizado', activo: true });

      expect(service.getItem<TestUser>('usuario')).toEqual({
        id: 1,
        nombre: 'Actualizado',
        activo: true,
      });
    });

    it('debe lanzar StorageError (INVALID_KEY) cuando la clave a actualizar es vacía', () => {
      expect(() => service.updateItem('', 'nuevo')).toThrowError(StorageError);
    });

    it('debe lanzar StorageError (KEY_NOT_FOUND) cuando la clave a actualizar no existe', () => {
      try {
        service.updateItem('inexistente', 'valor');
        expect.fail('Debió lanzar StorageError cuando la clave no existe');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe(StorageErrorCode.KEY_NOT_FOUND);
        expect((error as StorageError).key).toBe('inexistente');
      }
    });
  });

  describe('removeItem y clear', () => {
    it('debe eliminar un elemento específico mediante removeItem', () => {
      service.setItem('temporal', 123);
      expect(service.hasKey('temporal')).toBe(true);

      service.removeItem('temporal');
      expect(service.hasKey('temporal')).toBe(false);
      expect(service.getItem('temporal')).toBeNull();
    });

    it('debe lanzar StorageError (INVALID_KEY) si removeItem recibe una clave vacía', () => {
      expect(() => service.removeItem('')).toThrowError(StorageError);
    });

    it('debe eliminar todos los elementos almacenados mediante clear', () => {
      service.setItem('k1', 'v1');
      service.setItem('k2', 'v2');
      expect(service.keys().length).toBe(2);

      service.clear();
      expect(service.keys()).toEqual([]);
    });
  });

  describe('hasKey y keys', () => {
    it('debe verificar correctamente la existencia de claves con hasKey', () => {
      service.setItem('existe', true);
      expect(service.hasKey('existe')).toBe(true);
      expect(service.hasKey('no_existe')).toBe(false);
      expect(service.hasKey('')).toBe(false);
    });

    it('debe listar todas las claves válidas e ignorar claves nulas eventuales', () => {
      service.setItem('a', 1);
      service.setItem('b', 2);
      expect(service.keys().sort()).toEqual(['a', 'b']);

      vi.spyOn(Storage.prototype, 'key').mockReturnValueOnce('a').mockReturnValueOnce(null);
      expect(service.keys()).toEqual(['a']);
    });
  });

  describe('Manejo de SSR y disponibilidad de window.localStorage', () => {
    it('debe manejar de forma segura cuando window.localStorage no está disponible (SSR)', () => {
      vi.spyOn(window, 'localStorage', 'get').mockReturnValue(undefined as unknown as Storage);

      expect(() => service.setItem('ssr', 'valor')).not.toThrow();
      expect(service.getItem('ssr')).toBeNull();
      expect(() => service.updateItem('ssr', 'nuevo')).not.toThrow();
      expect(() => service.removeItem('ssr')).not.toThrow();
      expect(() => service.clear()).not.toThrow();
      expect(service.hasKey('ssr')).toBe(false);
      expect(service.keys()).toEqual([]);
    });

    it('debe manejar de forma segura cuando el acceso a window.localStorage lanza SecurityError', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('Access denied', 'SecurityError');
      });

      expect(service.getItem('seguridad')).toBeNull();
      expect(service.hasKey('seguridad')).toBe(false);
      expect(service.keys()).toEqual([]);
    });
  });

  describe('Modelos e interfaces exportadas', () => {
    it('debe permitir tipar entradas y resultados de operaciones', () => {
      const entrada: StorageEntry<string> = { key: 'saludo', value: 'hola' };
      const resultado: StorageOperationResult<string> = {
        success: true,
        key: entrada.key,
        data: entrada.value,
        timestamp: Date.now(),
      };

      expect(resultado.success).toBe(true);
      expect(resultado.data).toBe('hola');
    });
  });
});
