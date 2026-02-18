import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: '',
})
export class HomeRedirectComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const role = this.authService.getCurrentRole()?.toLowerCase().trim();
    const target = role === 'client' ? '/accueil' : '/dashboard';
    this.router.navigate([target], { replaceUrl: true });
  }
}
