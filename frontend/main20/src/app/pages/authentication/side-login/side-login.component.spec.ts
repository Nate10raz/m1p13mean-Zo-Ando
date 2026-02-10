import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { AppSideLoginComponent } from './side-login.component';
import { AuthService } from 'src/app/services/auth.service';

describe('AppSideLoginComponent', () => {
  let fixture: ComponentFixture<AppSideLoginComponent>;
  let component: AppSideLoginComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [AppSideLoginComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSideLoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('submits a valid form and navigates to dashboard', () => {
    authServiceSpy.login.and.returnValue(
      of({
        route: '/auth/login',
        status: 200,
        message: 'Connexion reussie',
        date: new Date().toISOString(),
        data: {
          user: {
            _id: 'u1',
            email: 'client@example.com',
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
      })
    );

    const componentSnackBar = (component as unknown as { snackBar: MatSnackBar }).snackBar;
    spyOn(componentSnackBar, 'open');
    spyOn(router, 'navigate');

    component.form.setValue({
      email: 'client@example.com',
      password: 'secret123',
    });

    component.submit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'client@example.com',
      password: 'secret123',
    });
    expect(componentSnackBar.open).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.isSubmitting).toBeFalse();
    expect(component.serverError).toBe('');
  });
});
