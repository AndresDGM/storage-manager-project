import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocalStorageService, StorageEntry } from 'storage-manager';
import {
  LocalStorageSnapshotItem,
  LocalStorageValueType,
  OperationLogEntry,
} from '../../models/showcase.models';
import {
  createLogEntry,
  extractErrorDetails,
  formatDisplayValue,
} from '../../utils/showcase-log.util';

/**
 * Componente demostrativo interactivo para todas las operaciones de `LocalStorageService`.
 */
@Component({
  selector: 'app-local-storage-demo',
  imports: [FormsModule],
  templateUrl: './local-storage-demo.html',
  styleUrl: './local-storage-demo.css',
})
export class LocalStorageDemoComponent implements OnInit {
  private readonly localStorageService = inject(LocalStorageService);

  /** Emite la cantidad actual de claves almacenadas cada vez que cambia el estado. */
  public readonly keysCountChange = output<number>();

  protected readonly keyInput = signal('usuario_actual');
  protected readonly valueType = signal<LocalStorageValueType>('json');
  protected readonly rawValueInput = signal(
    '{\n  "id": 101,\n  "nombre": "Laura Martínez",\n  "rol": "Arquitecta"\n}',
  );
  protected readonly queryKeyInput = signal('usuario_actual');

  protected readonly entries = signal<LocalStorageSnapshotItem[]>([]);
  protected readonly inspectionResult = signal<string | null>(null);
  protected readonly inspectionMeta = signal<string>('Sin consulta reciente.');
  protected readonly logs = signal<OperationLogEntry[]>([]);

  public ngOnInit(): void {
    this.refreshEntries();
  }

  /** Almacena un valor tipado usando `setItem`. */
  public saveItem(): void {
    const key = this.keyInput();
    try {
      const parsedValue = this.parseInputValue();
      const entry: StorageEntry<unknown> = { key, value: parsedValue };
      this.localStorageService.setItem(entry.key, entry.value);
      this.queryKeyInput.set(key);
      this.recordLog(
        'setItem',
        'ok',
        `Clave "${key}" guardada (${this.valueType()}).`,
        undefined,
        formatDisplayValue(parsedValue),
      );
      this.refreshEntries();
    } catch (error: unknown) {
      this.recordCaughtError('setItem', error);
    }
  }

  /** Actualiza de forma controlada una clave existente usando `updateItem`. */
  public updateExistingItem(): void {
    const key = this.keyInput();
    try {
      const parsedValue = this.parseInputValue();
      this.localStorageService.updateItem(key, parsedValue);
      this.queryKeyInput.set(key);
      this.recordLog(
        'updateItem',
        'ok',
        `Clave "${key}" actualizada correctamente.`,
        undefined,
        formatDisplayValue(parsedValue),
      );
      this.refreshEntries();
    } catch (error: unknown) {
      this.recordCaughtError('updateItem', error);
    }
  }

  /** Consulta y deserializa una clave usando `getItem` y `hasKey`. */
  public queryItem(targetKey?: string): void {
    const key = targetKey ?? this.queryKeyInput();
    this.queryKeyInput.set(key);

    const exists = this.localStorageService.hasKey(key);
    const value = this.localStorageService.getItem<unknown>(key);
    const formatted = formatDisplayValue(value);

    this.inspectionResult.set(formatted);
    this.inspectionMeta.set(
      exists
        ? `hasKey("${key}") = true · Tipo detectado: ${this.detectValueType(value)}`
        : `hasKey("${key}") = false · Clave no encontrada (retorna null)`,
    );

    this.recordLog(
      'getItem / hasKey',
      'ok',
      exists
        ? `Consulta exitosa para "${key}".`
        : `La clave "${key}" no existe; se retornó null de forma segura.`,
      undefined,
      formatted,
    );
  }

  /** Elimina una clave específica mediante `removeItem`. */
  public removeKey(targetKey: string): void {
    try {
      this.localStorageService.removeItem(targetKey);
      this.recordLog('removeItem', 'ok', `Clave "${targetKey}" eliminada.`);
      this.refreshEntries();
    } catch (error: unknown) {
      this.recordCaughtError('removeItem', error);
    }
  }

