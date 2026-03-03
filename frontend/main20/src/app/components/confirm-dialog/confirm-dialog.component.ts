import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="confirm-dialog-premium">
      <h2 mat-dialog-title class="fw-700">{{ data.title }}</h2>
      <mat-dialog-content>
        <p class="message-text text-secondary">{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="gap-2 pb-3 pe-3">
        <button mat-button class="rounded-pill px-4" (click)="onCancel()">
          {{ data.cancelText || 'Annuler' }}
        </button>
        <button
          mat-flat-button
          color="primary"
          class="rounded-pill px-4 shadow-sm"
          (click)="onConfirm()"
        >
          {{ data.confirmText || 'Confirmer' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .confirm-dialog-premium {
        border-radius: 16px;
        overflow: hidden;
      }
      .fw-700 {
        font-weight: 700;
      }
      mat-dialog-title {
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #0f172a;
        font-size: 1.25rem;
        padding-top: 24px;
      }
      mat-dialog-content {
        min-width: 320px;
        padding: 8px 24px 24px !important;
      }
      .message-text {
        font-size: 15px;
        line-height: 1.6;
      }
      .text-secondary {
        color: #64748b;
      }
      .gap-2 {
        gap: 8px;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
