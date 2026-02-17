import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkRole(route);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | UrlTree {
    return this.checkRole(childRoute);
  }

  private checkRole(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowedRoles = ((route.data?.['roles'] as string[] | undefined) ?? []).map((value) =>
      value.toLowerCase().trim(),
    );
    if (!allowedRoles.length) {
      return true;
    }

    const role = this.authService.getCurrentRole();
    const normalizedRole = role?.toLowerCase().trim();
    if (normalizedRole && allowedRoles.includes(normalizedRole)) {
      return true;
    }

    return this.router.createUrlTree(['/access-denied']);
  }
}
