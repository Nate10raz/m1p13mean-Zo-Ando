import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

type GoogleCredentialResponse = {
  credential?: string;
};

type RenderOptions = {
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin' | 'signup';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
};

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private loadingPromise?: Promise<void>;

  private loadScript(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      const existing = (window as any).google?.accounts?.id;
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity script'));
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  async renderButton(
    container: HTMLElement,
    onCredential: (credential: string) => void,
    options: RenderOptions = {},
  ): Promise<void> {
    if (!environment.googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID missing in environment');
    }

    await this.loadScript();

    const google = (window as any).google;
    if (!google?.accounts?.id) {
      throw new Error('Google Identity SDK not available');
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: GoogleCredentialResponse) => {
        if (response?.credential) {
          onCredential(response.credential);
        }
      },
      ux_mode: 'popup',
      auto_select: false,
    });

    container.innerHTML = '';
    google.accounts.id.renderButton(container, {
      theme: options.theme ?? 'outline',
      size: options.size ?? 'large',
      text: options.text ?? 'continue_with',
      shape: options.shape ?? 'pill',
      width: container.clientWidth || 280,
    });
  }
}
