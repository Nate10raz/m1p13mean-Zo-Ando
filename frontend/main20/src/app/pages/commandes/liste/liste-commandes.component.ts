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
      default:
        return 'primary';
    }
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').toUpperCase();
  }
}
