import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AppSideRegisterClientComponent } from './side-register-client.component';
import { AuthService } from 'src/app/services/auth.service';

describe('AppSideRegisterClientComponent', () => {
  let fixture: ComponentFixture<AppSideRegisterClientComponent>;
  let component: AppSideRegisterClientComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['registerClient']);

    await TestBed.configureTestingModule({
      imports: [AppSideRegisterClientComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSideRegisterClientComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('submits a valid form and navigates to login', () => {
    authServiceSpy.registerClient.and.returnValue(
      of({
        route: '/auth/register/client',
        status: 201,
        message: 'ok',
        date: new Date().toISOString(),
        data: {
          user: {
            _id: 'u1',
            email: 'client@example.com',
            role: 'client',
            nom: 'Jean',
            prenom: 'Dupont',
            telephone: '1234567',
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
      }),
    );

    const componentSnackBar = (component as unknown as { snackBar: MatSnackBar }).snackBar;
    spyOn(router, 'navigate');
    spyOn(componentSnackBar, 'open');

    component.form.setValue({
      nom: 'Jean',
      prenom: 'Dupont',
      email: 'client@example.com',
      telephone: '1234567',
      password: 'secret12',
      confirmPassword: 'secret12',
    });

    component.submit();

    expect(authServiceSpy.registerClient).toHaveBeenCalledWith({
      nom: 'Jean',
      prenom: 'Dupont',
      email: 'client@example.com',
      telephone: '1234567',
      password: 'secret12',
    });
    expect(componentSnackBar.open).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/client/login']);
    expect(component.isSubmitting).toBeFalse();
    expect(component.serverError).toBe('');
  });
});
