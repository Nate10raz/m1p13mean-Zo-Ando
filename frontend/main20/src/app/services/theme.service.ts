// ─────────────────────────────────────────────────────────────
//  theme.service.ts
//  À placer dans : src/app/services/
// ─────────────────────────────────────────────────────────────
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

// La classe de thème de couleur déjà appliquée sur <body> (ex: blue_theme)
// Adaptez cette valeur si vous en avez plusieurs
const COLOR_THEME_CLASS = 'blue_theme';
const LAYOUT_CLASS      = 'light-theme'; // classe de layout actuelle

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  private storageKey = 'app-theme-mode';

  private _mode$ = new BehaviorSubject<ThemeMode>(this.getSavedMode());
  readonly mode$ = this._mode$.asObservable();

  get isDark(): boolean {
    return this._mode$.value === 'dark';
  }

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    // Applique le thème sauvegardé dès le démarrage
    this.applyTheme(this._mode$.value);
  }

  toggle(): void {
    const next: ThemeMode = this.isDark ? 'light' : 'dark';
    this.setMode(next);
  }

  setMode(mode: ThemeMode): void {
    this._mode$.next(mode);
    localStorage.setItem(this.storageKey, mode);
    this.applyTheme(mode);
  }

  private applyTheme(mode: ThemeMode): void {
    const body = document.body;

    if (mode === 'dark') {
      this.renderer.removeClass(body, 'light-theme');
      this.renderer.addClass(body, 'dark-theme');
    } else {
      this.renderer.removeClass(body, 'dark-theme');
      this.renderer.addClass(body, 'light-theme');
    }

    // S'assurer que la classe de couleur (blue_theme etc.) reste présente
    if (!body.classList.contains(COLOR_THEME_CLASS)) {
      this.renderer.addClass(body, COLOR_THEME_CLASS);
    }
  }

  private getSavedMode(): ThemeMode {
    const saved = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') return saved;

    // Fallback : respecter la préférence système
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
