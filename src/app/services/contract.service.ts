import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NgIf } from '@angular/common';

export interface UploadResponse {
  content: string;
  collection_name: string;
}

export interface UploadProgress {
  progress: number;
  content?: string;
  collection_name?: string;
}

export interface AnalysisRequest {
  content: string;
  type: string;
  collection_name?: string;
  custom_query?: string;
}

export interface AnalysisResult {
  status: string;
  result?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  uploadDocument(file: File): Observable<UploadProgress> {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return throwError(() => new Error('File size exceeds 10MB limit'));
    }

    // Validate file type
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedTypes.includes(`.${fileExt}`)) {
      return throwError(() => new Error('Invalid file type. Allowed types: txt, pdf, doc, docx'));
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(
      `${this.apiUrl}/upload`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map(event => this.getUploadProgress(event)),
      catchError(this.handleError)
    );
  }

  analyzeDocument(
    content: string,
    analysisType: string,
    collectionName?: string,
    customQuery?: string
  ): Observable<AnalysisResult> {
    const request: AnalysisRequest = {
      content,
      type: analysisType,
      collection_name: collectionName,
      custom_query: customQuery
    };

    return this.http.post<AnalysisResult>(
      `${this.apiUrl}/analyze`,
      request
    ).pipe(
      catchError(this.handleError)
    );
  }

  private getUploadProgress(event: HttpEvent<UploadResponse>): UploadProgress {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        const progress = event.total
          ? Math.round(100 * event.loaded / event.total)
          : 0;
        return { progress };
      
      case HttpEventType.Response:
        if (event.body) {
          return {
            progress: 100,
            content: event.body.content,
            collection_name: event.body.collection_name
          };
        }
        return { progress: 100 };
      
      default:
        return { progress: 0 };
    }
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to the server. Please check if the server is running.';
          break;
        case 413:
          errorMessage = 'File size is too large. Maximum size is 10MB.';
          break;
        case 415:
          errorMessage = 'Invalid file type. Allowed types: txt, pdf, doc, docx';
          break;
        case 500:
          errorMessage = error.error?.detail || 'Server error occurred';
          break;
        default:
          errorMessage = `Error: ${error.error?.detail || error.message}`;
      }
    }

    console.error('API Error:', {
      status: error.status,
      message: errorMessage,
      error: error
    });

    return throwError(() => new Error(errorMessage));
  }
}