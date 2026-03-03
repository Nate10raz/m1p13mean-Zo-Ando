import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PublicationService, Publication, Commentaire } from '../../services/publication.service';
import { AuthService } from '../../services/auth.service';
import { CreatePublicationDialogComponent } from './create-publication-dialog.component';
import { StoredUser } from '../../services/token.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

@Component({
  selector: 'app-publications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    MatMenuModule,
  ],
  templateUrl: './publications.component.html',
  styleUrls: ['./publications.component.scss'],
})
export class PublicationsComponent implements OnInit {
  publications: Publication[] = [];
  page = 1;
  loading = false;
  hasMore = true;
  user: StoredUser | null = null;
  canPublish = false;
  searchQuery = '';
  private searchSubject = new Subject<string>();

  @ViewChild('scrollEnd') scrollEnd!: ElementRef;

  constructor(
    private publicationService: PublicationService,
    private authService: AuthService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.authService.user$.subscribe((user: StoredUser | null) => {
      this.user = user;
      this.canPublish = user?.role === 'admin' || user?.role === 'boutique';
      this.loadFeed(true);
    });

    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((query) => {
      this.searchQuery = query;
      this.loadFeed(true);
    });

    this.setupIntersectionObserver();
  }

  onSearch(event: any) {
    this.searchSubject.next(event.target.value);
  }

  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loading && this.hasMore) {
        this.loadFeed();
      }
    }, options);

    // Give it a bit of time to make sure the view is rendered
    setTimeout(() => {
      if (this.scrollEnd) {
        observer.observe(this.scrollEnd.nativeElement);
      }
    }, 1000);
  }

  loadFeed(reset = false) {
    if (this.loading) return;
    if (reset) {
      this.page = 1;
      this.publications = [];
      this.hasMore = true;
    }

    this.loading = true;
    this.publicationService.getFeed(this.page, 10, this.searchQuery).subscribe({
      next: (data) => {
        if (data.length === 0) {
          this.hasMore = false;
        } else {
          // Check for likes locally
          const updated = data.map((p) => ({
            ...p,
            isLiked: this.user ? p.likes.includes(this.user._id || '') : false,
          }));
          this.publications = [...this.publications, ...updated];
          this.page++;

          // Intersection observer logic: track seen
          this.trackSeen(updated);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  trackSeen(newPubs: Publication[]) {
    if (!this.user) return;
    newPubs.forEach((pub) => {
      this.publicationService.markSeen(pub._id).subscribe();
    });
  }

  toggleLike(pub: Publication) {
    if (!this.user) return; // Open login dialog?

    this.publicationService.toggleLike(pub._id).subscribe({
      next: (res) => {
        pub.likes = res.likes;
        pub.likesCount = res.likesCount;
        pub.isLiked = this.user ? pub.likes.includes(this.user._id || '') : false;
      },
    });
  }

  formatDate(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
  }

  openCreateModal() {
    const dialogRef = this.dialog.open(CreatePublicationDialogComponent, {
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.publications.unshift({
          ...result,
          isLiked: false,
        });
      }
    });
  }

  isImage(url: string): boolean {
    if (!url) return false;
    const path = url.toLowerCase();
    return (
      path.includes('/image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp'].some((ext) => path.split('?')[0].endsWith('.' + ext))
    );
  }

  isVideo(url: string): boolean {
    if (!url) return false;
    const path = url.toLowerCase();
    return (
      path.includes('/video/') ||
      ['mp4', 'mov', 'webm', 'avi'].some((ext) => path.split('?')[0].endsWith('.' + ext))
    );
  }

  getAuthorName(pub: Publication) {
    if (pub.roleAuteur === 'boutique' && pub.boutiqueId) {
      return (pub.boutiqueId as any).nom || 'Boutique';
    }
    if (pub.adminId) {
      const admin = pub.adminId as any;
      if (admin.nom) return admin.nom + ' ' + (admin.prenom || '');
    }
    return 'Administrateur';
  }

  getAuthorAvatar(pub: Publication) {
    if (pub.roleAuteur === 'boutique' && pub.boutiqueId) {
      return (pub.boutiqueId as any).logo || 'assets/images/profile/user-1.jpg';
    }
    if (pub.adminId) {
      return (pub.adminId as any).avatar || 'assets/images/profile/user-1.jpg';
    }
    return 'assets/images/profile/user-1.jpg';
  }

  commentValue: { [key: string]: string } = {};
  showComments: { [key: string]: boolean } = {};
  comments: { [key: string]: Commentaire[] } = {};

  toggleComments(pubId: string) {
    this.showComments[pubId] = !this.showComments[pubId];
    if (this.showComments[pubId] && !this.comments[pubId]) {
      this.loadComments(pubId);
    }
  }

  loadComments(pubId: string) {
    this.publicationService.getComments(pubId).subscribe((res) => {
      this.comments[pubId] = res;
    });
  }

  addComment(pubId: string) {
    const content = this.commentValue[pubId];
    if (!content || !this.user) return;

    this.publicationService.addComment(pubId, content).subscribe((res) => {
      if (!this.comments[pubId]) this.comments[pubId] = [];
      this.comments[pubId].unshift(res);
      this.commentValue[pubId] = '';
    });
  }

  deletePub(pubId: string) {
    if (confirm('Voulez-vous vraiment supprimer cette publication ?')) {
      this.publicationService.delete(pubId).subscribe(() => {
        this.publications = this.publications.filter((p) => p._id !== pubId);
      });
    }
  }

  canDelete(pub: Publication): boolean {
    if (!this.user) return false;
    if (this.user.role === 'admin') return true;
    if (this.user.role === 'boutique' && pub.boutiqueId?._id === this.user._id) return true;
    // userId and user._id are slightly different in storage sometimes
    if (this.user.role === 'boutique' && pub.boutiqueId?._id === this.user.boutiqueId) return true;
    return false;
  }
}
