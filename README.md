# Storage Manager Project

Librería reutilizable en Angular orientada a facilitar la gestión del almacenamiento de información en aplicaciones web mediante los mecanismos **LocalStorage** y **Cache Storage** proporcionados por los navegadores.

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) versión 22.2.7.

## Estructura del espacio de trabajo

- `projects/storage-manager`: Código fuente de la librería Angular (`storage-manager`).

## Compilación de la librería

Para compilar la librería, ejecuta:

```bash
ng build storage-manager
```

Los artefactos compilados se almacenarán en el directorio `dist/storage-manager/`.

## Ejecución de pruebas unitarias

Para ejecutar las pruebas unitarias con [Vitest](https://vitest.dev/), utiliza el siguiente comando:

```bash
ng test
```

## Generación de código

Angular CLI incluye herramientas para generar nuevos artefactos dentro de la librería:

```bash
ng generate service nombre-servicio --project=storage-manager
```

Para consultar la lista completa de esquemas disponibles, ejecuta:

```bash
ng generate --help
```

## Recursos adicionales

Para obtener más información sobre el uso de Angular CLI y su referencia detallada de comandos, visita la [documentación oficial de Angular CLI](https://angular.dev/tools/cli).
