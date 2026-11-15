import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'storage-manager';
import { LocalStorageDemoComponent } from './local-storage-demo';

describe('LocalStorageDemoComponent', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LocalStorageDemoComponent],
    }).compileComponents();
    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('debe guardar, consultar, actualizar y eliminar elementos en LocalStorage', async () => {
    const fixture = TestBed.createComponent(LocalStorageDemoComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.applyPreset('counter');
    component.saveItem();
    expect(service.getItem<number>('visitas_totales')).toBe(42);

    component.queryItem('visitas_totales');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('hasKey("visitas_totales") = true');

    component.applyPreset('user');
    component.saveItem();
    expect(service.getItem<{ id: number }>('usuario_actual')?.id).toBe(101);

    component.updateExistingItem();
    expect(service.hasKey('usuario_actual')).toBe(true);

    component.removeKey('visitas_totales');
    expect(service.hasKey('visitas_totales')).toBe(false);

    component.clearAll();
    expect(service.keys()).toEqual([]);
  });

  it('debe registrar errores controlados cuando se dispara una clave inválida', () => {
    const fixture = TestBed.createComponent(LocalStorageDemoComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.triggerInvalidKeyDemo();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('INVALID_KEY');
  });
});
