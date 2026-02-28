import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { MaterialModule } from 'src/app/material.module';
import { BoutiqueService, Boutique } from 'src/app/services/boutique.service';
import { AuthService } from 'src/app/services/auth.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { UploadService } from 'src/app/services/upload.service';

@Component({
  selector: 'app-boutique-informations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, TablerIconsModule, MatDialogModule],
  templateUrl: './informations.component.html',
  styleUrls: ['./informations.component.scss'],
})
export class BoutiqueInformationsComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = false;
  isSaving = false;
  boutique: Boutique | null = null;
  isOwner = false;
  private sub = new Subscription();

  jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  constructor(
    private fb: FormBuilder,
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private uploadService: UploadService,
  ) {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      telephone: [''],
      email: ['', [Validators.email]],
      logo: [''],
      banner: [''],
      horaires: this.fb.array([]),
      plage_livraison_boutique: this.fb.array([]),
      clickCollectActif: [false],
      accepteLivraisonJourJ: [false],
    });
  }

  get horairesFormArray() {
    return this.form.get('horaires') as FormArray;
  }

  get livraisonFormArray() {
    return this.form.get('plage_livraison_boutique') as FormArray;
  }

  get isCustomer(): boolean {
    const role = this.authService.getCurrentRole();
    return role !== 'admin' && !this.isOwner;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBoutique(id);
    } else {
      // Unid route is only for boutique owners
      const isBoutique = this.authService.getCurrentRole() === 'boutique';
      if (isBoutique) {
        this.loadMyBoutique();
      } else {
        this.router.navigate(['/404']);
      }
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadBoutique(id: string): void {
    this.isLoading = true;
    this.sub.add(
      this.boutiqueService
        .getBoutiqueById(id)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (res) => {
            if (res.data) {
              this.boutique = res.data;
              this.checkOwnership();
              this.patchForm(res.data);
            }
          },
          error: (err) => {
            this.router.navigate(['/404']);
          },
        }),
    );
  }

  loadMyBoutique(): void {
    this.isLoading = true;
    this.sub.add(
      this.boutiqueService
        .getMyBoutique()
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (res) => {
            if (res.data) {
              this.boutique = res.data;
              this.isOwner = true;
              this.patchForm(res.data);
            }
          },
          error: (err) => {
            this.router.navigate(['/404']);
          },
        }),
    );
  }

  checkOwnership(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId && this.boutique) {
      this.isOwner = userId === this.boutique.userId;
    } else {
      this.isOwner = false;
    }

    if (!this.isOwner) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  onFileSelected(event: any, target: 'logo' | 'banner'): void {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    this.sub.add(
      this.uploadService.uploadImage(file, 'boutiques').subscribe({
        next: (res) => {
          if (res.data?.url) {
            this.form.get(target)?.setValue(res.data.url);
            this.form.markAsDirty();
            this.snackBar.open(
              `${target === 'logo' ? 'Logo' : 'Bannière'} mise à jour temporairement. N'oubliez pas d'enregistrer !`,
              'OK',
              { duration: 3000 },
            );
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open("Erreur lors de l'upload de l'image", 'Fermer', { duration: 3000 });
        },
      }),
    );
  }

  patchForm(boutique: Boutique): void {
    this.form.patchValue({
      nom: boutique.nom,
      description: boutique.description,
      telephone: boutique.telephone,
      email: boutique.email,
      logo: boutique.logo,
      banner: boutique.banner,
      clickCollectActif: boutique.clickCollectActif,
      accepteLivraisonJourJ: boutique.accepteLivraisonJourJ,
    });

    // Clear and fill horaires
    this.horairesFormArray.clear();
    if (boutique.horaires && boutique.horaires.length > 0) {
      boutique.horaires.forEach((h) => this.addHoraire(h));
    } else if (this.isOwner) {
      // Initialize with default days ONLY if owner
      this.jours.forEach((jour) => {
        this.addHoraire({ jour: jour as any, ouverture: '08:00', fermeture: '18:00' });
      });
    }

    if (!this.isOwner) {
      this.form.disable();
    }

    // Fill delivery slots
    this.livraisonFormArray.clear();
    if (boutique.plage_livraison_boutique && boutique.plage_livraison_boutique.length > 0) {
      boutique.plage_livraison_boutique.forEach((plage) => this.addPlageLivraison(plage));
    }

    this.form.markAsPristine();
  }

  getHoraireControlsForDay(jour: string) {
    return this.horairesFormArray.controls
      .map((control, index) => ({ control: control as FormGroup, index }))
      .filter((item) => item.control.get('jour')?.value === jour);
  }

  addHoraire(hOrDay?: any): void {
    let jour = '';
    let ouverture = '08:00';
    let fermeture = '12:00'; // Default morning

    if (typeof hOrDay === 'string') {
      jour = hOrDay;
      const existing = this.getHoraireControlsForDay(jour);
      if (existing.length > 0) {
        // Find the latest end time
        const latestEnd = existing.reduce((max, item) => {
          const end = item.control.get('fermeture')?.value;
          return this.timeToNumber(end) > this.timeToNumber(max) ? end : max;
        }, '12:00');

        // Suggest 2 hours after the latest end
        const [h, m] = latestEnd.split(':').map(Number);
        const nextH = Math.min(h + 2, 23);
        ouverture = `${String(nextH).padStart(2, '0')}:00`;
        fermeture = `${String(Math.min(nextH + 2, 23)).padStart(2, '0')}:59`;
      }
    } else if (hOrDay) {
      jour = hOrDay.jour;
      ouverture = hOrDay.ouverture;
      fermeture = hOrDay.fermeture;
    }

    const group = this.fb.group({
      jour: [jour, Validators.required],
      ouverture: [ouverture, Validators.required],
      fermeture: [fermeture, Validators.required],
    });

    if (!this.isOwner) {
      group.disable();
    }

    this.horairesFormArray.push(group);
    this.form.markAsDirty();
  }

  checkOverlap(jour: string): void {
    const slots = this.getHoraireControlsForDay(jour);
    if (slots.length < 2) return;

    // Find any two slots that overlap
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const s1 = slots[i];
        const s2 = slots[j];

        const start1 = s1.control.get('ouverture')?.value;
        const end1 = s1.control.get('fermeture')?.value;
        const start2 = s2.control.get('ouverture')?.value;
        const end2 = s2.control.get('fermeture')?.value;

        if (this.isOverlapping(start1, end1, start2, end2)) {
          const minStart = this.minTime(start1, start2);
          const maxEnd = this.maxTime(end1, end2);

          const dialogRef = this.dialog.open(ConfirmMergeDialogComponent, {
            width: '400px',
            data: { jour, minStart, maxEnd },
          });

          dialogRef.afterClosed().subscribe((result) => {
            if (result) {
              // Merge: update slot i and remove slot j
              s1.control.patchValue({ ouverture: minStart, fermeture: maxEnd });
              this.removeHoraire(s2.index);
              // After merge, check again as this merge might overlap with others
              setTimeout(() => this.checkOverlap(jour), 100);
            } else {
              // If they don't want to merge, we should probably revert or remove the one that was just added/edited
              // For simplicity, we remove the "second" one (j) which is usually the one being worked on
              this.removeHoraire(s2.index);
            }
          });
          return; // Stop after finding first conflict and showing dialog
        }
      }
    }
  }

  private isOverlapping(s1: string, e1: string, s2: string, e2: string): boolean {
    const start1 = this.timeToNumber(s1);
    const end1 = this.timeToNumber(e1);
    const start2 = this.timeToNumber(s2);
    const end2 = this.timeToNumber(e2);

    return start1 < end2 && start2 < end1;
  }

  private timeToNumber(time: string): number {
    if (!time) return 0;
    return parseInt(time.replace(':', ''), 10);
  }

  private minTime(t1: string, t2: string): string {
    return this.timeToNumber(t1) < this.timeToNumber(t2) ? t1 : t2;
  }

  private maxTime(t1: string, t2: string): string {
    return this.timeToNumber(t1) > this.timeToNumber(t2) ? t1 : t2;
  }

  removeHoraire(index: number): void {
    if (this.isOwner) {
      this.horairesFormArray.removeAt(index);
      this.form.markAsDirty();
    }
  }

  cancel(): void {
    if (this.boutique) {
      this.patchForm(this.boutique);
    }
  }

  save(): void {
    if (this.form.invalid || !this.isOwner || !this.boutique?._id) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const data = this.form.value;

    this.sub.add(
      this.boutiqueService
        .updateBoutique(this.boutique._id, data)
        .pipe(finalize(() => (this.isSaving = false)))
        .subscribe({
          next: (res) => {
            this.snackBar.open('Paramètres enregistrés avec succès', 'Fermer', {
              duration: 3000,
            });
            if (res.data) {
              this.boutique = res.data;
              this.form.markAsPristine();
            }
          },
          error: (err) => {
            this.snackBar.open(err?.error?.message || 'Erreur lors de l’enregistrement', 'Fermer', {
              duration: 4000,
            });
          },
        }),
    );
  }

  addPlageLivraison(pOrDay?: any): void {
    let jour = '';
    let ouverture = '08:00';
    let fermeture = '20:00';
    let maxLivraison = 5;

    if (typeof pOrDay === 'string') {
      jour = pOrDay;
    } else if (pOrDay) {
      jour = pOrDay.jour;
      ouverture = pOrDay.ouverture;
      fermeture = pOrDay.fermeture;
      maxLivraison = pOrDay.maxLivraison || 5;
    }

    const group = this.fb.group({
      jour: [jour, Validators.required],
      ouverture: [ouverture, Validators.required],
      fermeture: [fermeture, Validators.required],
      maxLivraison: [maxLivraison, [Validators.required, Validators.min(1)]],
    });

    if (!this.isOwner) {
      group.disable();
    }

    this.livraisonFormArray.push(group);
    this.form.markAsDirty();
  }

  removePlageLivraison(index: number): void {
    if (this.isOwner) {
      this.livraisonFormArray.removeAt(index);
      this.form.markAsDirty();
    }
  }

  getLivraisonControlsForDay(jour: string) {
    return this.livraisonFormArray.controls
      .map((control, index) => ({ control: control as FormGroup, index }))
      .filter((item) => item.control.get('jour')?.value === jour);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

@Component({
  selector: 'app-confirm-merge-dialog',
  standalone: true,
  imports: [MaterialModule, CommonModule],
  template: `
    <h2 mat-dialog-title class="f-w-600 f-s-18">Chevauchement d'horaires</h2>
    <div mat-dialog-content>
      <p>
        Les plages horaires pour le <strong>{{ data.jour | titlecase }}</strong> se chevauchent.
      </p>
      <p class="m-t-16">Voulez-vous les fusionner en une seule plage ?</p>
      <div class="bg-light p-12 rounded m-t-8 border text-center">
        <span class="f-w-600 text-primary">{{ data.minStart }}</span>
        <span class="m-x-8">-</span>
        <span class="f-w-600 text-primary">{{ data.maxEnd }}</span>
      </div>
    </div>
    <div mat-dialog-actions align="end" class="p-b-16 p-r-16">
      <button mat-button [mat-dialog-close]="false">Non, annuler</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="true">Oui, fusionner</button>
    </div>
  `,
})
export class ConfirmMergeDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
