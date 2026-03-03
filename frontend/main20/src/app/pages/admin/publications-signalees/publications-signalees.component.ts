import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { PublicationService, Publication } from 'src/app/services/publication.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from 'src/app/components/confirm-dialog/confirm-dialog.component';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

@Component({
  selector: 'app-publications-signalees',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  templateUrl: './publications-signalees.component.html',
  styleUrls: ['./publications-signalees.component.scss'],
})
export class PublicationsSignaleesComponent implements OnInit {
  reportedPublications: Publication[] = [];
  isLoading = false;

  constructor(
    private publicationService: PublicationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadReported();
  }

  loadReported(): void {
    this.isLoading = true;
    this.publicationService.getReported().subscribe({
      next: (res) => {
        this.reportedPublications = res;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des signalements', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  deletePublication(pubId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Supprimer la publication',
        message: 'Êtes-vous sûr de vouloir supprimer cette publication signalée ?',
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.publicationService.delete(pubId).subscribe({
          next: () => {
            this.reportedPublications = this.reportedPublications.filter((p) => p._id !== pubId);
            this.snackBar.open('Publication supprimée', 'Fermer', { duration: 3000 });
          },
          error: () => {
            this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
          },
        });
      }
    });
  }

  dismissReports(pubId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Ignorer les signalements',
        message: 'Voulez-vous vraiment ignorer les signalements pour cette publication ?',
        confirmText: 'Ignorer',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.publicationService.dismissReports(pubId).subscribe({
          next: () => {
            this.reportedPublications = this.reportedPublications.filter((p) => p._id !== pubId);
            this.snackBar.open('Signalements ignorés avec succès', 'Fermer', { duration: 3000 });
          },
          error: () => {
            this.snackBar.open("Erreur lors de l'action", 'Fermer', { duration: 3000 });
          },
        });
      }
    });
  }

  formatDate(date: string): string {
    if (!date) return '';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
  }

  getAuthorName(pub: Publication): string {
    return pub.boutiqueId?.nom || `${pub.adminId?.prenom} ${pub.adminId?.nom}` || 'Auteur inconnu';
  }

  isImage(url: string): boolean {
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
  }

  isVideo(url: string): boolean {
    return url.match(/\.(mp4|webm|ogg)$/) != null;
  }
}
