import * as highlight from 'highlight.js';
import chalk from 'chalk';

const openingTag = '&lt;';
const closingOpeningTag = '&lt;/';
const closingTag = '&gt;';


const highlightJSClasses = [
    'span class="hljs-name"',
    'span class="hljs-tag"',
    'span class="hljs-string"',
    'span class="hljs-attr"',
    'span class="hljs-built_in"'
];

const mapping = {
    'span class="hljs-name"': chalk.blue,
    'span class="hljs-tag"': chalk.red,
    'span class="hljs-string"': chalk.green,
    'span class="hljs-attr"': chalk.yellow,
    'span class="hljs-built_in"': chalk.blue,
};

export function highlightCode(type: string, code: string): string {
    const segments = getSegments(type, code);
    return chalkify(segments);
}

function getSegments(type: string, code: string): string[] {
    let highlightedCode = highlight.highlight(type, code).value;
    return highlightedCode.split(/[<>]/);
}

function chalkify(segments: string[]): string {
    let chalkified = '';
    let color;
    for (let i = 0; i < segments.length; i++) {
        if (segments[i] === '/span') {
            continue;
        }

        if (segments[i] === '') {
            chalkified += '';
            continue;
        }

        if (segments[i] === '&lt;') {
            chalkified += '<';
            continue;
        }

        if (segments[i] === '&lt;/') {
            chalkified += '</';
            continue;
        }

        if (segments[i] === '&gt;') {
            chalkified += '>';
            continue;
        }

        if (highlightJSClasses.indexOf(segments[i]) > -1) {
            color = mapping[segments[i]];
            continue;
        }

        if (segments[i].indexOf(');') > -1) {
            chalkified += color(segments[i]) + '\n';
            continue;
        }
        chalkified += color(segments[i]);
    }
    return chalkified;
}

function patchGreaterThenAndLessThen(code: string): string {
    return code
        .replace(openingTag, '<')
        .replace(closingOpeningTag, '</')
        .replace(closingTag, '>')
}
