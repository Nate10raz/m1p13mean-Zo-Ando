import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface PromptDialogData {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  initialValue?: string;
}

@Component({
  selector: 'app-prompt-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <div class="prompt-dialog-premium p-2">
      <h2 mat-dialog-title class="fw-700">{{ data.title }}</h2>
      <mat-dialog-content>
        <p class="message-text text-secondary mb-3">{{ data.message }}</p>
        <mat-form-field appearance="outline" class="w-100 premium-field">
          <mat-label>{{ data.placeholder || 'Saisir ici...' }}</mat-label>
          <textarea matInput [(ngModel)]="result" rows="4"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="gap-2 pb-3 pe-3">
        <button mat-button class="rounded-pill px-4" (click)="onCancel()">
          {{ data.cancelText || 'Annuler' }}
        </button>
        <button
          mat-flat-button
          color="primary"
          class="rounded-pill px-4 shadow-sm"
          [disabled]="!result.trim()"
          (click)="onConfirm()"
        >
          {{ data.confirmText || 'Valider' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .prompt-dialog-premium {
        border-radius: 16px;
      }
      .fw-700 {
        font-weight: 700;
      }
      mat-dialog-title {
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #0f172a;
        font-size: 1.25rem;
      }
      mat-dialog-content {
        min-width: 450px;
        padding: 8px 24px 16px !important;
      }
      .message-text {
        font-size: 15px;
        line-height: 1.6;
      }
      .text-secondary {
        color: #64748b;
      }
      .premium-field {
        margin-top: 8px;
        ::ng-deep .mat-mdc-text-field-wrapper {
          background-color: #f8fafc !important;
        }
      }
      .gap-2 {
        gap: 8px;
      }
    `,
  ],
})
export class PromptDialogComponent {
  result: string = '';

  constructor(
    public dialogRef: MatDialogRef<PromptDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PromptDialogData,
  ) {
    this.result = data.initialValue || '';
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    this.dialogRef.close(this.result);
  }
}
