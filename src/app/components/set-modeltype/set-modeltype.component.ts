import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContractService } from '../../services/contract.service';

@Component({
  selector: 'app-set-modeltype',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './set-modeltype.component.html',
  styleUrls: ['./set-modeltype.component.css']
})
export class SetModelTypeComponent {
  modelTypeForm: FormGroup;
  responseMessage?: string;
  errorMessage?: string;
  modelTypes = ['LLAMA_3_1', 'LLAMA_3_3'];
  loading = false;

  @Output() modelTypeChanged = new EventEmitter<string>();

  constructor(
    private fb: FormBuilder,
    private contractService: ContractService
  ) {
    this.modelTypeForm = this.fb.group({
      modelType: ['', Validators.required]
    });
  }

  get modelTypeControl() {
    return this.modelTypeForm.get('modelType');
  }

  onSubmit() {
    if (this.modelTypeForm.valid) {
      this.loading = true;
      const modelType = this.modelTypeForm.value.modelType;
      
      this.contractService.setModelType(modelType)
        .subscribe({
          next: (response) => {
            this.responseMessage = response.detail;
            this.errorMessage = undefined;
            this.modelTypeChanged.emit(modelType);
            this.loading = false;
          },
          error: (error) => {
            this.errorMessage = error.message;
            this.responseMessage = undefined;
            this.loading = false;
          }
        });
    }
  }
}