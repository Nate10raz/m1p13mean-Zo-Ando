import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommandeService, Commande } from 'src/app/services/commande.service';
import { AuthService } from 'src/app/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-gestion-commande',
    standalone: true,
    imports: [CommonModule, MaterialModule, TablerIconsModule, RouterModule, FormsModule],
    templateUrl: './gestion-commande.component.html',
    styleUrls: ['./gestion-commande.component.scss'],
})
export class GestionCommandeComponent implements OnInit {
    commandes: Commande[] = [];
    loading = true;
    userRole: string | null = null;
    searchTerm: string = '';

    constructor(
        private commandeService: CommandeService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.userRole = this.authService.getCurrentRole();
        this.fetchCommandes();
    }

    fetchCommandes(): void {
        this.loading = true;
        const obs = this.userRole === 'admin'
            ? this.commandeService.getAllCommandes()
            : this.commandeService.getBoutiqueCommandes();

        obs.subscribe({
            next: (res) => {
                this.commandes = res.data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error fetching orders', err);
                this.loading = false;
            },
        });
    }

    get filteredCommandes(): Commande[] {
        if (!this.searchTerm) {
            return this.commandes;
        }
        const term = this.searchTerm.toLowerCase();
        return this.commandes.filter(c =>
            c.numeroCommande.toLowerCase().includes(term)
        );
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'en_preparation': return 'primary';
            case 'en_livraison': return 'accent';
            case 'peut_etre_collecte': return 'warn';
            case 'annulee': return 'danger';
            case 'pret_a_collecte': return 'success';
            case 'en_attente_validation': return 'warning';
            case 'livree': return 'success';
            default: return 'primary';
        }
    }

    getStatusLabel(status: string): string {
        return status.replace(/_/g, ' ').toUpperCase();
    }
}
