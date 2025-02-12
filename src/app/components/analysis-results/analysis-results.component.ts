import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgIf } from '@angular/common';
import { marked } from 'marked';
import * as Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';

@Component({
  selector: 'app-analysis-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-container">
      @if (loading) {
        <div class="loading">
          <div class="spinner"></div>
          <p>Analyzing document...</p>
        </div>
      } @else if (error) {
        <div class="error">
          <h3>Error</h3>
          <p>{{ error }}</p>
        </div>
      } @else if (results) {
        <div class="results">
          <h3>Analysis Results</h3>
          <div class="markdown-content" [innerHTML]="formattedResults"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .results-container {
      padding: 1.5rem;
      margin-top: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
    }

    .loading {
      text-align: center;
      padding: 2rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2196F3;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #f44336;
      padding: 1rem;
      background: #ffebee;
      border-radius: 4px;
    }

    .results h3 {
      color: #1976D2;
      margin-bottom: 1.5rem;
      font-size: 1.5rem;
    }

    ::ng-deep .markdown-content {
      font-size: 1rem;
      line-height: 1.6;
      color: #333;
    }

    ::ng-deep .markdown-content pre {
      background: #f5f7f9;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
      margin: 1em 0;
    }

    ::ng-deep .markdown-content code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
    }
  `]
})
export class AnalysisResultsComponent {
  @Input() loading = false;
  @Input() error?: string;
  @Input() set results(value: any) {
    if (value) {
      this._results = value;
      this.formatResults();
    }
  }
  get results() { return this._results; }

  private _results: any;
  formattedResults?: SafeHtml;

  constructor(private sanitizer: DomSanitizer) {
    // Configure marked with custom renderer
    const renderer = new marked.Renderer();
    
    renderer.code = (code, language) => {
      const validLanguage = language && Prism.languages[language] ? language : 'javascript';
      
      return `<pre><code class="language-${validLanguage}">${
        Prism.highlight(
          code,
          Prism.languages[validLanguage as keyof typeof Prism.languages] || 
            Prism.languages['javascript'],
          validLanguage
        )
      }</code></pre>`;
    };

    // Apply the configuration
    marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: false
    });
  }

  private async formatResults() {
    try {
      if (typeof this.results === 'string') {
        const html = await Promise.resolve(marked(this.results));
        this.formattedResults = this.sanitizer.bypassSecurityTrustHtml(html);
      } else {
        const markdown = this.convertToMarkdown(this.results);
        const html = await Promise.resolve(marked(markdown));
        this.formattedResults = this.sanitizer.bypassSecurityTrustHtml(html);
      }
    } catch (error) {
      console.error('Error formatting results:', error);
      this.formattedResults = this.sanitizer.bypassSecurityTrustHtml(
        'Error formatting results. Please check the console for details.'
      );
    }
  }

  private convertToMarkdown(obj: any): string {
    if (typeof obj === 'string') {
      return obj;
    }

    let markdown = '';
    
    if (obj.result) {
      markdown += this.convertToMarkdown(obj.result);
    }

    if (obj.analysis) {
      markdown += '## Analysis\n\n';
      markdown += obj.analysis + '\n\n';
    }

    if (obj.summary) {
      markdown += '## Summary\n\n';
      markdown += obj.summary + '\n\n';
    }

    if (obj.details) {
      markdown += '## Details\n\n';
      if (Array.isArray(obj.details)) {
        obj.details.forEach((detail: any) => {
          markdown += '- ' + detail + '\n';
        });
      } else {
        markdown += obj.details + '\n\n';
      }
    }

    if (obj.recommendations) {
      markdown += '## Recommendations\n\n';
      if (Array.isArray(obj.recommendations)) {
        obj.recommendations.forEach((rec: any) => {
          markdown += '- ' + rec + '\n';
        });
      } else {
        markdown += obj.recommendations + '\n\n';
      }
    }

    return markdown;
  }
}