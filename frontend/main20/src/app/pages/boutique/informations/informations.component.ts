import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, finalize } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { MaterialModule } from 'src/app/material.module';
import { BoutiqueService, Boutique } from 'src/app/services/boutique.service';
import { AuthService } from 'src/app/services/auth.service';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-boutique-informations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, TablerIconsModule],
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
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      adresse: [''],
      telephone: ['', [Validators.pattern(/^[+]?\d{7,15}$/)]],
      email: ['', [Validators.email]],
      logo: [''],
      banner: [''],
      horaires: this.fb.array([]),
      clickCollectActif: [false],
      accepteLivraisonJourJ: [false],
    });
  }

  get horairesFormArray() {
    return this.form.get('horaires') as FormArray;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBoutique(id);
    } else {
      this.loadMyBoutique();
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
            this.snackBar.open(err?.error?.message || 'Erreur lors du chargement', 'Fermer', {
              duration: 3000,
            });
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
            this.snackBar.open(err?.error?.message || 'Erreur lors du chargement', 'Fermer', {
              duration: 3000,
            });
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

  patchForm(boutique: Boutique): void {
    this.form.patchValue({
      nom: boutique.nom,
      description: boutique.description,
      adresse: boutique.adresse,
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
  }

  addHoraire(h?: any): void {
    const group = this.fb.group({
      jour: [h?.jour || '', Validators.required],
      ouverture: [h?.ouverture || '08:00', Validators.required],
      fermeture: [h?.fermeture || '18:00', Validators.required],
    });

    if (!this.isOwner) {
      group.disable();
    }

    this.horairesFormArray.push(group);
  }

  removeHoraire(index: number): void {
    if (this.isOwner) {
      this.horairesFormArray.removeAt(index);
    }
  }

  save(): void {
    if (this.form.invalid || !this.isOwner || !this.boutique) {
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
}