  /** Vacía todos los registros mediante `clear`. */
  public clearAll(): void {
    this.localStorageService.clear();
    this.inspectionResult.set(null);
    this.inspectionMeta.set('Almacenamiento vaciado.');
    this.recordLog('clear', 'ok', 'Se eliminaron todas las claves de LocalStorage.');
    this.refreshEntries();
  }

  /** Carga un ejemplo predefinido en el editor para acelerar pruebas manuales. */
  public applyPreset(preset: 'user' | 'prefs' | 'counter' | 'token'): void {
    if (preset === 'user') {
      this.keyInput.set('usuario_actual');
      this.valueType.set('json');
      this.rawValueInput.set(
        '{\n  "id": 101,\n  "nombre": "Laura Martínez",\n  "activo": true\n}',
      );
      return;
    }

    if (preset === 'prefs') {
      this.keyInput.set('preferencias_ui');
      this.valueType.set('json');
      this.rawValueInput.set('{\n  "tema": "bauhaus",\n  "idioma": "es-CO",\n  "itemsPorPagina": 12\n}');
      return;
    }

    if (preset === 'counter') {
      this.keyInput.set('visitas_totales');
      this.valueType.set('number');
      this.rawValueInput.set('42');
      return;
    }

    this.keyInput.set('sesion_activa');
    this.valueType.set('boolean');
    this.rawValueInput.set('true');
  }

  /** Carga una clave existente al formulario para editarla o consultarla. */
  public selectEntryForEdit(item: LocalStorageSnapshotItem): void {
    this.keyInput.set(item.key);
    this.queryKeyInput.set(item.key);

    if (item.value === null) {
      this.valueType.set('null');
      this.rawValueInput.set('null');
    } else if (typeof item.value === 'number') {
      this.valueType.set('number');
      this.rawValueInput.set(String(item.value));
    } else if (typeof item.value === 'boolean') {
      this.valueType.set('boolean');
      this.rawValueInput.set(String(item.value));
    } else if (typeof item.value === 'string') {
      this.valueType.set('string');
      this.rawValueInput.set(item.value);
    } else {
      this.valueType.set('json');
      this.rawValueInput.set(JSON.stringify(item.value, null, 2));
    }

    this.queryItem(item.key);
  }

  /** Demuestra el manejo controlado de errores (`INVALID_KEY`) con clave vacía. */
  public triggerInvalidKeyDemo(): void {
    try {
      this.localStorageService.setItem('   ', 'valor');
    } catch (error: unknown) {
      this.recordCaughtError('setItem (clave inválida)', error);
    }
  }

  /** Sincroniza el listado en vivo con `LocalStorageService.keys()`. */
  public refreshEntries(): void {
    const storedKeys = this.localStorageService.keys();
    const snapshot: LocalStorageSnapshotItem[] = storedKeys.map((key) => {
      const value = this.localStorageService.getItem<unknown>(key);
      return {
        key,
        value,
        preview: formatDisplayValue(value),
        detectedType: this.detectValueType(value),
      };
    });

    this.entries.set(snapshot);
    this.keysCountChange.emit(snapshot.length);
  }

  private parseInputValue(): unknown {
    const type = this.valueType();
    const raw = this.rawValueInput();

    if (type === 'null') {
      return null;
    }
    if (type === 'string') {
      return raw;
    }
    if (type === 'number') {
      const parsedNumber = Number(raw);
      if (raw.trim() === '' || Number.isNaN(parsedNumber)) {
        throw new Error('El valor ingresado no corresponde a un número válido.');
      }
      return parsedNumber;
    }
    if (type === 'boolean') {
      const normalized = raw.trim().toLowerCase();
      if (normalized !== 'true' && normalized !== 'false') {
        throw new Error('Un valor booleano debe ser "true" o "false".');
      }
      return normalized === 'true';
    }

    return JSON.parse(raw) as unknown;
  }

  private detectValueType(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    return typeof value;
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
    payload?: string,
  ): void {
    const entry = createLogEntry(operation, status, message, errorCode, payload);
    this.logs.update((current) => [entry, ...current].slice(0, 6));
  }
}
