# Storage Manager Project

Librería reutilizable en Angular orientada a facilitar la gestión tipada, segura y modular del almacenamiento de información en aplicaciones web mediante **LocalStorage** y **Cache Storage**, acompañada de su aplicación independiente **Showcase**.

---

## Estructura del repositorio

- `projects/storage-manager`: Código fuente de la librería Angular (`storage-manager`).
  - `src/public-api.ts`: Superficie de exportación pública exclusiva para consumidores externos.
  - `src/lib/services/`: Servicios `LocalStorageService` y `CacheStorageService`.
  - `src/lib/interfaces/`: Contratos `IStorageService`, `ICacheStorageService` y `StorageOperationResult`.
  - `src/lib/models/`: Enumeración `StorageErrorCode` y modelo `StorageEntry`.
  - `src/lib/errors/`: Clase de excepción personalizada `StorageError`.
- `projects/showcase`: Aplicación Angular independiente que consume exclusivamente la API pública de `storage-manager` para demostrar todas las operaciones en tiempo real.

---

## Requisitos previos

- **Node.js** `>= 22`
- **npm** `>= 10`
- **Angular CLI** `^22.2.7`

Instalación de dependencias del espacio de trabajo:

```bash
npm install
```

---

## Pruebas unitarias y cobertura (100%)

El proyecto utiliza **Vitest** con cobertura configurada al **100%** en statements, branches, functions y lines para los servicios y errores de la librería:

```bash
# Ejecutar pruebas unitarias de la librería
npm test

# Ejecutar pruebas unitarias con reporte de cobertura (umbral 100%)
npm run test:coverage

# Ejecutar pruebas unitarias de la aplicación Showcase
npm run test:showcase
```

---

## Documentación técnica con Compodoc

Todos los servicios, métodos, parámetros, interfaces y modelos están documentados mediante JSDoc en español para su generación con **Compodoc**:

```bash
# Generar documentación estática en ./documentation
npm run docs

# Servir la documentación generada en el navegador
npm run docs:serve
```

También puedes validar la cobertura documental al 100%:

```bash
npx compodoc -p tsconfig.doc.json --coverageTest 100 --coverageMinimumPerFile 100
```

---

## Compilación y publicación en NPM

1. Compila la librería en modo producción (los artefactos se generan en `dist/storage-manager`):

```bash
npm run build:lib
```

2. Verifica el contenido empaquetado antes de publicar:

```bash
cd dist/storage-manager
npm pack --dry-run
```

3. Inicia sesión en NPM y publica el paquete `@andresdgm/storage-manager`:

```bash
npm login
npm publish --access public
```

---

## Ejecución de la aplicación Showcase

Para ejecutar localmente la aplicación demostrativa después de compilar la librería:

```bash
npm run build:lib
npm start
```

Luego abre `http://localhost:4200/` en tu navegador (en `localhost` tanto `LocalStorage` como `Cache Storage` se encuentran habilitados en contexto seguro).

Si deseas consumir el paquete directamente desde el registro NPM en un proyecto externo o en el Showcase:

```bash
npm install @andresdgm/storage-manager
```

Consulta también la guía detallada de uso y API en [projects/storage-manager/README.md](projects/storage-manager/README.md).
