/*
Language: JavaScript
Category: common, scripting
*/

import {LanguageCompiler} from "../language-compiler";
import {
    APOS_STRING_MODE,
    BACKSLASH_ESCAPE,
    C_BLOCK_COMMENT_MODE, C_LINE_COMMENT_MODE,
    C_NUMBER_RE, METHOD_GUARD,
    QUOTE_STRING_MODE, RE_STARTERS_RE,
    REGEXP_MODE, TITLE_MODE, UNDERSCORE_TITLE_MODE
} from '../language-constants';

export function javascript() {
    const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
    const KEYWORDS = {
        keyword:
            'in of if for while finally var new function do return void else break catch ' +
            'instanceof with throw case default try this switch continue typeof delete ' +
            'let yield const export super debugger as async await static ' +
            // ECMAScript 6 modules import
            'import from as'
        ,
        literal:
            'true false null undefined NaN Infinity',
        built_in:
            'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
            'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
            'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
            'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
            'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
            'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
            'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect ' +
            'Promise'
    };
    const NUMBER = {
        className: 'number',
        variants: [
            {begin: '\\b(0[bB][01]+)'},
            {begin: '\\b(0[oO][0-7]+)'},
            {begin: C_NUMBER_RE}
        ],
        relevance: 0
    };
    const SUBST = {
        className: 'subst',
        begin: '\\$\\{', end: '\\}',
        keywords: KEYWORDS,
        contains: []  // defined later
    };
    const HTML_TEMPLATE = {
        begin: 'html`', end: '',
        starts: {
            end: '`', returnEnd: false,
            contains: [
                BACKSLASH_ESCAPE,
                SUBST
            ],
            subLanguage: 'xml',
        }
    };
    const CSS_TEMPLATE = {
        begin: 'css`', end: '',
        starts: {
            end: '`', returnEnd: false,
            contains: [
                BACKSLASH_ESCAPE,
                SUBST
            ],
            subLanguage: 'css',
        }
    };
    const TEMPLATE_STRING = {
        className: 'string',
        begin: '`', end: '`',
        contains: [
            BACKSLASH_ESCAPE,
            SUBST
        ]
    };
    SUBST.contains = [
        APOS_STRING_MODE,
        QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        TEMPLATE_STRING,
        NUMBER,
        REGEXP_MODE
    ];
    const PARAMS_CONTAINS = SUBST.contains.concat([
        C_BLOCK_COMMENT_MODE,
        C_LINE_COMMENT_MODE
    ]);

    return {
        aliases: ['js', 'jsx'],
        keywords: KEYWORDS,
        contains: [
            {
                className: 'meta',
                relevance: 10,
                begin: /^\s*['"]use (strict|asm)['"]/
            },
            {
                className: 'meta',
                begin: /^#!/, end: /$/
            },
            APOS_STRING_MODE,
            QUOTE_STRING_MODE,
            HTML_TEMPLATE,
            CSS_TEMPLATE,
            TEMPLATE_STRING,
            C_LINE_COMMENT_MODE,
            C_BLOCK_COMMENT_MODE,
            NUMBER,
            { // object attr container
                begin: /[{,]\s*/, relevance: 0,
                contains: [
                    {
                        begin: IDENT_RE + '\\s*:', returnBegin: true,
                        relevance: 0,
                        contains: [{className: 'attr', begin: IDENT_RE, relevance: 0}]
                    }
                ]
            },
            { // "value" container
                begin: '(' + RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
                keywords: 'return throw case',
                contains: [
                    C_LINE_COMMENT_MODE,
                    C_BLOCK_COMMENT_MODE,
                    REGEXP_MODE,
                    {
                        className: 'function',
                        begin: '(\\(.*?\\)|' + IDENT_RE + ')\\s*=>', returnBegin: true,
                        end: '\\s*=>',
                        contains: [
                            {
                                className: 'params',
                                variants: [
                                    {
                                        begin: IDENT_RE
                                    },
                                    {
                                        begin: /\(\s*\)/,
                                    },
                                    {
                                        begin: /\(/, end: /\)/,
                                        excludeBegin: true, excludeEnd: true,
                                        keywords: KEYWORDS,
                                        contains: PARAMS_CONTAINS
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        className: '',
                        begin: /\s/,
                        end: /\s*/,
                        skip: true,
                    },
                    { // E4X / JSX
                        begin: /</, end: /(\/[A-Za-z0-9\\._:-]+|[A-Za-z0-9\\._:-]+\/)>/,
                        subLanguage: 'xml',
                        contains: [
                            {begin: /<[A-Za-z0-9\\._:-]+\s*\/>/, skip: true},
                            {
                                begin: /<[A-Za-z0-9\\._:-]+/,
                                end: /(\/[A-Za-z0-9\\._:-]+|[A-Za-z0-9\\._:-]+\/)>/,
                                skip: true,
                                contains: [
                                    {begin: /<[A-Za-z0-9\\._:-]+\s*\/>/, skip: true},
                                    'self'
                                ]
                            }
                        ]
                    }
                ],
                relevance: 0
            },
            {
                className: 'function',
                beginKeywords: 'function', end: /\{/, excludeEnd: true,
                contains: [
                    LanguageCompiler.inherit(TITLE_MODE, {begin: IDENT_RE}),
                    {
                        className: 'params',
                        begin: /\(/, end: /\)/,
                        excludeBegin: true,
                        excludeEnd: true,
                        contains: PARAMS_CONTAINS
                    }
                ],
                illegal: /\[|%/
            },
            {
                begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
            },
            METHOD_GUARD,
            { // ES6 class
                className: 'class',
                beginKeywords: 'class', end: /[{;=]/, excludeEnd: true,
                illegal: /[:"\[\]]/,
                contains: [
                    {beginKeywords: 'extends'},
                    UNDERSCORE_TITLE_MODE
                ]
            },
            {
                beginKeywords: 'constructor get set', end: /\{/, excludeEnd: true
            }
        ],
        illegal: /#(?!!)/
    };
}
