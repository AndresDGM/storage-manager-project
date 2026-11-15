/**
 * Lee de forma segura un estado serializado en `sessionStorage` para restaurar la UI al recargar.
 */
export function readSessionState<T>(storageKey: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Persiste de forma segura un estado serializado en `sessionStorage` sin contaminar `LocalStorage`.
 */
export function writeSessionState<T>(storageKey: string, state: T): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    window.sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignorar errores de cuota o entorno restringido en estado auxiliar de UI
  }
}
