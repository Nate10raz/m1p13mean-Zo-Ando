import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommandeService, Commande } from 'src/app/services/commande.service';
import { AuthService } from 'src/app/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-details-commande',
    standalone: true,
    imports: [CommonModule, MaterialModule, TablerIconsModule, RouterModule],
    templateUrl: './details-commande.component.html',
    styleUrls: ['./details-commande.component.scss'],
})
export class DetailsCommandeComponent implements OnInit {
    commande: Commande | null = null;
    loading = true;
    userRole: string | null = null;
    boutiqueId: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private commandeService: CommandeService,
        private authService: AuthService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        this.userRole = this.authService.getCurrentRole();
        this.boutiqueId = this.authService.getCurrentBoutiqueId();
        if (id) {
            this.fetchDetails(id);
        }
    }

    fetchDetails(id: string): void {
        this.loading = true;
        this.commandeService.getCommandeById(id).subscribe({
            next: (res) => {
                this.commande = res.data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error fetching details', err);
                this.loading = false;
            },
        });
    }

    // --- ACTIONS ---

    onAcceptOrder(): void {
        if (!this.commande) return;
        this.commandeService.acceptOrder(this.commande._id).subscribe({
            next: () => {
                this.snackBar.open('Commande acceptée avec succès', 'Fermer', { duration: 3000 });
                this.fetchDetails(this.commande!._id);
            },
            error: (err) => this.snackBar.open('Erreur: ' + (err.error?.message || 'Inconnue'), 'Fermer')
        });
    }

    onMarkDepot(): void {
        if (!this.commande) return;
        this.commandeService.markDepot(this.commande._id).subscribe({
            next: () => {
                this.snackBar.open('Dépôt marqué avec succès', 'Fermer', { duration: 3000 });
                this.fetchDetails(this.commande!._id);
            },
            error: (err) => this.snackBar.open('Erreur: ' + (err.error?.message || 'Inconnue'), 'Fermer')
        });
    }

    onConfirmDepot(boutiqueId: string): void {
        if (!this.commande) return;
        this.commandeService.confirmDepot(this.commande._id, boutiqueId).subscribe({
            next: () => {
                this.snackBar.open('Réception à l\'entrepôt confirmée', 'Fermer', { duration: 3000 });
                this.fetchDetails(this.commande!._id);
            },
            error: (err) => this.snackBar.open('Erreur: ' + (err.error?.message || 'Inconnue'), 'Fermer')
        });
    }

    onCancelOrder(): void {
        const reason = prompt('Motif de l\'annulation :');
        if (!reason || !this.commande) return;

        this.commandeService.cancelOrder(this.commande._id, reason).subscribe({
            next: () => {
                this.snackBar.open('Commande annulée', 'Fermer', { duration: 3000 });
                this.fetchDetails(this.commande!._id);
            },
            error: (err) => this.snackBar.open('Erreur: ' + (err.error?.message || 'Inconnue'), 'Fermer')
        });
    }

    onCancelItem(shopId: string, item: any): void {
        const reason = prompt(`Motif de l'annulation pour ${item.nomProduit} :`);
        if (!reason || !this.commande) return;

        this.commandeService.cancelItem(this.commande._id, item.produitId, shopId, reason).subscribe({
            next: () => {
                this.snackBar.open('Produit annulé avec succès', 'Fermer', { duration: 3000 });
                this.fetchDetails(this.commande!._id);
            },
            error: (err) => {
                this.snackBar.open(err.error?.message || 'Erreur lors de l\'annulation', 'Fermer', { duration: 5000 });
            }
        });
    }

    onConfirmFinal(): void {
        if (!this.commande) return;
        this.commandeService.confirmFinal(this.commande._id).subscribe({
            next: () => {
                this.snackBar.open('Commande terminée !', 'Fermer', { duration: 3000 });
                this.fetchDetails(this.commande!._id);
            },
            error: (err) => this.snackBar.open('Erreur: ' + (err.error?.message || 'Inconnue'), 'Fermer')
        });
    }

    // --- UI HELPERS ---

    isOrderCancellable(): boolean {
        if (!this.commande || this.commande.statusLivraison === 'annulee' || this.commande.statusLivraison === 'livree') return false;

        // Admin can always cancel the whole order if not finished
        if (this.userRole === 'admin') return true;

        // Client can cancel the whole order only if no shop has validated depot yet
        if (this.userRole === 'client') {
            return !this.commande.boutiques.some(b => b.depotEntrepot?.dateValidation);
        }

        // Boutique can cancel its lot only if its own depot hasn't been validated yet
        if (this.userRole === 'boutique') {
            const myShop = this.commande.boutiques.find(b => b.boutiqueId === this.boutiqueId);
            return !!myShop && !myShop.depotEntrepot?.dateValidation && myShop.status !== 'annulee';
        }

        return false;
    }

    isItemCancellable(shop: any, item: any): boolean {
        if (!this.commande || this.commande.statusLivraison === 'annulee' || item.status === 'annulee') return false;

        // ONLY client and boutique can remove/cancel items
        if (this.userRole === 'client') {
            // Client can remove item if shop hasn't deposited yet
            return !shop.depotEntrepot?.dateValidation;
        }

        if (this.userRole === 'boutique') {
            // Boutique can cancel its own item if not deposited yet
            return shop.boutiqueId === this.boutiqueId && !shop.depotEntrepot?.dateValidation;
        }

        // Admin cannot cancel individual items
        return false;
    }


    getStatusColor(status: string): string {
        switch (status) {
            case 'en_preparation':
                return 'primary';
            case 'en_livraison':
                return 'accent';
            case 'peut_etre_collecte':
                return 'warn';
            case 'annulee':
                return 'danger';
            case 'pret_a_collecte':
                return 'success';
            case 'en_attente_validation':
                return 'warning';
            case 'livree':
                return 'success';
            default:
                return 'primary';
        }
    }

    getStatusLabel(status: string): string {
        return status.replace(/_/g, ' ').toUpperCase();
    }

    isBoutiqueAccepted(): boolean {
        if (!this.commande || !this.boutiqueId) return false;
        const b = this.commande.boutiques.find(x => x.boutiqueId === this.boutiqueId);
        return b?.estAccepte || false;
    }

    isBoutiqueDeposed(): boolean {
        if (!this.commande || !this.boutiqueId) return false;
        const b = this.commande.boutiques.find(x => x.boutiqueId === this.boutiqueId);
        return b?.depotEntrepot?.estFait || false;
    }

    getBoutiqueStatus(bId: string): string {
        const b = this.commande?.boutiques.find(x => x.boutiqueId === bId);
        return b?.status || 'en_attente';
    }

    calculateShopSubtotal(shop: any): number {
        if (!shop || !shop.items) return 0;
        return shop.items
            .filter((item: any) => item.status !== 'annulee')
            .reduce((sum: number, item: any) => sum + (item.prixUnitaire * item.quantite), 0);
    }
}

