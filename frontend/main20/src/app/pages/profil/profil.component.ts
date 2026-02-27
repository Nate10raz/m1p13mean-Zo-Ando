import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Subscription } from 'rxjs';
import { TablerIconsModule } from 'angular-tabler-icons';

import { MaterialModule } from 'src/app/material.module';
import { Boutique, BoutiqueHoraire, BoutiquePlageLivraison, BoutiqueService } from 'src/app/services/boutique.service';
import {
  UserService,
  UserMeData,
  NotificationPreference,
  UpdateMePayload,
} from 'src/app/services/user.service';

type NotificationMode = {
  key: string;
  label: string;
  active: boolean;
};

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, TablerIconsModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss'],
})
export class ProfilComponent implements OnInit, OnDestroy {
  isLoading = false;
  isSaving = false;
  isEditing = false;
  isLoadingBoutique = false;
  isSavingBoutique = false;
  isEditingBoutique = false;
  errorMessage = '';
  boutiqueErrorMessage = '';
  profile: UserMeData | null = null;
  boutiqueDetails: Boutique | null = null;
  editForm: FormGroup;
  boutiqueForm: FormGroup;
  jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  private sub = new Subscription();

  constructor(
    private userService: UserService,
    private boutiqueService: BoutiqueService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
  ) {
    this.editForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.pattern(/^[+]?\d{7,15}$/)]],
      avatar: [''],
      adresseLivraison: [''],
      preferences: this.fb.group({
        notifications: this.fb.group({
          email: [false],
          inApp: [false],
        }),
      }),
    });

    this.boutiqueForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      adresse: [''],
      telephone: ['', [Validators.pattern(/^[+]?\d{7,15}$/)]],
      email: ['', [Validators.email]],
      logo: [''],
      banner: [''],
      horaires: this.fb.array([]),
      clickCollectActif: [false],
      plage_livraison_boutique: this.fb.array([]),
      accepteLivraisonJourJ: [false],
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.sub.add(
      this.userService
        .getMe()
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (res) => {
            this.profile = res?.data ?? null;
            this.patchFormFromProfile();
            if (this.isBoutiqueUser) {
              this.loadMyBoutique();
            } else {
              this.boutiqueDetails = null;
              this.isEditingBoutique = false;
              this.boutiqueErrorMessage = '';
            }
          },
          error: (err) => {
            this.profile = null;
            this.errorMessage = err?.error?.message || 'Impossible de charger le profil.';
            this.boutiqueDetails = null;
            this.isEditingBoutique = false;
            this.boutiqueErrorMessage = '';
          },
        }),
    );
  }

  get user() {
    return this.profile?.user ?? null;
  }

  get boutique() {
    return this.profile?.boutique ?? null;
  }

  get boutiqueView() {
    return this.boutiqueDetails ?? this.boutique;
  }

  get panier() {
    return this.profile?.panier ?? null;
  }

  get isBoutiqueUser(): boolean {
    return (this.user?.role ?? '').toLowerCase() === 'boutique';
  }

  get boutiqueHoraires(): FormArray {
    return this.boutiqueForm.get('horaires') as FormArray;
  }

  get boutiquePlages(): FormArray {
    return this.boutiqueForm.get('plage_livraison_boutique') as FormArray;
  }

  get displayName(): string {
    const prenom = this.user?.prenom?.trim();
    const nom = this.user?.nom?.trim();
    const full = [prenom, nom].filter(Boolean).join(' ');
    return full || 'Profil utilisateur';
  }

  get roleLabel(): string {
    const role = this.user?.role?.toLowerCase().trim();
    if (role === 'admin') {
      return 'Administrateur';
    }
    if (role === 'boutique') {
      return 'Boutique';
    }
    if (role === 'client') {
      return 'Client';
    }
    return this.user?.role || '-';
  }

  get isClient(): boolean {
    return (this.user?.role ?? '').toLowerCase() === 'client';
  }

  get statusLabel(): string {
    const status = this.formatStatus(this.user?.status);
    if (status) {
      return status;
    }

    if (this.user?.isActive === undefined || this.user?.isActive === null) {
      return '-';
    }

    return this.user?.isActive ? 'Actif' : 'Inactif';
  }

  get statusToneClass(): string {
    const status = this.user?.status;
    if (status) {
      return status === 'active' ? 'chip-success' : 'chip-warn';
    }

    if (this.user?.isActive === undefined || this.user?.isActive === null) {
      return 'chip-muted';
    }

    return this.user?.isActive ? 'chip-success' : 'chip-warn';
  }

  get emailVerifiedLabel(): string {
    return this.user?.isEmailVerified ? 'Email verifie' : 'Email non verifie';
  }

  get notificationModes(): NotificationMode[] {
    const notifications = this.user?.preferences?.notifications as NotificationPreference | undefined;
    if (notifications === undefined || notifications === null) {
      return [];
    }

    if (typeof notifications === 'boolean') {
      return [
        {
          key: 'all',
          label: 'Notifications',
          active: notifications,
        },
      ];
    }

    return [
      {
        key: 'email',
        label: 'Email',
        active: Boolean(notifications.email),
      },
      {
        key: 'inApp',
        label: 'In-app',
        active: Boolean(notifications.inApp),
      },
    ];
  }

  startEdit(): void {
    if (!this.profile) {
      return;
    }
    this.isEditing = true;
    this.patchFormFromProfile();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.patchFormFromProfile();
  }

  save(): void {
    if (this.editForm.invalid || this.isSaving) {
      this.editForm.markAllAsTouched();
      return;
    }

    const payload = this.buildUpdatePayload();
    if (!Object.keys(payload).length) {
      this.snackBar.open('Aucune modification a enregistrer', 'Fermer', { duration: 2500 });
      return;
    }
    this.isSaving = true;

    this.sub.add(
      this.userService
        .updateMe(payload)
        .pipe(finalize(() => (this.isSaving = false)))
        .subscribe({
          next: () => {
            this.isEditing = false;
            this.snackBar.open('Profil mis a jour', 'Fermer', { duration: 3000 });
            this.loadProfile();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.message || 'Erreur lors de la mise a jour', 'Fermer', {
              duration: 4000,
            });
          },
        }),
    );
  }

  startEditBoutique(): void {
    const boutique = this.boutiqueDetails ?? (this.boutiqueView as Boutique | null);
    if (!boutique) {
      return;
    }
    this.isEditingBoutique = true;
    this.patchBoutiqueForm(boutique);
  }

  cancelEditBoutique(): void {
    this.isEditingBoutique = false;
    if (this.boutiqueDetails) {
      this.patchBoutiqueForm(this.boutiqueDetails);
    }
  }

  saveBoutique(): void {
    if (this.boutiqueForm.invalid || this.isSavingBoutique) {
      this.boutiqueForm.markAllAsTouched();
      return;
    }

    const payload = this.buildBoutiquePayload();
    if (!Object.keys(payload).length) {
      this.snackBar.open('Aucune modification a enregistrer', 'Fermer', { duration: 2500 });
      return;
    }

    this.isSavingBoutique = true;
    this.sub.add(
      this.boutiqueService
        .updateMyBoutique(payload)
        .pipe(finalize(() => (this.isSavingBoutique = false)))
        .subscribe({
          next: (res) => {
            this.isEditingBoutique = false;
            this.snackBar.open('Boutique mise a jour', 'Fermer', { duration: 3000 });
            const data = res?.data ?? null;
            if (data) {
              this.boutiqueDetails = data;
              if (this.profile) {
                this.profile = { ...this.profile, boutique: data };
              }
              this.patchBoutiqueForm(data);
            }
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || 'Erreur lors de la mise a jour de la boutique',
              'Fermer',
              { duration: 4000 },
            );
          },
        }),
    );
  }

  formatStatus(status?: string | null): string {
    if (!status) {
      return '';
    }

    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspendue':
        return 'Suspendu';
      case 'en_attente':
        return 'En attente';
      case 'rejetee':
        return 'Rejete';
      default:
        return status;
    }
  }

  formatBoolean(value?: boolean | null): string {
    if (value === undefined || value === null) {
      return '-';
    }
    return value ? 'Oui' : 'Non';
  }

  addBoutiqueHoraire(h?: Partial<BoutiqueHoraire>): void {
    const group = this.fb.group({
      jour: [h?.jour ?? 'lundi', Validators.required],
      ouverture: [h?.ouverture ?? '08:00', Validators.required],
      fermeture: [h?.fermeture ?? '18:00', Validators.required],
    });

    this.boutiqueHoraires.push(group);
    this.boutiqueHoraires.markAsDirty();
  }

  removeBoutiqueHoraire(index: number): void {
    this.boutiqueHoraires.removeAt(index);
    this.boutiqueHoraires.markAsDirty();
  }

  addBoutiquePlage(plage?: Partial<BoutiquePlageLivraison>): void {
    const group = this.fb.group({
      jour: [plage?.jour ?? 'lundi', Validators.required],
      ouverture: [plage?.ouverture ?? '08:00', Validators.required],
      fermeture: [plage?.fermeture ?? '18:00', Validators.required],
      maxLivraison: [plage?.maxLivraison ?? 0, [Validators.required, Validators.min(0)]],
    });

    this.boutiquePlages.push(group);
    this.boutiquePlages.markAsDirty();
  }

  removeBoutiquePlage(index: number): void {
    this.boutiquePlages.removeAt(index);
    this.boutiquePlages.markAsDirty();
  }

  private patchFormFromProfile(): void {
    const user = this.profile?.user;
    if (!user) {
      return;
    }

    const notificationDefaults = this.resolveNotificationValues(user.preferences?.notifications);

    this.editForm.patchValue({
      nom: user.nom ?? '',
      prenom: user.prenom ?? '',
      telephone: user.telephone ?? '',
      avatar: user.avatar ?? '',
      adresseLivraison: user.adresseLivraison ?? '',
      preferences: {
        notifications: {
          email: notificationDefaults.email,
          inApp: notificationDefaults.inApp,
        },
      },
    });

    this.editForm.markAsPristine();
  }

  private loadMyBoutique(): void {
    if (!this.isBoutiqueUser) {
      return;
    }

    this.isLoadingBoutique = true;
    this.boutiqueErrorMessage = '';

    this.sub.add(
      this.boutiqueService
        .getMyBoutique()
        .pipe(finalize(() => (this.isLoadingBoutique = false)))
        .subscribe({
          next: (res) => {
            const data = res?.data ?? null;
            this.boutiqueDetails = data;
            if (this.profile && data) {
              this.profile = { ...this.profile, boutique: data };
            }
            if (data && !this.isEditingBoutique) {
              this.patchBoutiqueForm(data);
            }
          },
          error: (err) => {
            this.boutiqueDetails = null;
            this.boutiqueErrorMessage = err?.error?.message || 'Impossible de charger la boutique.';
          },
        }),
    );
  }

  private resolveNotificationValues(
    notifications: NotificationPreference | undefined,
  ): { email: boolean; inApp: boolean } {
    if (notifications === undefined || notifications === null) {
      return { email: false, inApp: false };
    }

    if (typeof notifications === 'boolean') {
      return { email: notifications, inApp: notifications };
    }

    return {
      email: Boolean(notifications.email),
      inApp: Boolean(notifications.inApp),
    };
  }

  private buildUpdatePayload(): UpdateMePayload {
    const formValue = this.editForm.getRawValue();
    const payload: UpdateMePayload = {};

    const nom = (formValue.nom ?? '').trim();
    if (this.editForm.get('nom')?.dirty && nom) {
      payload.nom = nom;
    }

    const prenom = (formValue.prenom ?? '').trim();
    if (this.editForm.get('prenom')?.dirty && prenom) {
      payload.prenom = prenom;
    }

    const telephone = (formValue.telephone ?? '').trim();
    if (this.editForm.get('telephone')?.dirty && telephone) {
      payload.telephone = telephone;
    }

    const avatar = (formValue.avatar ?? '').trim();
    if (this.editForm.get('avatar')?.dirty && avatar) {
      payload.avatar = avatar;
    }

    const adresseLivraison = (formValue.adresseLivraison ?? '').trim();
    if (this.isClient && this.editForm.get('adresseLivraison')?.dirty && adresseLivraison) {
      payload.adresseLivraison = adresseLivraison;
    }

    const notificationsGroup = this.editForm.get('preferences.notifications');
    if (notificationsGroup?.dirty) {
      payload.preferences = {
        notifications: {
          email: Boolean(formValue.preferences?.notifications?.email),
          inApp: Boolean(formValue.preferences?.notifications?.inApp),
        },
      };
    }

    return payload;
  }

  private patchBoutiqueForm(boutique: Boutique): void {
    this.boutiqueForm.patchValue({
      nom: boutique.nom ?? '',
      description: boutique.description ?? '',
      adresse: boutique.adresse ?? '',
      telephone: boutique.telephone ?? '',
      email: boutique.email ?? '',
      logo: boutique.logo ?? '',
      banner: boutique.banner ?? '',
      clickCollectActif: Boolean(boutique.clickCollectActif),
      accepteLivraisonJourJ: Boolean(boutique.accepteLivraisonJourJ),
    });

    this.boutiqueHoraires.clear();
    if (boutique.horaires && boutique.horaires.length) {
      boutique.horaires.forEach((h) => this.addBoutiqueHoraire(h));
    }

    this.boutiquePlages.clear();
    if (boutique.plage_livraison_boutique && boutique.plage_livraison_boutique.length) {
      boutique.plage_livraison_boutique.forEach((plage) => this.addBoutiquePlage(plage));
    }

    this.boutiqueForm.markAsPristine();
  }

  private buildBoutiquePayload(): Partial<Boutique> {
    const value = this.boutiqueForm.getRawValue();
    const payload: Partial<Boutique> = {};

    const nom = (value.nom ?? '').trim();
    if (this.boutiqueForm.get('nom')?.dirty && nom) {
      payload.nom = nom;
    }

    if (this.boutiqueForm.get('description')?.dirty) {
      payload.description = (value.description ?? '').trim();
    }

    if (this.boutiqueForm.get('adresse')?.dirty) {
      payload.adresse = (value.adresse ?? '').trim();
    }

    if (this.boutiqueForm.get('telephone')?.dirty) {
      payload.telephone = (value.telephone ?? '').trim();
    }

    if (this.boutiqueForm.get('email')?.dirty) {
      payload.email = (value.email ?? '').trim();
    }

    if (this.boutiqueForm.get('logo')?.dirty) {
      payload.logo = (value.logo ?? '').trim();
    }

    if (this.boutiqueForm.get('banner')?.dirty) {
      payload.banner = (value.banner ?? '').trim();
    }

    if (this.boutiqueForm.get('clickCollectActif')?.dirty) {
      payload.clickCollectActif = Boolean(value.clickCollectActif);
    }

    if (this.boutiqueForm.get('accepteLivraisonJourJ')?.dirty) {
      payload.accepteLivraisonJourJ = Boolean(value.accepteLivraisonJourJ);
    }

    if (this.boutiqueForm.get('horaires')?.dirty) {
      payload.horaires = (value.horaires ?? []).map((h: any) => ({
        jour: h?.jour ?? 'lundi',
        ouverture: h?.ouverture ?? '08:00',
        fermeture: h?.fermeture ?? '18:00',
      }));
    }

    if (this.boutiqueForm.get('plage_livraison_boutique')?.dirty) {
      payload.plage_livraison_boutique = (value.plage_livraison_boutique ?? []).map((plage: any) => ({
        jour: plage?.jour ?? 'lundi',
        ouverture: plage?.ouverture ?? '08:00',
        fermeture: plage?.fermeture ?? '18:00',
        maxLivraison: Number(plage?.maxLivraison ?? 0),
      }));
    }

    return payload;
  }
}
