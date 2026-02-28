import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './star-rating.component.html',
  styles: [
    `
      .text-rating {
        color: #ffc107 !important;
      }
    `,
  ],
})
export class StarRatingComponent {
  @Input() rating: number = 0;
  @Input() count?: number;
  @Input() size: number = 18;
  @Input() showNumber: boolean = true;

  get stars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  getIconName(star: number): string {
    if (this.rating >= star) {
      return 'star';
    } else if (this.rating >= star - 0.5) {
      return 'star_half';
    } else {
      return 'star_outline';
    }
  }
}
