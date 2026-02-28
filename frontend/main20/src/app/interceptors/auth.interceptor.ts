import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';

import { AuthService } from 'src/app/services/auth.service';
import { TokenService } from 'src/app/services/token.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshRequest$: Observable<string> | null = null;

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isAuthEndpoint(req.url) || this.isAssetRequest(req.url)) {
      return next.handle(req);
    }

    const accessToken = this.tokenService.getAccessToken();
    const authReq = accessToken ? this.addAuthHeader(req, accessToken) : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401 || this.isAuthEndpoint(req.url)) {
          return throwError(() => error);
        }

        return this.refreshAccessToken().pipe(
          switchMap((token) => next.handle(this.addAuthHeader(req, token))),
          catchError((refreshError) => this.handleAuthFailure(refreshError)),
        );
      }),
    );
  }

  private refreshAccessToken(): Observable<string> {
    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.authService.refresh().pipe(
        map((response) => {
          const token = response?.data?.accessToken;
          if (!token) {
            throw new Error('Missing access token');
          }
          return token;
        }),
        shareReplay(1),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
      );
    }

    return this.refreshRequest$;
  }

  private handleAuthFailure(error: unknown): Observable<never> {
    this.tokenService.clearAccessToken();
    this.router.navigate(['/client/login']);
    return throwError(() => error);
  }

  private addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private isAuthEndpoint(url: string): boolean {
    return /\/auth\/(login|refresh|register|logout)/.test(url);
  }

  private isAssetRequest(url: string): boolean {
    return url.startsWith('/assets/');
  }
}

export const authInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};

