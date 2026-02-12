import { Injectable, computed, signal } from '@angular/core';

interface JwtPayload {
  exp?: number;
  role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private accessTokenSignal = signal<string | null>(null);
  private roleSignal = computed(() => {
    const token = this.accessTokenSignal();
    if (!token) {
      return null;
    }

    const payload = this.decodeToken(token);
    return payload?.role ?? null;
  });

  setAccessToken(token: string): void {
    this.accessTokenSignal.set(token);
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  clearAccessToken(): void {
    this.accessTokenSignal.set(null);
  }

  getRole(): string | null {
    return this.roleSignal();
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
