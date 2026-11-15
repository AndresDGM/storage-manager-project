import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App (Showcase)', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('debe crearse correctamente la aplicación Showcase', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('debe renderizar el encabezado editorial y las secciones de demostración', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Storage');
    expect(compiled.querySelector('#local-storage')).toBeTruthy();
    expect(compiled.querySelector('#cache-storage')).toBeTruthy();
    expect(compiled.querySelector('#juegos-cheapshark')).toBeTruthy();
    expect(compiled.querySelector('#api-publica')).toBeTruthy();
  });
});
