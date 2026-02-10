import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { isObservable, of, throwError } from 'rxjs';

import { AuthGuard } from './auth.guard';
import { AuthService } from 'src/app/services/auth.service';
import { TokenService } from 'src/app/services/token.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let tokenService: TokenService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['refresh']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthGuard,
        TokenService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    tokenService = TestBed.inject(TokenService);
    router = TestBed.inject(Router);
  });

  it('allows navigation when access token is valid', () => {
    tokenService.setAccessToken('token');
    spyOn(tokenService, 'isAccessTokenExpired').and.returnValue(false);

    const result = guard.canActivateChild({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);

    expect(result).toBeTrue();
  });

  it('refreshes token when access token is missing', (done) => {
    authServiceSpy.refresh.and.returnValue(
      of({
        route: '/auth/refresh',
        status: 200,
        message: 'Token rafraichi',
        date: new Date().toISOString(),
        data: {
          accessToken: 'new-token',
        },
      })
    );

    const result = guard.canActivateChild({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);

    if (!isObservable(result)) {
      fail('Expected an observable result');
      done();
      return;
    }

    result.subscribe((value: boolean | ReturnType<Router['createUrlTree']>) => {
      expect(value).toBeTrue();
      done();
    });
  });

  it('redirects to login when refresh fails', (done) => {
    authServiceSpy.refresh.and.returnValue(throwError(() => new Error('refresh failed')));

    const result = guard.canActivateChild({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot);

    if (!isObservable(result)) {
      fail('Expected an observable result');
      done();
      return;
    }

    result.subscribe((value: boolean | ReturnType<Router['createUrlTree']>) => {
      const serialized = router.serializeUrl(value as ReturnType<Router['createUrlTree']>);
      expect(serialized).toBe('/authentication/login');
      done();
    });
  });
});
