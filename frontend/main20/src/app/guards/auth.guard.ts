import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay } from 'rxjs';

import { AuthService } from 'src/app/services/auth.service';
import { TokenService } from 'src/app/services/token.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private refreshInFlight$: Observable<boolean> | null = null;

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth();
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth();
  }

  private checkAuth(): Observable<boolean | UrlTree> | boolean | UrlTree {
    const token = this.tokenService.getAccessToken();
    if (token && !this.tokenService.isAccessTokenExpired(token)) {
      return true;
    }

    return this.refreshAccessToken().pipe(
      map((ok) => (ok ? true : this.router.createUrlTree(['/authentication/login']))),
      catchError(() => of(this.router.createUrlTree(['/authentication/login'])))
    );
  }

  private refreshAccessToken(): Observable<boolean> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.authService.refresh().pipe(
        map((response) => Boolean(response?.data?.accessToken)),
        catchError(() => of(false)),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1)
      );
    }

    return this.refreshInFlight$;
  }
}
