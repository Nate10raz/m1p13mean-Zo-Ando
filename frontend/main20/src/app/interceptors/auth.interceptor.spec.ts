import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from 'src/app/services/auth.service';
import { TokenService } from 'src/app/services/token.service';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: TokenService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['refresh']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TokenService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Authorization header for protected requests', () => {
    tokenService.setAccessToken('token');

    http.get('/api/protected').subscribe();

    const req = httpMock.expectOne('/api/protected');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token');
    req.flush({});
  });

  it('refreshes token on 401 and retries the request', () => {
    tokenService.setAccessToken('old-token');
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

    http.get('/api/protected').subscribe();

    const first = httpMock.expectOne('/api/protected');
    expect(first.request.headers.get('Authorization')).toBe('Bearer old-token');
    first.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    const retried = httpMock.expectOne('/api/protected');
    expect(retried.request.headers.get('Authorization')).toBe('Bearer new-token');
    retried.flush({});
  });
});
