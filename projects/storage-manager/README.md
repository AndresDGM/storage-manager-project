# storage-manager

Librería Angular reutilizable, tipada y desacoplada para facilitar la gestión segura de **LocalStorage** y **Cache Storage** en aplicaciones web sin necesidad de interactuar directamente con las API nativas del navegador.

---

## Características principales

- **Tipado fuerte con genéricos `<T>`:** Serialización y deserialización automática en JSON para valores primitivos, arreglos y objetos complejos.
- **Compatibilidad con SSR:** Verifica de forma segura la disponibilidad de `window.localStorage` y `window.caches`.
- **Manejo controlado de errores:** Convierte fallos nativos (cuota excedida, JSON inválido, claves vacías, errores de red o ausencia de API) en excepciones tipadas `StorageError`.
- **API pública encapsulada:** Expone únicamente servicios, interfaces, modelos y errores necesarios desde `storage-manager`.

---

## Instalación

Instala la librería desde NPM en tu proyecto Angular (`^22.2.0`):

```bash
npm install storage-manager
```

---

## Configuración en Angular

Los servicios `LocalStorageService` y `CacheStorageService` están registrados con `providedIn: 'root'`, por lo que puedes inyectarlos directamente en cualquier componente, servicio, guard o interceptor mediante `inject()` o inyección por constructor sin configuración adicional en módulos.

```typescript
import { Component, inject } from '@angular/core';
import { LocalStorageService, CacheStorageService } from 'storage-manager';

@Component({
  selector: 'app-ejemplo',
  template: '',
})
export class EjemploComponent {
  private readonly localStorage = inject(LocalStorageService);
  private readonly cacheStorage = inject(CacheStorageService);
}
```

---

## Uso de `LocalStorageService`

### Ejemplo rápido

```typescript
import { Component, inject } from '@angular/core';
import { LocalStorageService, StorageError, StorageErrorCode } from 'storage-manager';

interface Usuario {
  id: number;
  nombre: string;
  activo: boolean;
}

@Component({
  selector: 'app-perfil',
  template: '',
})
export class PerfilComponent {
  private readonly storage = inject(LocalStorageService);

  guardarYConsultar(): void {
    // Guardar valores primitivos u objetos tipados
    this.storage.setItem<string>('tema', 'claro');
    this.storage.setItem<Usuario>('usuario', { id: 1, nombre: 'Ana', activo: true });

    // Consultar con tipado fuerte (retorna null si no existe o el JSON es inválido)
    const usuario = this.storage.getItem<Usuario>('usuario');
    const existeTema = this.storage.hasKey('tema'); // true
    const todasLasClaves = this.storage.keys(); // ['tema', 'usuario']

    // Actualizar de forma controlada una clave existente
    try {
      this.storage.updateItem<Usuario>('usuario', { id: 1, nombre: 'Ana María', activo: true });
    } catch (error) {
      if (error instanceof StorageError && error.code === StorageErrorCode.KEY_NOT_FOUND) {
        console.warn('La clave aún no existe en LocalStorage.');
      }
    }

    // Eliminar una clave específica o limpiar todo
    this.storage.removeItem('tema');
    this.storage.clear();
  }
}
```

### Métodos disponibles en `LocalStorageService`

| Método | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `setItem<T>` | `(key: string, value: T)` | `void` | Serializa en JSON y almacena un valor primitivo u objeto. |
| `getItem<T>` | `(key: string)` | `T \| null` | Recupera y deserializa el valor. Retorna `null` si no existe o está corrupto. |
| `updateItem<T>` | `(key: string, value: T)` | `void` | Reemplaza el valor de una clave existente; lanza `KEY_NOT_FOUND` si no existe. |
| `removeItem` | `(key: string)` | `void` | Elimina el registro asociado a la clave indicada. |
| `clear` | `()` | `void` | Vacía todos los elementos almacenados en `LocalStorage`. |
| `hasKey` | `(key: string)` | `boolean` | Comprueba si la clave existe actualmente en `LocalStorage`. |
| `keys` | `()` | `string[]` | Retorna el listado de todas las claves almacenadas. |

---

## Uso de `CacheStorageService`

### Ejemplo rápido

