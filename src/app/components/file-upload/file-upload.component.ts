import { Component, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ContractService } from '../../services/contract.service';

interface ProcessedDocument {
  content: string;
  collectionName: string;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  template: `
    <div class="upload-container">
      <h2>Upload Contract Document</h2>
      <div 
        class="drop-zone" 
        (dragover)="onDragOver($event)" 
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        [class.drag-over]="isDragging"
        [class.uploading]="isUploading">
        <input 
          #fileInput 
          type="file" 
          (change)="onFileSelected($event)" 
          accept=".pdf,.doc,.docx,.txt"
          [attr.aria-label]="'Choose a contract document to upload'"
          style="display: none">
        <button 
          (click)="fileInput.click()"
          [disabled]="isUploading"
          aria-label="Choose file to upload">
          Choose File
        </button>
        <p>or drag and drop your file here</p>
        @if (selectedFile) {
          <p class="selected-file">
            Selected: {{ selectedFile.name }}
            <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
          </p>
        }
      </div>
      @if (isUploading) {
        <div class="progress-container">
          <div class="progress-bar" role="progressbar" [attr.aria-valuenow]="uploadProgress">
            <div [style.width.%]="uploadProgress"></div>
          </div>
          <p class="progress-text">{{ uploadProgress }}% uploaded</p>
        </div>
      }
      @if (errorMessage) {
        <div class="error-message" role="alert">
          <p>{{ errorMessage }}</p>
          <button 
            class="retry-button" 
            (click)="retryUpload()"
            aria-label="Retry upload">
            Retry
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .upload-container {
      padding: 2rem;
      text-align: center;
    }
    
    h2 {
      color: #1976D2;
      margin-bottom: 1.5rem;
      font-size: 1.75rem;
    }
    
    .drop-zone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 2rem;
      margin: 1rem 0;
      transition: all 0.3s ease;
      background: #f8f9fa;
      
      &.drag-over {
        border-color: #2196F3;
        background: rgba(33, 150, 243, 0.1);
      }
      
      &.uploading {
        opacity: 0.7;
        pointer-events: none;
      }
    }
    
    button {
      padding: 0.75rem 1.5rem;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 1rem;

      &:hover:not(:disabled) {
        background: #1976D2;
        transform: translateY(-1px);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }
      
      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    }
    
    .progress-container {
      margin-top: 1rem;
    }
    
    .progress-bar {
      width: 100%;
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    
    .progress-bar > div {
      height: 100%;
      background: #2196F3;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      color: #666;
      font-size: 0.875rem;
    }
    
    .error-message {
      color: #f44336;
      margin-top: 1rem;
      padding: 0.75rem;
      background: #ffebee;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .retry-button {
      background: #f44336;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      
      &:hover {
        background: #d32f2f;
      }
    }

    .selected-file {
      margin-top: 1rem;
      color: #2196F3;
      font-weight: 500;
      
      .file-size {
        color: #666;
        font-weight: normal;
        margin-left: 0.5rem;
      }
    }
  `]
})
export class FileUploadComponent {
  @Output() documentProcessed = new EventEmitter<ProcessedDocument>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  isDragging = false;
  isUploading = false;
  uploadProgress = 0;
  errorMessage?: string;
  selectedFile?: File;

  constructor(private contractService: ContractService) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  retryUpload(): void {
    if (this.selectedFile) {
      this.handleFile(this.selectedFile);
    }
  }

  private handleFile(file: File): void {
    this.selectedFile = file;
    this.errorMessage = undefined;
    this.isUploading = true;
    this.uploadProgress = 0;
  
    this.contractService.uploadDocument(file).subscribe({
      next: (progress) => {
        this.uploadProgress = progress.progress;
        
        // Check if upload is complete and we have the response data
        if (progress.progress === 100 && progress.content && progress.collection_name) {
          this.documentProcessed.emit({
            content: progress.content,
            collectionName: progress.collection_name
          });
          this.isUploading = false;
        }
      },
      error: (error) => {
        this.errorMessage = error.message;
        this.isUploading = false;
        this.uploadProgress = 0;
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 413) {
      return 'File is too large. Please choose a smaller file.';
    }
    if (error.status === 415) {
      return 'Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.';
    }
    return error.message || 'Failed to upload file. Please try again.';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}