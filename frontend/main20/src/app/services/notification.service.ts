import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  channel: string;
  emailStatus: string;
  titre: string;
  message: string;
  data?: any;
  lu: boolean;
  lueAt?: Date;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notification`;

  private _notifications$ = new BehaviorSubject<Notification[]>([]);
  readonly notifications$ = this._notifications$.asObservable();

  constructor(private http: HttpClient) {
    this.refresh();
  }

  refresh(): void {
    this.getNotifications().subscribe({
      next: (data) => this._notifications$.next(data),
      error: (err) => console.error('Failed to refresh notifications', err)
    });
  }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {});
  }
}
