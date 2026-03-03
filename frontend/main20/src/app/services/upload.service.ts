import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private readonly apiRootUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadMedia(
    file: File,
    folder: string = 'general',
  ): Observable<HttpEvent<ApiResponse<{ url: string; publicId: string }>>> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);

    return this.http.post<ApiResponse<{ url: string; publicId: string }>>(
      `${this.apiRootUrl}/uploads/media`,
      formData,
      {
        reportProgress: true,
        observe: 'events',
      },
    );
  }

  // Backward compatibility
  uploadImage(file: File, folder: string = 'general') {
    return this.uploadMedia(file, folder);
  }
}
