import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CartService } from 'src/app/services/cart.service';
import { CommandeService } from 'src/app/services/commande.service';
import { BoutiqueService } from 'src/app/services/boutique.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, TablerIconsModule, RouterModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  cartItems$ = this.cartService.cart$;
  totalPrice = 0;
  totalItems = 0;

  // Rule checks
  boutiqueCount = 0;
  allFromSameBoutique = false;
  boutiqueAllowsDelivery = false;
  boutiqueDeliveryFee: { montant: number; type: 'fixe' | 'pourcentage' } = {
    montant: 0,
    type: 'fixe',
  };
  marketDeliveryFee: { montant: number; type: 'fixe' | 'pourcentage' } = {
    montant: 0,
    type: 'fixe',
  }; // Value as assumed previously

  // Added for availability checks
  allBoutiques: any[] = [];
  supermarketClosures: any[] = [];
  minDate = new Date();

  deliveryOptions = [
    {
      id: 'collect',
      label: 'Retrait en magasin (Market Repo)',
      fee: 0,
      description: 'Gratuit - Récupérez votre commande au point de retrait',
    },
    {
      id: 'livraison_supermarche',
      label: 'Livraison par le supermarche',
      fee: this.marketDeliveryFee,
      description: 'Livraison standard par notre équipe logistique',
    },
    {
      id: 'livraison_boutique',
      label: 'Livraison par la boutique',
      fee: 0,
      description: 'Utilise le service de livraison propre à la boutique',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private commandeService: CommandeService,
    private boutiqueService: BoutiqueService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.checkoutForm = this.fb.group({
      typedelivery: ['collect', Validators.required],
      adresseLivraison: [''], // Not required initially as default is 'collect'
      dateDeliveryOrAbleCollect: ['', Validators.required],
      paiementMethode: ['especes', Validators.required],
      note: [''],
    });
  }

  ngOnInit(): void {
    this.boutiqueService.getMarketplaceFee().subscribe((res) => {
      if (res.data) {
        this.marketDeliveryFee = {
          montant: res.data.montant,
          type: res.data.type || 'fixe',
        };
      }
    });

    this.boutiqueService.getSupermarketClosures().subscribe((res) => {
      if (res.data) this.supermarketClosures = res.data;
    });

    this.cartService.cart$.subscribe((cart) => {
      if (!cart || !cart.items) {
        this.totalItems = 0;
        this.totalPrice = 0;
        this.boutiqueCount = 0;
        this.allFromSameBoutique = false;
        return;
      }

      const items = cart.items;
      this.totalItems = items.reduce((sum, item) => sum + item.quantite, 0);
      this.totalPrice = items.reduce((sum, item) => sum + item.prixUnitaire * item.quantite, 0);

      const uniqueBoutiqueIds = [
        ...new Set(
          items.map((i) => {
            if (typeof i.boutiqueId === 'object' && i.boutiqueId && i.boutiqueId._id) {
              return i.boutiqueId._id;
            }
            return i.boutiqueId;
          }),
        ),
      ];
      this.boutiqueCount = uniqueBoutiqueIds.length;
      this.allFromSameBoutique = this.boutiqueCount === 1;

      // Fetch ALL involved boutiques to check their common availability
      this.allBoutiques = [];
      if (items.length > 0) {
        const firstBoutiqueRef = items[0].boutiqueId;
        const firstBoutiqueId =
          typeof firstBoutiqueRef === 'object' && firstBoutiqueRef
            ? firstBoutiqueRef._id
            : firstBoutiqueRef;

        uniqueBoutiqueIds.forEach((id) => {
          this.boutiqueService.getBoutiqueById(id).subscribe((res) => {
            if (res.data) {
              this.allBoutiques.push(res.data);
              if (id === firstBoutiqueId) {
                this.boutiqueAllowsDelivery = res.data.livraisonStatus || false;
                if (res.data.fraisLivraisonData) {
                  this.boutiqueDeliveryFee = res.data.fraisLivraisonData;
                } else {
                  this.boutiqueDeliveryFee = {
                    montant: res.data.fraisLivraison || 0,
                    type: 'fixe',
                  };
                }
              }
            }
          });
        });
      }
    });

    // Toggle address requirement based on delivery type
    this.checkoutForm.get('typedelivery')?.valueChanges.subscribe((val) => {
      if (val === 'collect') {
        this.checkoutForm.get('adresseLivraison')?.clearValidators();
      } else {
        this.checkoutForm.get('adresseLivraison')?.setValidators([Validators.required]);
      }
      this.checkoutForm.get('adresseLivraison')?.updateValueAndValidity();
    });
  }

  get finalTotal(): number {
    return this.totalPrice + this.currentFee;
  }

  get currentFee(): number {
    const selectedType = this.checkoutForm.get('typedelivery')?.value;
    if (selectedType === 'livraison_supermarche') {
      return this.marketDeliveryFee.type === 'pourcentage'
        ? (this.totalPrice * this.marketDeliveryFee.montant) / 100
        : this.marketDeliveryFee.montant;
    }
    if (selectedType === 'livraison_boutique') {
      return this.boutiqueDeliveryFee.type === 'pourcentage'
        ? (this.totalPrice * this.boutiqueDeliveryFee.montant) / 100
        : this.boutiqueDeliveryFee.montant;
    }
    return 0;
  }

  getOptionFee(optionId: string): number {
    if (optionId === 'livraison_supermarche') {
      return this.marketDeliveryFee.type === 'pourcentage'
        ? (this.totalPrice * this.marketDeliveryFee.montant) / 100
        : this.marketDeliveryFee.montant;
    }
    if (optionId === 'livraison_boutique') {
      return this.boutiqueDeliveryFee.type === 'pourcentage'
        ? (this.totalPrice * this.boutiqueDeliveryFee.montant) / 100
        : this.boutiqueDeliveryFee.montant;
    }
    return 0;
  }

  getOptionDescription(option: any): string {
    if (option.id === 'livraison_supermarche' && this.marketDeliveryFee.type === 'pourcentage') {
      return `+ ${this.marketDeliveryFee.montant}% du total`;
    }
    if (option.id === 'livraison_boutique' && this.boutiqueDeliveryFee.type === 'pourcentage') {
      return `+ ${this.boutiqueDeliveryFee.montant}% du total`;
    }
    return option.description;
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) return;

    const dateVal = this.checkoutForm.get('dateDeliveryOrAbleCollect')?.value;
    const selectedType = this.checkoutForm.get('typedelivery')?.value;

    if (!this.checkDateAvailability(dateVal, selectedType)) {
      return;
    }

    this.commandeService.createCommande(this.checkoutForm.value).subscribe({
      next: (res) => {
        this.snackBar.open('Commande passée avec succès !', 'Fermer', { duration: 3000 });
        this.router.navigate(['/commandes/mes-commandes']);
      },
      error: (err) => {
        this.snackBar.open(err.error.message || 'Erreur lors de la commande', 'Fermer', {
          duration: 5000,
        });
      },
    });
  }

  private checkDateAvailability(dateStr: string, type: string): boolean {
    const date = new Date(dateStr);

    if (this.isAvailableOn(date, type)) {
      return true;
    }

    // Find next available date
    const nextDate = this.findNextAvailableDate(date, type);
    let nextDateMsg = '';
    if (nextDate) {
      const formattedDate = nextDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      nextDateMsg = ` Prochaine disponibilité : ${formattedDate}.`;
    }

    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const day = dayNames[date.getDay()];

    const today = new Date();
    const isJourJ =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    if (isJourJ && type !== 'livraison_boutique') {
      this.snackBar.open(
        `La livraison pour aujourd'hui n'est possible qu'en livraison directe par boutique.${nextDateMsg}`,
        'Fermer',
        {
          duration: 6000,
        },
      );
      return false;
    }

    if (isJourJ && type === 'livraison_boutique') {
      const boutique = this.allBoutiques[0];
      if (!boutique || !boutique.accepteLivraisonJourJ) {
        this.snackBar.open(
          `Cette boutique n'accepte pas les livraisons pour aujourd'hui.${nextDateMsg}`,
          'Fermer',
          {
            duration: 6000,
          },
        );
        return false;
      }
    }

    // Determine specific reason for notification
    if (type === 'livraison_supermarche' || type === 'collect') {
      if (this.isDateInClosures(date, this.supermarketClosures)) {
        this.snackBar.open(`Le supermarché est fermé à cette date.${nextDateMsg}`, 'Fermer', {
          duration: 6000,
        });
        return false;
      }
    }

    if (type === 'collect') {
      const allEnabled = this.allBoutiques.every((b) => b.clickCollectActif);
      if (!allEnabled) {
        this.snackBar.open(
          "Le retrait en magasin n'est pas disponible pour toutes les boutiques de votre panier.",
          'Fermer',
          { duration: 4000 },
        );
        return false;
      }

      const allOpen = this.allBoutiques.every(
        (b) =>
          this.isStoreOpenOnDay(b, day) && !this.isDateInClosures(date, b.fermeureBoutique || []),
      );
      if (!allOpen) {
        this.snackBar.open(
          `Une ou plusieurs boutiques sont fermées à cette date.${nextDateMsg}`,
          'Fermer',
          { duration: 6000 },
        );
        return false;
      }
    }

    if (type === 'livraison_boutique') {
      const boutique = this.allBoutiques[0];
      if (
        !this.isStoreOpenOnDay(boutique, day) ||
        this.isDateInClosures(date, boutique.fermeureBoutique || [])
      ) {
        this.snackBar.open(`La boutique est fermée à cette date.${nextDateMsg}`, 'Fermer', {
          duration: 6000,
        });
        return false;
      }
    }

    return false;
  }

  private isAvailableOn(date: Date, type: string): boolean {
    const today = new Date();
    const isJourJ =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    if (isJourJ) {
      if (type !== 'livraison_boutique') return false;
      const boutique = this.allBoutiques[0];
      if (!boutique || !boutique.accepteLivraisonJourJ) return false;
    }

    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const day = dayNames[date.getDay()];

    // 1. Check Supermarket Closures
    if (type === 'livraison_supermarche' || type === 'collect') {
      if (this.isDateInClosures(date, this.supermarketClosures)) return false;
    }

    // 2. Click & Collect requirements
    if (type === 'collect') {
      const allEnabled = this.allBoutiques.every((b) => b.clickCollectActif);
      if (!allEnabled) return false;

      const allOpen = this.allBoutiques.every(
        (b) =>
          this.isStoreOpenOnDay(b, day) && !this.isDateInClosures(date, b.fermeureBoutique || []),
      );
      if (!allOpen) return false;
    }

    // 3. Boutique Delivery
    if (type === 'livraison_boutique') {
      const boutique = this.allBoutiques[0];
      if (!boutique) return false;
      if (
        !this.isStoreOpenOnDay(boutique, day) ||
        this.isDateInClosures(date, boutique.fermeureBoutique || [])
      )
        return false;
    }

    return true;
  }

  private findNextAvailableDate(startDate: Date, type: string): Date | null {
    let current = new Date(startDate);
    // Look ahead 60 days
    for (let i = 0; i < 60; i++) {
      current.setDate(current.getDate() + 1);
      if (this.isAvailableOn(current, type)) return new Date(current);
    }
    return null;
  }

  private isDateInClosures(date: Date, closures: any[]): boolean {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return (closures || []).some((c) => {
      const start = new Date(c.debut);
      const end = new Date(c.fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });
  }

  private isStoreOpenOnDay(boutique: any, day: string): boolean {
    return (boutique.horaires || []).some((h: any) => h.jour === day);
  }
}
