import {htmlParsingRules} from './languages/xml'

const hljs = {
    PHRASAL_WORDS_MODE: {
        begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    },
    inherit: inherit,
    COMMENT: function (begin, end, inherits) {
        var mode: any = hljs.inherit(
            {
                className: 'comment',
                begin: begin, end: end,
                contains: []
            },
            inherits || {}
        );
        mode.contains.push(hljs.PHRASAL_WORDS_MODE);
        mode.contains.push({
            className: 'doctag',
            begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
            relevance: 0
        });
        return mode;
    }
};
const options = {
    classPrefix: 'hljs-',
    tabReplace: null,
    useBR: false,
    languages: undefined
};
const spanEndTag = '</span>';
let languages = {},
    aliases = {};

var API_REPLACES;

function highlight(name, value, ignore_illegals ?: any, continuation ?: any) {

    function escapeRe(value) {
        return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
    }

    function subMode(lexeme, mode) {
        var i, length;

        for (i = 0, length = mode.contains.length; i < length; i++) {
            if (testRe(mode.contains[i].beginRe, lexeme)) {
                if (mode.contains[i].endSameAsBegin) {
                    mode.contains[i].endRe = escapeRe(mode.contains[i].beginRe.exec(lexeme)[0]);
                }
                return mode.contains[i];
            }
        }
    }

    function endOfMode(mode, lexeme) {
        if (testRe(mode.endRe, lexeme)) {
            while (mode.endsParent && mode.parent) {
                mode = mode.parent;
            }
            return mode;
        }
        if (mode.endsWithParent) {
            return endOfMode(mode.parent, lexeme);
        }
    }

    function isIllegal(lexeme, mode) {
        return !ignore_illegals && testRe(mode.illegalRe, lexeme);
    }

    function keywordMatch(mode, match) {
        var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
        return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    function buildSpan(classname, insideSpan, leaveOpen ?: any, noPrefix ?: any) {
        var classPrefix = noPrefix ? '' : options.classPrefix,
            openSpan = '<span class="' + classPrefix,
            closeSpan = leaveOpen ? '' : spanEndTag;

        openSpan += classname + '">';

        if (!classname) return insideSpan;
        return openSpan + insideSpan + closeSpan;
    }

    function processKeywords() {
        var keyword_match, last_index, match, result;

        if (!top.keywords){
            // return escape(mode_buffer);
            return mode_buffer;
        }

        result = '';
        last_index = 0;
        top.lexemesRe.lastIndex = 0;
        match = top.lexemesRe.exec(mode_buffer);

        while (match) {
            result += escape(mode_buffer.substring(last_index, match.index));
            keyword_match = keywordMatch(top, match);
            if (keyword_match) {
                relevance += keyword_match[1];
                result += buildSpan(keyword_match[0], escape(match[0]));
            } else {
                result += escape(match[0]);
            }
            last_index = top.lexemesRe.lastIndex;
            match = top.lexemesRe.exec(mode_buffer);
        }
        return result + escape(mode_buffer.substr(last_index));
    }

    function processSubLanguage() {
        var explicit = typeof top.subLanguage === 'string';
        if (explicit && !languages[top.subLanguage]) {
            return escape(mode_buffer);
        }

        var result = highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]);

        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Usecase in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if (top.relevance > 0) {
            relevance += result.relevance;
        }
        if (explicit) {
            continuations[top.subLanguage] = result.top;
        }
        return buildSpan(result.language, result.value, false, true);
    }

    function processBuffer() {
        result += (top.subLanguage != null ? processSubLanguage() : processKeywords());
        mode_buffer = '';
    }

    function startNewMode(mode, something ?: any) {
        result += mode.className ? buildSpan(mode.className, '', true) : '';
        top = Object.create(mode, {parent: {value: top}});
    }

    function processLexeme(buffer, lexeme ?: any) {

        mode_buffer += buffer;

        if (lexeme == null) {
            processBuffer();
            return 0;
        }

        var new_mode = subMode(lexeme, top);
        if (new_mode) {
            if (new_mode.skip) {
                mode_buffer += lexeme;
            } else {
                if (new_mode.excludeBegin) {
                    mode_buffer += lexeme;
                }
                processBuffer();
                if (!new_mode.returnBegin && !new_mode.excludeBegin) {
                    mode_buffer = lexeme;
                }
            }
            startNewMode(new_mode, lexeme);
            return new_mode.returnBegin ? 0 : lexeme.length;
        }

        var end_mode = endOfMode(top, lexeme);
        if (end_mode) {
            var origin = top;
            if (origin.skip) {
                mode_buffer += lexeme;
            } else {
                if (!(origin.returnEnd || origin.excludeEnd)) {
                    mode_buffer += lexeme;
                }
                processBuffer();
                if (origin.excludeEnd) {
                    mode_buffer = lexeme;
                }
            }
            do {
                if (top.className) {
                    result += spanEndTag;
                }
                if (!top.skip && !top.subLanguage) {
                    relevance += top.relevance;
                }
                top = top.parent;
            } while (top !== end_mode.parent);
            if (end_mode.starts) {
                if (end_mode.endSameAsBegin) {
                    end_mode.starts.endRe = end_mode.endRe;
                }
                startNewMode(end_mode.starts, '');
            }
            return origin.returnEnd ? 0 : lexeme.length;
        }

        if (isIllegal(lexeme, top))
            throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');

        /*
        Parser should not reach this point as all types of lexemes should be caught
        earlier, but if it does due to some bug make sure it advances at least one
        character forward to prevent infinite looping.
        */
        mode_buffer += lexeme;
        return lexeme.length || 1;
    }

    var language = getLanguage(name);
    if (!language) {
        throw new Error('Unknown language: "' + name + '"');
    }

    compileLanguage(language);
    var top = continuation || language;
    var continuations = {}; // keep continuations for sub-languages
    var result = '', current;
    for (current = top; current !== language; current = current.parent) {
        if (current.className) {
            result = buildSpan(current.className, '', true) + result;
        }
    }
    var mode_buffer = '';
    var relevance = 0;
    try {
        var match, count, index = 0;
        while (true) {
            top.terminators.lastIndex = index;
            match = top.terminators.exec(value);
            if (!match)
                break;
            count = processLexeme(value.substring(index, match.index), match[0]);
            index = match.index + count;
        }
        processLexeme(value.substr(index));
        for (current = top; current.parent; current = current.parent) { // close dangling modes
            if (current.className) {
                result += spanEndTag;
            }
        }
        return {
            relevance: relevance,
            value: result,
            language: name,
            top: top
        };
    } catch (e) {
        if (e.message && e.message.indexOf('Illegal') !== -1) {
            return {
                relevance: 0,
                value: escape(value)
            };
        } else {
            throw e;
        }
    }
}

