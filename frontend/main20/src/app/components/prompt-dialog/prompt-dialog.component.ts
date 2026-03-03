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
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="m-b-16">{{ data.message }}</p>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>{{ data.placeholder || 'Saisir ici...' }}</mat-label>
        <textarea matInput [(ngModel)]="result" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{ data.cancelText || 'Annuler' }}</button>
      <button mat-flat-button color="primary" [disabled]="!result.trim()" (click)="onConfirm()">
        {{ data.confirmText || 'Valider' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      mat-dialog-content {
        min-width: 400px;
        padding: 20px 0;
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
