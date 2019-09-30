import {htmlParsingRules} from './languages/xml'
import {LanguageCompiler} from './language-compiler';

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

    function isIllegal(lexeme, mode) {
        return !ignore_illegals && testRe(mode.illegalRe, lexeme);
    }

    function keywordMatch(mode, match) {
        var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
        return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
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
        console.log('Process keywords', top.subLanguage != null ? processSubLanguage() : processKeywords());
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

    languageCompiler.compileLanguage(language);
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

function buildSpan(classname, insideSpan, leaveOpen ?: any, noPrefix ?: any) {
    var classPrefix = noPrefix ? '' : options.classPrefix,
        openSpan = '<span class="' + classPrefix,
        closeSpan = leaveOpen ? '' : spanEndTag;

    console.log('Applying classname', classname);

    openSpan += classname + '">';

    if (!classname) return insideSpan;
    return openSpan + insideSpan + closeSpan;
}

const languageCompiler = new LanguageCompiler();
registerLanguage('xml', './languages/xml.ts');
registerLanguage('javascript', './languages/javascript.ts');
const someHTML = '<html><div class="test">Test</div></html>';
console.log(highlight('xml', someHTML).value);

const someJavascript = 'const i = 4;while(i>0){console.log("this is cool");i--;}';
console.log(highlight('javascript', someJavascript).value);