function testRe(re, lexeme) {
    var match = re && re.exec(lexeme);
    return match && match.index === 0;
}

function getLanguage(name) {
    name = (name || '').toLowerCase();
    return languages[name] || languages[aliases[name]];
}

function compileLanguage(language) {

    function reStr(re) {
        return (re && re.source) || re;
    }

    function langRe(value, global ?: any) {
        return new RegExp(
            reStr(value),
            'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
        );
    }

    // joinRe logically computes regexps.join(separator), but fixes the
    // backreferences so they continue to match.
    function joinRe(regexps, separator) {
        // backreferenceRe matches an open parenthesis or backreference. To avoid
        // an incorrect parse, it additionally matches the following:
        // - [...] elements, where the meaning of parentheses and escapes change
        // - other escape sequences, so we do not misparse escape sequences as
        //   interesting elements
        // - non-matching or lookahead parentheses, which do not capture. These
        //   follow the '(' with a '?'.
        var backreferenceRe = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
        var numCaptures = 0;
        var ret = '';
        for (var i = 0; i < regexps.length; i++) {
            var offset = numCaptures;
            var re = reStr(regexps[i]);
            if (i > 0) {
                ret += separator;
            }
            while (re.length > 0) {
                var match = backreferenceRe.exec(re);
                if (match == null) {
                    ret += re;
                    break;
                }
                ret += re.substring(0, match.index);
                re = re.substring(match.index + match[0].length);
                if (match[0][0] == '\\' && match[1]) {
                    // Adjust the backreference.
                    ret += '\\' + String(Number(match[1]) + offset);
                } else {
                    ret += match[0];
                    if (match[0] == '(') {
                        numCaptures++;
                    }
                }
            }
        }
        return ret;
    }

    function compileMode(mode, parent ?: any) {
        if (mode.compiled)
            return;
        mode.compiled = true;

        mode.keywords = mode.keywords || mode.beginKeywords;
        if (mode.keywords) {
            var compiled_keywords = {};

            var flatten = function (className, str) {
                if (language.case_insensitive) {
                    str = str.toLowerCase();
                }
                str.split(' ').forEach(function (kw) {
                    var pair = kw.split('|');
                    compiled_keywords[pair[0]] = [className, pair[1] ? Number(pair[1]) : 1];
                });
            };

            if (typeof mode.keywords === 'string') { // string
                flatten('keyword', mode.keywords);
            } else {
                Object.keys(mode.keywords).forEach(function (className) {
                    flatten(className, mode.keywords[className]);
                });
            }
            mode.keywords = compiled_keywords;
        }
        mode.lexemesRe = langRe(mode.lexemes || /\w+/, true);

        if (parent) {
            if (mode.beginKeywords) {
                mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
            }
            if (!mode.begin)
                mode.begin = /\B|\b/;
            mode.beginRe = langRe(mode.begin);
            if (mode.endSameAsBegin)
                mode.end = mode.begin;
            if (!mode.end && !mode.endsWithParent)
                mode.end = /\B|\b/;
            if (mode.end)
                mode.endRe = langRe(mode.end);
            mode.terminator_end = reStr(mode.end) || '';
            if (mode.endsWithParent && parent.terminator_end)
                mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
        }
        if (mode.illegal)
            mode.illegalRe = langRe(mode.illegal);
        if (mode.relevance == null)
            mode.relevance = 1;
        if (!mode.contains) {
            mode.contains = [];
        }
        mode.contains = Array.prototype.concat.apply([], mode.contains.map(function (c) {
            return expand_mode(c === 'self' ? mode : c);
        }));
        mode.contains.forEach(function (c) {
            compileMode(c, mode);
        });

        if (mode.starts) {
            compileMode(mode.starts, parent);
        }

        var terminators =
            mode.contains.map(function (c) {
                return c.beginKeywords ? '\\.?(?:' + c.begin + ')\\.?' : c.begin;
            })
                .concat([mode.terminator_end, mode.illegal])
                .map(reStr)
                .filter(Boolean);
        mode.terminators = terminators.length ? langRe(joinRe(terminators, '|'), true) : {
            exec: function (/*s*/) {
                return null;
            }
        };
    }

    compileMode(language);
}

