import { Injectable, computed, signal } from '@angular/core';

interface JwtPayload {
  exp?: number;
  role?: string;
  sub?: string;
}

export interface StoredUser {
  _id?: string;
  boutiqueId?: string;
  role?: string;
  email?: string;
  nom?: string;
  prenom?: string;
  avatar?: string;
  googleId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly TOKEN_KEY = 'marketplace_access_token';
  private readonly USER_KEY = 'marketplace_user';

  private accessTokenSignal = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  public userSignal = signal<StoredUser | null>(this.getStoredUser());
  private roleSignal = computed(() => {
    const token = this.accessTokenSignal();
    if (!token) {
      return null;
    }

    const payload = this.decodeToken(token);
    return payload?.role ?? null;
  });
  private userIdSignal = computed(() => {
    const token = this.accessTokenSignal();
    if (!token) {
      return null;
    }

    const payload = this.decodeToken(token);
    return payload?.sub ?? null;
  });

  setAccessToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.accessTokenSignal.set(token);
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal() || localStorage.getItem(this.TOKEN_KEY);
  }

  clearAccessToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.accessTokenSignal.set(null);
  }

  setUser(user: StoredUser | null): void {
    if (user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.USER_KEY);
    }
    this.userSignal.set(user);
  }

  getUser(): StoredUser | null {
    return this.userSignal();
  }

  clearUser(): void {
    localStorage.removeItem(this.USER_KEY);
    this.userSignal.set(null);
  }

  private getStoredUser(): StoredUser | null {
    const user = localStorage.getItem(this.USER_KEY);
    if (!user) return null;
    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  }

  getRole(): string | null {
    return this.roleSignal();
  }

  getUserId(): string | null {
    return this.userIdSignal();
  }

  isAccessTokenExpired(token?: string | null): boolean {
    const value = token ?? this.accessTokenSignal();
    if (!value) {
      return true;
    }

    const payload = this.decodeToken(value);
    if (!payload?.exp) {
      return true;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSeconds;
  }

  private decodeToken(token: string): JwtPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  }
}
