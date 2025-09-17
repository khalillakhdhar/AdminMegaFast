/* eslint-disable @typescript-eslint/no-explicit-any */
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';
import { initFirebaseBackend } from './app/authUtils';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { JwtInterceptor } from './app/core/helpers/jwt.interceptor';
import { ErrorInterceptor } from './app/core/helpers/error.interceptor';

// --- (A) PROD MODE ---
if (environment.production) {
  enableProdMode();
}

// --- (B) SUPPRESSION CIBLÉE DES WARNINGS ---
// Active via environment.suppressWarnings = true
if ((environment as any).suppressWarnings) {
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  // Motifs à filtrer (tu peux les surcharger via environment.suppressedWarnings)
  const defaultPatterns = [
    // Google Maps
    'Google Maps JavaScript API has been loaded directly without loading=async',
    'The library directions is unknown',
    // 404 assets bruyants (optionnel)
    'logo-white.png',
    'logo-icon.png',
  ];

  const patterns: RegExp[] = (environment as any).suppressedWarnings?.length
    ? (environment as any).suppressedWarnings.map((p: string) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    : defaultPatterns.map((p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const shouldSuppress = (args: unknown[]) => {
    const s = args.map(String).join(' ');
    return patterns.some((rx) => rx.test(s));
  };

  // Filtre uniquement les WARNINGS (recommandé)
  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    origWarn(...args);
  };

  // 👉 Si tu veux aussi filtrer certains errors 404 récurrents, décommente ci-dessous
  // console.error = (...args: unknown[]) => {
  //   if (shouldSuppress(args)) return;
  //   origError(...args);
  // };
}

// --- (C) INIT FIREBASE SI BESOIN ---
if (environment.defaultauth === 'firebase') {
  initFirebaseBackend(environment.firebaseConfig);
}

// --- (D) INTERCEPTORS HTTP ---
const httpInterceptorProviders: any[] = [
  { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
];

// --- (E) BOOTSTRAP ---
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    ...httpInterceptorProviders,
    ...appConfig.providers
  ]
}).catch((err) =>
  console.error('Error during bootstrapping the application:', err)
);
