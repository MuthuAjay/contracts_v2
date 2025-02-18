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
      } @else if (formattedResults && information_extraction_value == false) {
        <div class="results">
          <h3>Analysis Results</h3>
          <div class="markdown-content" [innerHTML]="formattedResults"></div>
        </div>
      } @else if (information_extraction_value == true) {
  <h3>Analysis Results</h3>
  <table width="100%" border="1">
  <tr>
    <th>term</th>
    <th>extracted_value</th>
    <th>timestamp</th>
  </tr>
  <tr *ngFor="let item of information_extraction">
    <td>{{item.term}}</td>
    <td>{{item.extracted_value}}</td>
    <td>{{item.timestamp}}</td>
  </tr>
 
</table>
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
      table {
  border-collapse: collapse;
  width: 100%;
}

th, td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #DDD;
}

tr:hover {background-color: #D6EEEE;}
  `]
})
export class AnalysisResultsComponent {
  @Input() loading = false;
  information_extraction:any
  information_extraction_value = false
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
    const renderer = new marked.Renderer();
    
    renderer.code = (code, language) => {
      const validLanguage = language && Prism.languages[language] ? language : 'javascript';
      const highlightedCode = Prism.highlight(
        code,
        Prism.languages[validLanguage as keyof typeof Prism.languages] || 
          Prism.languages['javascript'],
        validLanguage
      );
      return `<pre><code class="language-${validLanguage}">${highlightedCode}</code></pre>`;
    };

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
      let markdown = '';
      
      // Handle different result formats
      if (typeof this.results === 'string') {
        markdown = this.results;
      } else if (typeof this.results === 'object') {
        // Extract the main analysis type and result
        const analysisType = Object.keys(this.results)[0];
        const analysisContent = this.results[analysisType];

        if (typeof analysisContent === 'string') {
          markdown = `# ${analysisType}\n\n${analysisContent}`;
        } else if (typeof analysisContent === 'object') {
          // Handle nested results
          markdown = `# ${analysisType}\n\n`;
          
          // Handle Information Extraction special case
          if (analysisType === 'Information Extraction' && analysisContent.results) {

            this.information_extraction_value = true
            markdown += this.formatExtractionResults(analysisContent.results);
          } else {
            // Handle other nested results
            Object.entries(analysisContent).forEach(([key, value]) => {
              if (typeof value === 'string') {
                markdown += `## ${key}\n\n${value}\n\n`;
              }
            });
          }
        }
      }

      const html = await Promise.resolve(marked(markdown));
      this.formattedResults = this.sanitizer.bypassSecurityTrustHtml(html);
      
    } catch (error) {
      console.error('Error formatting results:', error);
      this.error = 'Error formatting results. Please check the console for details.';
    }
  }

  private formatExtractionResults(results: any): string {
    this.information_extraction = results
    console.log('results:', results);
    let markdown = '';
    
    Object.entries(results || {}).forEach(([category, items]) => {
      markdown += `## ${this.formatTitle(category)}\n\n`;
      
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          markdown += `- ${item}\n`;
        });
      } else if (items && typeof items === 'object') {
        Object.entries(items || {}).forEach(([key, value]) => {
          markdown += `### ${this.formatTitle(key)}\n${value}\n\n`;
        });
      } else {
        markdown += `${items}\n`;
      }
      
      markdown += '\n';
    });
    
    return markdown;
  }

  private formatTitle(text: string): string {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}