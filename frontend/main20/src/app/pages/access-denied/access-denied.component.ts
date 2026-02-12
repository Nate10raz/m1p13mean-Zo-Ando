import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../../material.module';

@Component({
  selector: 'app-access-denied',
  imports: [MaterialModule, RouterModule],
  templateUrl: './access-denied.component.html',
})
export class AppAccessDeniedComponent {}
