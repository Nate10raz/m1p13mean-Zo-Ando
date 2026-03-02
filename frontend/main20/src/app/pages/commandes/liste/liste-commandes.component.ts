import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommandeService, Commande } from 'src/app/services/commande.service';

@Component({
  selector: 'app-liste-commandes',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule, RouterModule],
  templateUrl: './liste-commandes.component.html',
  styleUrls: ['./liste-commandes.component.scss'],
})
export class ListeCommandesComponent implements OnInit {
  commandes: Commande[] = [];
  loading = true;

  constructor(private commandeService: CommandeService) {}

  ngOnInit(): void {
    this.fetchCommandes();
  }

  fetchCommandes(): void {
    this.loading = true;
    this.commandeService.getMyCommandes().subscribe({
      next: (res) => {
        this.commandes = res.data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching commandes', err);
        this.loading = false;
      },
    });
  }

  getStatusColor(status: string): string {
    if (!status) return 'primary';
    switch (status) {
      case 'en_preparation':
        return 'primary';
      case 'en_livraison':
        return 'accent';
      case 'peut_etre_collecte':
      case 'pret_a_collecte':
        return 'success';
      case 'annulee':
      case 'non_acceptee':
        return 'danger';
      case 'en_attente_validation':
        return 'warning';
      case 'livree':
      case 'terminee':
        return 'success';
      default:
        return 'primary';
    }
  }

  getStatusLabel(status: string): string {
    if (!status) return 'INCONNU';
    const labels: { [key: string]: string } = {
      en_attente_validation: 'En attente',
      en_preparation: 'En préparation',
      peut_etre_collecte: 'Prêt au retrait',
      pret_a_collecte: 'Prêt au retrait',
      en_livraison: 'En livraison',
      terminee: 'Terminée',
      livree: 'Livrée',
      annulee: 'Annulée',
      non_acceptee: 'Refusée',
    };
    return labels[status] || status.replace(/_/g, ' ').toUpperCase();
  }
}
