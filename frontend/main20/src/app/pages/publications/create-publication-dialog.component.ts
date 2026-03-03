import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { UploadService } from '../../services/upload.service';
import { PublicationService } from '../../services/publication.service';
import { TokenService, StoredUser } from '../../services/token.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-create-publication-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    FormsModule,
    TablerIconsModule,
    MatTooltipModule,
  ],
  animations: [
    trigger('staggerIn', [
      transition(':enter', [
        query(
          '.preview-card',
          [
            style({ opacity: 0, transform: 'scale(0.8)' }),
            stagger(50, [
              animate(
                '200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                style({ opacity: 1, transform: 'scale(1)' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
  template: `
    <div class="dialog-wrapper">
      <!-- Loading Overlay -->
      <div class="publish-overlay" *ngIf="isPublishing">
        <div class="loader-content">
          <div class="spinner-premium"></div>
          <span class="mt-3 fs-6 fw-bold text-white">Publication en cours...</span>
        </div>
      </div>

      <div class="dialog-header px-4 py-3 d-flex justify-content-between align-items-center">
        <h2 class="m-0 fw-800 fs-4 header-title">Créer un post</h2>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn-ghost">
          <i-tabler name="x" class="icon-24"></i-tabler>
        </button>
      </div>

      <mat-dialog-content class="dialog-main px-4 py-2">
        <!-- Profile Header -->
        <div class="d-flex align-items-center gap-3 mb-4 mt-2">
          <div class="avatar-wrapper">
            <img
              [src]="user?.avatar || 'assets/images/profile/user-1.jpg'"
              class="user-avatar-main"
              alt=""
            />
          </div>
          <div>
            <div class="fw-700 fs-5 text-dark">{{ user?.nom }} {{ user?.prenom }}</div>
            <div class="audience-badge">
              <i-tabler name="world" class="icon-14 me-1"></i-tabler>
              Public
              <i-tabler name="chevron-down" class="icon-12 ms-1"></i-tabler>
            </div>
          </div>
        </div>

        <div class="editor-container">
          <textarea
            matInput
            rows="6"
            [(ngModel)]="contenu"
            placeholder="De quoi voulez-vous discuter ?"
            class="premium-textarea"
            [disabled]="isPublishing"
          ></textarea>
        </div>

        <!-- Media Grid Preview -->
        <div class="media-preview-container mt-3 mb-2" [@staggerIn] *ngIf="medias.length > 0">
          <div *ngFor="let url of medias; let i = index" class="preview-card glass-card">
            <div class="media-wrapper">
              <img [src]="url" class="preview-media" *ngIf="isImage(url)" />
              <video [src]="url" class="preview-media" *ngIf="isVideo(url)" muted></video>
              <div class="video-overlay" *ngIf="isVideo(url)">
                <i-tabler name="player-play" class="icon-24 text-white"></i-tabler>
              </div>
            </div>
            <button class="remove-media-btn" (click)="removeMedia(i)" [disabled]="isPublishing">
              <i-tabler name="x" class="icon-16"></i-tabler>
            </button>
          </div>
        </div>

        <!-- Upload Progress indicator -->
        <div class="upload-progress-container mt-3" *ngIf="uploading">
          <div class="d-flex justify-content-between mb-1">
            <span class="text-xs fw-600 text-primary">Téléchargement du média...</span>
            <span class="text-xs fw-600 text-primary">{{ uploadProgress }}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="uploadProgress"></div>
          </div>
        </div>
      </mat-dialog-content>

      <div class="dialog-footer p-4">
        <div
          class="attachment-bar d-flex align-items-center justify-content-between p-3 mb-4 rounded-xl border-dashed"
        >
          <span class="fw-700 text-secondary fs-sm">Ajouter à votre post</span>
          <div class="d-flex gap-2">
            <input
              type="file"
              #mediaInput
              hidden
              (change)="onFileSelected($event)"
              accept="image/*,video/*"
            />
            <button
              class="tool-btn image-tool"
              matTooltip="Photo"
              (click)="mediaInput.click()"
              [disabled]="uploading || isPublishing"
            >
              <i-tabler name="photo" class="icon-24"></i-tabler>
            </button>
            <button
              class="tool-btn video-tool"
              matTooltip="Vidéo"
              (click)="mediaInput.click()"
              [disabled]="uploading || isPublishing"
            >
              <i-tabler name="video" class="icon-24"></i-tabler>
            </button>
            <button
              class="tool-btn more-tool"
              matTooltip="Plus"
              (click)="showPlanning = !showPlanning"
            >
              <i-tabler
                name="calendar-time"
                class="icon-24"
                [class.text-primary]="showPlanning"
              ></i-tabler>
            </button>
          </div>
        </div>

        <div class="planning-section mt-3 p-3 bg-light rounded-xl" *ngIf="showPlanning">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="fs-xs fw-700 text-secondary mb-1">Planifier la publication</label>
              <input
                type="datetime-local"
                class="form-control premium-input-date"
                [(ngModel)]="scheduledAt"
              />
            </div>
            <div class="col-md-6">
              <label class="fs-xs fw-700 text-secondary mb-1">Date d'expiration (optionnel)</label>
              <input
                type="datetime-local"
                class="form-control premium-input-date"
                [(ngModel)]="expiresAt"
              />
            </div>
          </div>
        </div>

        <button
          class="w-100 premium-publish-btn mt-4"
          [disabled]="(!contenu.trim() && medias.length === 0) || uploading || isPublishing"
          (click)="submit()"
        >
          <span *ngIf="!isPublishing">Publier maintenant</span>
          <span *ngIf="isPublishing" class="d-flex align-items-center gap-2">
            <span class="dots-loader"></span>
            Traitement...
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

      .dialog-wrapper {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: #ffffff;
        max-width: 600px;
        min-width: 500px;
        border-radius: 20px;
        overflow: hidden;
        position: relative;
      }

      .fw-700 {
        font-weight: 700;
      }
      .fw-800 {
        font-weight: 800;
      }

      .publish-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(8px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .spinner-premium {
        width: 48px;
        height: 48px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-left-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .header-title {
        color: #0f172a;
        letter-spacing: -0.5px;
      }

      .close-btn-ghost {
        color: #64748b;
        background: #f1f5f9;
        border-radius: 12px;
        transition: all 0.2s ease;
        &:hover {
          background: #e2e8f0;
          color: #0f172a;
          transform: rotate(90deg);
        }
      }

      .user-avatar-main {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        object-fit: cover;
        border: 2px solid #fff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .audience-badge {
        display: inline-flex;
        align-items: center;
        background: #f1f5f9;
        color: #475569;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        margin-top: 4px;
        cursor: pointer;
      }

      .premium-textarea {
        width: 100%;
        border: none !important;
        font-size: 18px;
        line-height: 1.6;
        color: #1e293b;
        background: transparent;
        resize: none;
        font-family: inherit;
        &:focus {
          outline: none;
        }
        &::placeholder {
          color: #94a3b8;
        }
      }

      .media-preview-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
      }

      .preview-card {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        aspect-ratio: 1;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.1);

        .media-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .preview-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-media-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 10px;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          &:hover {
            background: #fff;
            transform: scale(1.1);
          }
        }
      }

      .border-dashed {
        border: 2px dashed #e2e8f0;
        background: #f8fafc;
      }

      .rounded-xl {
        border-radius: 16px;
      }

      .tool-btn {
        width: 44px;
        height: 44px;
        border: none;
        background: transparent;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        cursor: pointer;

        &.image-tool {
          color: #10b981;
          &:hover {
            background: #ecfdf5;
          }
        }
        &.video-tool {
          color: #3b82f6;
          &:hover {
            background: #eff6ff;
          }
        }
        &.tag-tool {
          color: #f59e0b;
          &:hover {
            background: #fffbeb;
          }
        }
        &.more-tool {
          color: #64748b;
          &:hover {
            background: #f1f5f9;
          }
        }
      }

      .premium-publish-btn {
        background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
        color: white;
        border: none;
        padding: 16px;
        border-radius: 14px;
        font-weight: 800;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);

        &:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4);
        }

        &:active {
          transform: translateY(0);
        }

        &:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          box-shadow: none;
          cursor: not-allowed;
        }
      }

      .progress-track {
        height: 6px;
        background: #f1f5f9;
        border-radius: 10px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: #3b82f6;
        transition: width 0.3s ease;
      }

      .text-xs {
        font-size: 12px;
      }
      .icon-24 {
        width: 24px;
        height: 24px;
      }
      .icon-16 {
        width: 16px;
        height: 16px;
      }
      .icon-14 {
        width: 14px;
        height: 14px;
      }
      .icon-12 {
        width: 12px;
        height: 12px;
      }

      .dots-loader {
        display: inline-block;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: currentColor;
        box-shadow:
          8px 0 currentColor,
          -8px 0 currentColor;
        animation: dots 1s ease-in-out infinite;
        margin-right: 8px;
      }

      @keyframes dots {
        50% {
          opacity: 0.3;
        }
      }
      .premium-input-date {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 8px 12px;
        font-size: 14px;
        &:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
      }
    `,
  ],
})
export class CreatePublicationDialogComponent implements OnInit {
  contenu = '';
  medias: string[] = [];
  uploading = false;
  isPublishing = false;
  uploadProgress = 0;
  user: StoredUser | null = null;
  showPlanning = false;
  scheduledAt: string | null = null;
  expiresAt: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<CreatePublicationDialogComponent>,
    private uploadService: UploadService,
    private publicationService: PublicationService,
    private tokenService: TokenService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.user = this.tokenService.getUser();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Size check (e.g. 100MB)
    if (file.size > 100 * 1024 * 1024) {
      this.showError('Le fichier est trop volumineux (max 100Mo)');
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;

    this.uploadService.uploadMedia(file, 'publications').subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          const body = event.body as any;
          if (body && body.data && body.data.url) {
            this.medias.push(body.data.url);
          }
          this.uploading = false;
        }
      },
      error: (err) => {
        this.uploading = false;
        this.showError('Erreur lors du téléchargement du média');
        console.error('Upload error', err);
      },
    });
  }

  removeMedia(index: number) {
    this.medias.splice(index, 1);
  }

  isImage(url: string) {
    const path = url.toLowerCase();
    return (
      path.includes('/image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp'].some((ext) => path.split('?')[0].endsWith('.' + ext))
    );
  }

  isVideo(url: string) {
    const path = url.toLowerCase();
    return (
      path.includes('/video/') ||
      ['mp4', 'mov', 'webm', 'avi'].some((ext) => path.split('?')[0].endsWith('.' + ext))
    );
  }

  submit() {
    if (!this.contenu.trim() && this.medias.length === 0) return;

    this.isPublishing = true;
    this.publicationService
      .create({
        contenu: this.contenu.trim(),
        medias: this.medias,
        scheduledAt: this.scheduledAt,
        expiresAt: this.expiresAt,
      })
      .subscribe({
        next: (res) => {
          this.isPublishing = false;
          this.snackBar.open('Publication partagée !', 'Fermer', { duration: 3000 });
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.isPublishing = false;
          this.showError('Impossible de publier. Veuillez réessayer.');
          console.error('Submit error', err);
        },
      });
  }

  private showError(msg: string) {
    this.snackBar.open(msg, 'Fermer', { duration: 5000, panelClass: ['error-snackbar'] });
  }
}
