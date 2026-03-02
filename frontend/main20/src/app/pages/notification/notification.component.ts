import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notification, NotificationService } from '../../services/notification.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css'],
})
export class NotificationComponent implements OnInit {
  notifications: Notification[] = [];
  loading = false;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.fetchNotifications();
  }

  fetchNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching notifications:', err);
        this.loading = false;
      },
    });
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe({
      next: (updatedNotification) => {
        // Update local state
        const index = this.notifications.findIndex((n) => n._id === id);
        if (index !== -1) {
          this.notifications[index] = {
            ...this.notifications[index],
            lu: true,
            lueAt: updatedNotification.lueAt,
          };
          this.notificationService.refresh(); // Sync global count
        }
      },
      error: (err) => {
        console.error('Error marking as read:', err);
      },
    });
  }

  deleteNotification(id: string): void {
    if (confirm('Voulez-vous supprimer cette notification ?')) {
      this.notificationService.deleteNotification(id).subscribe({
        next: () => {
          this.notifications = this.notifications.filter((n) => n._id !== id);
          this.notificationService.refresh(); // Refresh total count
        },
        error: (err) => {
          console.error('Error deleting notification:', err);
        },
      });
    }
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.lu).length;
  }
}
