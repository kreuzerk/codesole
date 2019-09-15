import {highlightCode} from './highlight';

const someHTML = '<html><div class="test">Test</div></html>';

export function highlight(type: string, code: string): string {
    return highlightCode(type, code);
}

console.log(highlight('html', someHTML));