```typescript
import { Component, inject } from '@angular/core';
import { CacheStorageService, StorageError } from 'storage-manager';

interface Producto {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-catalogo',
  template: '',
})
export class CatalogoComponent {
  private readonly cache = inject(CacheStorageService);

  async gestionarCache(): Promise<void> {
    try {
      // Abrir o crear una caché
      await this.cache.openCache('api-v1');

      // Guardar una respuesta HTTP manualmente (se clona internamente)
      const respuesta = new Response(JSON.stringify({ id: 10, nombre: 'Teclado' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      await this.cache.put('api-v1', '/api/productos/10', respuesta);

      // Descargar y almacenar directamente una URL en la caché
      await this.cache.add('api-v1', '/assets/config.json');

      // Consultar respuesta completa o deserializada como JSON tipado
      const rawResponse = await this.cache.match('api-v1', '/api/productos/10');
      const producto = await this.cache.matchJson<Producto>('api-v1', '/api/productos/10');

      // Listar entradas, eliminar un recurso o eliminar la caché completa
      const entradas = await this.cache.listEntries('api-v1');
      await this.cache.deleteResource('api-v1', '/api/productos/10');
      await this.cache.deleteCache('api-v1');
    } catch (error) {
      if (error instanceof StorageError) {
        console.error(`[${error.code}] ${error.message}`);
      }
    }
  }
}
```

### Métodos disponibles en `CacheStorageService`

| Método | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `openCache` | `(cacheName: string)` | `Promise<Cache>` | Abre una caché existente o la crea si no existe. |
| `hasCache` | `(cacheName: string)` | `Promise<boolean>` | Verifica si existe la caché indicada. |
| `keys` | `()` | `Promise<string[]>` | Lista los nombres de todas las cachés disponibles. |
| `deleteCache` | `(cacheName: string)` | `Promise<boolean>` | Elimina una caché completa. |
| `put` | `(cacheName: string, request: RequestInfo, response: Response)` | `Promise<void>` | Clona y guarda una respuesta HTTP asociada a una petición. |
| `add` | `(cacheName: string, request: RequestInfo)` | `Promise<void>` | Descarga una petición y guarda su respuesta en la caché. |
| `match` | `(cacheName: string, request: RequestInfo, options?: CacheQueryOptions)` | `Promise<Response \| null>` | Busca una respuesta almacenada sin crear la caché si no existe. |
| `matchJson<T>` | `(cacheName: string, request: RequestInfo, options?: CacheQueryOptions)` | `Promise<T \| null>` | Busca una respuesta y deserializa su cuerpo como JSON tipado `T`. |
| `listEntries` | `(cacheName: string)` | `Promise<ReadonlyArray<Request>>` | Lista las peticiones almacenadas dentro de una caché. |
| `deleteResource` | `(cacheName: string, request: RequestInfo, options?: CacheQueryOptions)` | `Promise<boolean>` | Elimina un recurso específico de la caché indicada. |

---

## Manejo de errores (`StorageError` y `StorageErrorCode`)

Todas las excepciones controladas se emiten como instancias de `StorageError`, que incluyen las propiedades `code` (`StorageErrorCode`), `key` (opcional) y `originalError` (opcional):

- `INVALID_KEY`: Clave de almacenamiento o nombre de caché vacío o compuesto solo por espacios.
- `KEY_NOT_FOUND`: Intento de actualizar (`updateItem`) una clave que no existe en `LocalStorage`.
- `QUOTA_EXCEEDED`: Se superó la cuota de almacenamiento permitida por el navegador.
- `SERIALIZATION_ERROR`: Valor `undefined` o estructura no serializable (por ejemplo, referencias circulares).
- `INVALID_JSON`: El cuerpo recuperado en `matchJson` no contiene JSON válido.
- `CACHE_UNAVAILABLE`: `window.caches` no está disponible en el entorno actual.
- `CACHE_NETWORK_ERROR`: Falló la descarga de red requerida por `CacheStorageService.add()`.
- `CACHE_OPERATION_ERROR`: Fallo general retornado por la API nativa de Cache Storage.
- `STORAGE_UNAVAILABLE` / `UNKNOWN_ERROR`: Códigos reservados para indisponibilidad de almacenamiento o errores imprevistos.

---

## Elementos exportados en la API pública

- Servicios: `LocalStorageService`, `CacheStorageService`
- Interfaces: `IStorageService`, `ICacheStorageService`, `StorageOperationResult<T>`
- Modelos y errores: `StorageEntry<T>`, `StorageError`, `StorageErrorCode`

## Licencia

MIT