function expand_mode(mode) {
    if (mode.variants && !mode.cached_variants) {
        mode.cached_variants = mode.variants.map(function (variant) {
            return inherit(mode, {variants: null}, variant);
        });
    }
    return mode.cached_variants || (mode.endsWithParent && [inherit(mode)]) || [mode];
}

function inherit(parent, foo ?: any, bar ?: any) {  // inherit(parent, override_obj, override_obj, ...)
    var key;
    var result = {};
    var objects = Array.prototype.slice.call(arguments, 1);

    for (key in parent)
        result[key] = parent[key];
    objects.forEach(function (obj) {
        for (key in obj)
            result[key] = obj[key];
    });
    return result;
}

function registerLanguage(name, language: any) {
    var lang = languages[name] = htmlParsingRules(hljs);
    restoreLanguageApi(lang);
    if (lang.aliases) {
        lang.aliases.forEach(function (alias) {
            aliases[alias] = name;
        });
    }
}

function restoreLanguageApi(obj) {
    if (API_REPLACES && !obj.langApiRestored) {
        obj.langApiRestored = true;
        for (var key in API_REPLACES)
            obj[key] && (obj[API_REPLACES[key]] = obj[key]);
        (obj.contains || []).concat(obj.variants || []).forEach(restoreLanguageApi);
    }
}

registerLanguage('xml', './languages/xml.js');
const someHTML = '<html><div class="test">Test</div></html>';
console.log(highlight('xml', someHTML).value);
