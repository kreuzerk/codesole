import {LanguageCompiler} from './language-compiler';

export const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
export const C_LINE_COMMENT_MODE = LanguageCompiler.COMMENT('//', '$');
export const C_BLOCK_COMMENT_MODE = LanguageCompiler.COMMENT('/\\*', '\\*/');
export const HASH_COMMENT_MODE = LanguageCompiler.COMMENT('#', '$');
export const IDENT_RE = '[a-zA-Z]\\w*';
export const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
export const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
export const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
export const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';
export const BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
};

export const NUMBER_MODE = {
    className: 'number',
    begin: NUMBER_RE,
    relevance: 0
};
export const C_NUMBER_MODE = {
    className: 'number',
    begin: C_NUMBER_RE,
    relevance: 0
};
export const BINARY_NUMBER_MODE = {
    className: 'number',
    begin: BINARY_NUMBER_RE,
    relevance: 0
};
export const CSS_NUMBER_MODE = {
    className: 'number',
    begin: NUMBER_RE + '(' +
        '%|em|ex|ch|rem' +
        '|vw|vh|vmin|vmax' +
        '|cm|mm|in|pt|pc|px' +
        '|deg|grad|rad|turn' +
        '|s|ms' +
        '|Hz|kHz' +
        '|dpi|dpcm|dppx' +
        ')?',
    relevance: 0
};
export const REGEXP_MODE = {
    className: 'regexp',
    begin: /\//, end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
        BACKSLASH_ESCAPE,
        {
            begin: /\[/, end: /\]/,
            relevance: 0,
            contains: [BACKSLASH_ESCAPE]
        }
    ]
};
export const TITLE_MODE = {
    className: 'title',
    begin: IDENT_RE,
    relevance: 0
};
export const UNDERSCORE_TITLE_MODE = {
    className: 'title',
    begin: UNDERSCORE_IDENT_RE,
    relevance: 0
};
export const METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
    relevance: 0
};


export const APOS_STRING_MODE = {
    className: 'string',
    begin: '\'', end: '\'',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
};
export const QUOTE_STRING_MODE = {
    className: 'string',
    begin: '"', end: '"',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
};

export const PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
};
