import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContractService } from '../../services/contract.service';
import { NgIf } from '@angular/common';

export interface AnalysisType {
  id: string;
  label: string;
  requiresCollection?: boolean;
  requiresQuery?: boolean;
}

@Component({
  selector: 'app-analysis-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="analysis-form">
      <h3>Analysis Options</h3>
      <div class="form-group">
        <label for="analysisType">Analysis Type:</label>
        <select 
          id="analysisType" 
          [(ngModel)]="selectedType"
          (change)="onTypeChange()"
          class="form-control"
          [attr.aria-label]="'Select analysis type'">
          @for (type of analysisTypes; track type.id) {
            <option [value]="type.id">{{ type.label }}</option>
          }
        </select>
      </div>

      @if (showCustomQuery) {
        <div class="form-group">
          <label for="customQuery">Custom Query:</label>
          <textarea 
            id="customQuery" 
            [(ngModel)]="customQuery"
            rows="3"
            class="form-control"
            placeholder="Enter your custom analysis query"
            [attr.aria-label]="'Enter custom analysis query'"></textarea>
        </div>
      }

      <button 
        (click)="startAnalysis()"
        [disabled]="!canStartAnalysis"
        class="btn-primary"
        [attr.aria-label]="getStartButtonLabel()">
        Start Analysis
      </button>

      @if (errorMessage) {
        <div class="error-message" role="alert">{{ errorMessage }}</div>
      }
    </div>
  `,
  styles: [`
    .analysis-form {
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    h3 {
      color: #1976D2;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #455a64;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        outline: none;
        border-color: #2196F3;
        box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
      }

      &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
      }
    }

    select.form-control {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23455a64' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      padding-right: 2.5rem;
      appearance: none;
    }

    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }

    .btn-primary {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;

      &:hover:not(:disabled) {
        background: #1976D2;
      }

      &:active:not(:disabled) {
        transform: translateY(1px);
      }

      &:disabled {
        background: #bdbdbd;
        cursor: not-allowed;
        transform: none;
        opacity: 0.7;
      }
    }

    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #ffebee;
      border-radius: 4px;
      color: #f44336;
      font-size: 0.875rem;
    }
  `]
})
export class AnalysisFormComponent {
  @Input() documentContent?: string;
  @Input() collectionName?: string;
  @Output() analysisStarted = new EventEmitter<void>();
  @Output() analysisCompleted = new EventEmitter<any>();
  @Output() analysisError = new EventEmitter<string>();

  readonly analysisTypes: AnalysisType[] = [
    { id: 'contract_review', label: 'Contract Review' },
    { id: 'information_extraction', label: 'Information Extraction', requiresCollection: true },
    { id: 'legal_research', label: 'Legal Research' },
    { id: 'risk_assessment', label: 'Risk Assessment' },
    { id: 'contract_summary', label: 'Contract Summary' },
    { id: 'custom_analysis', label: 'Custom Analysis', requiresQuery: true }
  ];

  selectedType = 'contract_review';
  customQuery = '';
  errorMessage?: string;

  constructor(private contractService: ContractService) {}

  get showCustomQuery(): boolean {
    return this.getCurrentAnalysisType()?.requiresQuery ?? false;
  }

  get canStartAnalysis(): boolean {
    const currentType = this.getCurrentAnalysisType();
    if (!currentType || !this.documentContent) return false;
    
    if (currentType.requiresCollection && !this.collectionName) return false;
    if (currentType.requiresQuery && !this.customQuery.trim()) return false;
    
    return true;
  }

  getStartButtonLabel(): string {
    if (!this.documentContent) return 'No document uploaded';
    if (!this.canStartAnalysis) return 'Please fill in all required fields';
    return 'Start Analysis';
  }

  onTypeChange() {
    this.errorMessage = undefined;
    if (!this.showCustomQuery) {
      this.customQuery = '';
    }
  }

  private getCurrentAnalysisType(): AnalysisType | undefined {
    return this.analysisTypes.find(type => type.id === this.selectedType);
  }

  startAnalysis() {
    if (!this.canStartAnalysis || !this.documentContent) {
      return;
    }

    this.errorMessage = undefined;
    this.analysisStarted.emit();

    const analysisType = this.getCurrentAnalysisType();
    if (!analysisType) return;

    this.contractService.analyzeDocument(
      this.documentContent,
      analysisType.id, // Use the id instead of label
      this.collectionName,
      this.customQuery || undefined
    ).subscribe({
      next: (result) => {
        if (result.error) {
          this.handleError(result.error);
        } else {
          this.analysisCompleted.emit(result);
        }
      },
      error: (error) => {
        this.handleError(error.message || 'Analysis failed. Please try again.');
      }
    });
  }

  private handleError(message: string) {
    this.errorMessage = message;
    this.analysisError.emit(message);
  }
}