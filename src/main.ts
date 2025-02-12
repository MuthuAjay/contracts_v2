import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadComponent } from './app/components/file-upload/file-upload.component';
import { AnalysisFormComponent } from './app/components/analysis-form/analysis-form.component';
import { AnalysisResultsComponent } from './app/components/analysis-results/analysis-results.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, // <-- Added here
    FileUploadComponent,
    AnalysisFormComponent,
    AnalysisResultsComponent
  ],
  template: `
    <div class="app-container">
      <header>
        <h1>Contract Analysis System</h1>
        <p class="subtitle">Upload and analyze your legal documents with AI assistance</p>
      </header>

      <main>
        <div class="card">
          <app-file-upload
            (documentProcessed)="onDocumentProcessed($event)"></app-file-upload>
        </div>
        
        <div class="card" *ngIf="documentContent">
          <app-analysis-form
            [documentContent]="documentContent"
            [collectionName]="collectionName"
            (analysisStarted)="onAnalysisStarted()"
            (analysisCompleted)="onAnalysisCompleted($event)"
            (analysisError)="onAnalysisError($event)">
          </app-analysis-form>
        </div>

        <div class="card" *ngIf="analyzing || error || results">
          <app-analysis-results
            [loading]="analyzing"
            [error]="error"
            [results]="results">
          </app-analysis-results>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
      padding: 2rem;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
      
      h1 {
        color: #1976D2;
        font-size: 2.5rem;
        font-weight: 700;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .subtitle {
        color: #546e7a;
        font-size: 1.1rem;
        margin-top: 0.5rem;
      }
    }

    main {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05),
                  0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: transform 0.2s;

      &:hover {
        transform: translateY(-2px);
      }
    }
  `]
})
export class App {
  documentContent?: string;
  collectionName?: string;
  analyzing = false;
  error?: string;
  results?: any;

  onDocumentProcessed(event: {content: string, collectionName: string}) {
    this.documentContent = event.content;
    this.collectionName = event.collectionName;
  }

  onAnalysisStarted() {
    this.analyzing = true;
    this.error = undefined;
    this.results = undefined;
  }

  onAnalysisCompleted(results: any) {
    this.analyzing = false;
    this.results = results;
  }

  onAnalysisError(error: string) {
    this.analyzing = false;
    this.error = error;
    this.results = undefined;
  }
}

bootstrapApplication(App, {
  providers: [
    importProvidersFrom(HttpClientModule)
  ]
});
