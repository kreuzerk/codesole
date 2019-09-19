/*
import {highlightCode} from './highlight';
import {createTheme} from './theme-creator';
import {THEME} from './theme.model';

const someHTML = '<html><div class="test">Test</div></html>';

export function highlight(type: string, code: string): string {
    return highlightCode(type, code);
}

// console.log(highlight('html', someHTML));
createTheme(THEME.GITHUB);
 */

import * as highlight from 'highlight.js';
const someHTML = '<html><div class="test">Test</div></html>';
console.log(highlight.highlight('xml', someHTML).value);
const someJavascript = 'const i = 4;while(i>0){console.log("this is cool");i--;}';
console.log(highlight.highlight('javascript', someJavascript).value);
