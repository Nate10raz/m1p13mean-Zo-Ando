import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-topstrip',
  imports: [TablerIconsModule, MatButtonModule],
  templateUrl: './topstrip.component.html',
})
export class AppTopstripComponent {
  constructor() {}
}
