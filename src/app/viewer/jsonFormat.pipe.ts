import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'jsonFormat' })
export class JsonFormatPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) { }

  transform(value: any): SafeHtml {

    if (typeof value != 'string') {
      value = JSON.stringify(value, undefined, 2);
    }
    value = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = value.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match: string) => {
      var cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
          match = match.replace(/(?:\\r\\n|\\r|\\n)/g, '<br>');
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });

    return this.sanitizer.bypassSecurityTrustHtml(`<pre class="jsonformat">${html}</pre>`);
  }
}