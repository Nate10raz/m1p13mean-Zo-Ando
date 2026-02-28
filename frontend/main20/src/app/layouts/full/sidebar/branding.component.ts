import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-branding',
  imports: [RouterModule, TablerIconsModule],
  template: `
    <a routerLink="/" class="app-brand">
      <span class="app-brand__icon bg-light-primary text-primary">
        <i-tabler name="building-store" class="icon-20 d-flex"></i-tabler>
      </span>
      <span class="app-brand__name">MarketPlace</span>
    </a>
  `,
})
export class BrandingComponent {
  options = this.settings.getOptions();
  constructor(private settings: CoreService) {}
}
