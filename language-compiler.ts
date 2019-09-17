export class LanguageCompiler {

    private language;

    constructor() {
    }

    public compileLanguage(language) {
        this.language = language;
        this.compileMode(language);
    }

    public reStr(re) {
        return (re && re.source) || re;
    }

    public langRe(value, global ?: any) {
        return new RegExp(
            this.reStr(value),
            'm' + (this.language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
        );
    }

    // joinRe logically computes regexps.join(separator), but fixes the
    // backreferences so they continue to match.
    public joinRe(regexps, separator) {
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
            var re = this.reStr(regexps[i]);
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

    public compileMode(mode, parent ?: any) {
        if (mode.compiled)
            return;
        mode.compiled = true;

        mode.keywords = mode.keywords || mode.beginKeywords;
        if (mode.keywords) {
            const compiled_keywords = {};

            const flatten = (className, str) => {
                if (this.language.case_insensitive) {
                    str = str.toLowerCase();
                }
                str.split(' ').forEach(function (kw) {
                    const pair = kw.split('|');
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
        mode.lexemesRe = this.langRe(mode.lexemes || /\w+/, true);

        if (parent) {
            if (mode.beginKeywords) {
                mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
            }
            if (!mode.begin)
                mode.begin = /\B|\b/;
            mode.beginRe = this.langRe(mode.begin);
            if (mode.endSameAsBegin)
                mode.end = mode.begin;
            if (!mode.end && !mode.endsWithParent)
                mode.end = /\B|\b/;
            if (mode.end)
                mode.endRe = this.langRe(mode.end);
            mode.terminator_end = this.reStr(mode.end) || '';
            if (mode.endsWithParent && parent.terminator_end)
                mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
        }
        if (mode.illegal)
            mode.illegalRe = this.langRe(mode.illegal);
        if (mode.relevance == null)
            mode.relevance = 1;
        if (!mode.contains) {
            mode.contains = [];
        }
        mode.contains = Array.prototype.concat.apply([], mode.contains.map((c) => {
            return this.expand_mode(c === 'self' ? mode : c);
        }));
        mode.contains.forEach((c) => {
            this.compileMode(c, mode);
        });

        if (mode.starts) {
            this.compileMode(mode.starts, parent);
        }

        const terminators =
            mode.contains.map(function (c) {
                return c.beginKeywords ? '\\.?(?:' + c.begin + ')\\.?' : c.begin;
            })
                .concat([mode.terminator_end, mode.illegal])
                .map(this.reStr)
                .filter(Boolean);
        mode.terminators = terminators.length ? this.langRe(this.joinRe(terminators, '|'), true) : {
            exec: function (/*s*/) {
                return null;
            }
        };
    }

    public expand_mode(mode) {
        if (mode.variants && !mode.cached_variants) {
            mode.cached_variants = mode.variants.map((variant) => {
                return this.inherit(mode, {variants: null}, variant);
            });
        }
        return mode.cached_variants || (mode.endsWithParent && [this.inherit(mode)]) || [mode];
    }

    public inherit(parent, foo ?: any, bar ?: any) {  // inherit(parent, override_obj, override_obj, ...)
        let key;
        const result = {};
        const objects = Array.prototype.slice.call(arguments, 1);

        for (key in parent)
            result[key] = parent[key];
        objects.forEach(function (obj) {
            for (key in obj)
                result[key] = obj[key];
        });
        return result;
    }
}
