import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, ClientRegisterPayload } from './auth.service';
import { environment } from 'src/environments/environment';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokenService: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts client registration to the expected endpoint', () => {
    const payload: ClientRegisterPayload = {
      email: 'client@example.com',
      password: 'secret12',
      nom: 'Jean',
      prenom: 'Dupont',
      telephone: '1234567',
    };

    service.registerClient(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register/client`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      route: '/auth/register/client',
      status: 201,
      message: 'ok',
      date: new Date().toISOString(),
      data: {
        user: {
          _id: 'u1',
          email: payload.email,
          role: 'client',
          nom: payload.nom,
          prenom: payload.prenom,
          telephone: payload.telephone,
          isEmailVerified: false,
          preferences: {
            notifications: true,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        panier: {
          _id: 'p1',
          clientId: 'u1',
          items: [],
          updatedAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
        },
      },
    });
  });

  it('posts login to the expected endpoint', () => {
    const payload = {
      email: 'client@example.com',
      password: 'secret123',
    };

    service.login(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.withCredentials).toBeTrue();
    req.flush({
      route: '/auth/login',
      status: 200,
      message: 'Connexion reussie',
      date: new Date().toISOString(),
      data: {
        user: {
          _id: 'u1',
          email: payload.email,
          role: 'client',
          nom: 'Doe',
          prenom: 'Jane',
          telephone: '+261340000000',
          isEmailVerified: false,
          preferences: {
            notifications: true,
          },
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          panierId: 'p1',
        },
        accessToken: 'token',
      },
    });

    expect(tokenService.getAccessToken()).toBe('token');
  });

  it('refreshes access token using credentials', () => {
    service.refresh().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({
      route: '/auth/refresh',
      status: 200,
      message: 'Token rafraichi',
      date: new Date().toISOString(),
      data: {
        accessToken: 'refreshed-token',
      },
    });

    expect(tokenService.getAccessToken()).toBe('refreshed-token');
  });

  it('clears access token on logout', () => {
    tokenService.setAccessToken('token');

    service.logout().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({
      route: '/auth/logout',
      status: 200,
      message: 'Logout',
      date: new Date().toISOString(),
      data: null,
    });

    expect(tokenService.getAccessToken()).toBeNull();
  });
});
