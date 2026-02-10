import { Injectable } from '@angular/core';

interface JwtPayload {
  exp?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private accessToken: string | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  isAccessTokenExpired(token?: string | null): boolean {
    const value = token ?? this.accessToken;
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
