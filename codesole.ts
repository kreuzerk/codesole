import {LanguageCompiler} from './language-compiler';
import {xml} from './languages/xml';
import {colorDefinitions} from './themes/github';
import chalk from 'chalk';

export class Codesole {

    private languageCompiler: LanguageCompiler;
    private PHRASAL_WORDS_MODE = {
        begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
    };
    private top;
    private mode_buffer = '';
    private relevance = 0;
    private continuations = {};
    private result = '';
    private language: any;
    private options = {
        classPrefix: 'hljs-',
        tabReplace: null,
        useBR: false,
        languages: undefined
    };
    private languages = {};
    private aliases = {};
    private API_REPLACES;
    private ignore_illegals: boolean;
    private colorFunc;

    constructor() {
        this.languageCompiler = new LanguageCompiler();
        this.registerLanguage('xml', './languages/xml.js');
    }

    public COMMENT(begin, end, inherits) {
        const mode: any = this.inherit(
            {
                className: 'comment',
                begin: begin, end: end,
                contains: []
            },
            inherits || {}
        );
        mode.contains.push(this.PHRASAL_WORDS_MODE);
        mode.contains.push({
            className: 'doctag',
            begin: '(?:TODO|FIXME|NOTE|BUG|XXX):',
            relevance: 0
        });
        return mode;
    }

    public highlight(name, value, ignore_illegals ?: any, continuation ?: any) {
        this.ignore_illegals = ignore_illegals;
        this.language = this.getLanguage(name);
        if (!this.language) {
            throw new Error('Unknown language: "' + name + '"');
        }

        this.languageCompiler.compileLanguage(this.language);
        this.top = continuation || this.language;
        this.continuations = {}; // keep continuations for sub-languages
        this.result = '';
        let current;
        for (current = this.top; current !== this.language; current = current.parent) {
            if (current.className) {
                this.result = this.buildSpan(current.className, '', true) + this.result;
            }
        }
        this.mode_buffer = '';
        this.relevance = 0;
        try {
            let match, count, index = 0;
            while (true) {
                this.top.terminators.lastIndex = index;
                match = (this.top.terminators.exec as any)(value);
                if (!match)
                    break;
                count = this.processLexeme(value.substring(index, match.index), match[0]);
                index = match.index + count;
            }
            this.processLexeme(value.substr(index));
            for (current = this.top; current.parent; current = current.parent) { // close dangling modes
                if (current.className) {
                    console.log('ClassName', current.className);
                }
            }
            return {
                relevance: this.relevance,
                value: this.result,
                language: name,
                top: this.top
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

    private isIllegal(lexeme, mode) {
        return !this.ignore_illegals && this.testRe(mode.illegalRe, lexeme);
    }

    private keywordMatch(mode, match) {
        var match_str = this.language.case_insensitive ? match[0].toLowerCase() : match[0];
        return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    private processKeywords() {
        let keyword_match, last_index, match, result;

        if (!(this.top as any).keywords) {
            // return escape(mode_buffer);
            return this.mode_buffer;
        }

        result = '';
        last_index = 0;
        (top as any).lexemesRe.lastIndex = 0;
        match = (top as any).lexemesRe.exec(this.mode_buffer);

        while (match) {
            result += escape(this.mode_buffer.substring(last_index, match.index));
            keyword_match = this.keywordMatch(top, match);
            if (keyword_match) {
                this.relevance += keyword_match[1];
                result += this.buildSpan(keyword_match[0], escape(match[0]));
            } else {
                result += escape(match[0]);
            }
            last_index = (top as any).lexemesRe.lastIndex;
            match = (top as any).lexemesRe.exec(this.mode_buffer);
        }
        return result + escape(this.mode_buffer.substr(last_index));
    }

    private processSubLanguage() {
        const explicit = typeof (this.top as any).subLanguage === 'string';
        if (explicit && !this.languages[(this.top as any).subLanguage]) {
            return escape(this.mode_buffer);
        }

        const result = this.highlight(
            (this.top as any).subLanguage,
            this.mode_buffer,
            true,
            this.continuations[(this.top as any).subLanguage]);

        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Usecase in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if ((this.top as any).relevance > 0) {
            this.relevance += result.relevance;
        }
        if (explicit) {
            this.continuations[(this.top as any).subLanguage] = result.top;
        }
        return this.buildSpan(result.language, result.value, false, true);
    }

    private processBuffer() {
        console.log('Rendering', ((this.top as any).subLanguage != null ? this.processSubLanguage() : this.processKeywords()));
        if(this.colorFunc) {
            this.result += this.colorFunc(((this.top as any).subLanguage != null ? this.processSubLanguage() : this.processKeywords()));
        }
        this.mode_buffer = '';
    }

    private startNewMode(mode, something ?: any) {
        this.result += mode.className ? this.buildSpan(mode.className, '', true) : '';
        this.top = Object.create(mode, {parent: {value: this.top}});
    }

    private processLexeme(buffer, lexeme ?: any) {

        this.mode_buffer += buffer;

        if (lexeme == null) {
            this.processBuffer();
            return 0;
        }

        const new_mode = this.subMode(lexeme, this.top);
        if (new_mode) {
            if (new_mode.skip) {
                this.mode_buffer += lexeme;
            } else {
                if (new_mode.excludeBegin) {
                    this.mode_buffer += lexeme;
                }
                this.processBuffer();
                if (!new_mode.returnBegin && !new_mode.excludeBegin) {
                    this.mode_buffer = lexeme;
                }
            }
            this.startNewMode(new_mode, lexeme);
            return new_mode.returnBegin ? 0 : lexeme.length;
        }

        const end_mode = this.endOfMode(this.top, lexeme);
        if (end_mode) {
            const origin: any = this.top;
            if (origin.skip) {
                this.mode_buffer += lexeme;
            } else {
                if (!(origin.returnEnd || origin.excludeEnd)) {
                    this.mode_buffer += lexeme;
                }
                this.processBuffer();
                if (origin.excludeEnd) {
                    this.mode_buffer = lexeme;
                }
            }
            do {
                if ((this.top as any).className) {
                    this.colorFunc = chalk.hex(colorDefinitions['tag'].color);
                    console.log('Closing', (this.top as any).className);
                }
                if (!(this.top as any).skip && !(this.top as any).subLanguage) {
                    this.relevance += (this.top as any).relevance;
                }
                this.top = this.top.parent;
            } while (this.top !== end_mode.parent);
            if (end_mode.starts) {
                if (end_mode.endSameAsBegin) {
                    end_mode.starts.endRe = end_mode.endRe;
                }
                this.startNewMode(end_mode.starts, '');
            }
            return origin.returnEnd ? 0 : lexeme.length;
        }

        if (this.isIllegal(lexeme, this.top))
            throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + ((this.top as any).className || '<unnamed>') + '"');

        /*
        Parser should not reach this point as all types of lexemes should be caught
        earlier, but if it does due to some bug make sure it advances at least one
        character forward to prevent infinite looping.
        */
        this.mode_buffer += lexeme;
        return lexeme.length || 1;
    }

    private inherit(parent, foo ?: any, bar ?: any) {  // inherit(parent, override_obj, override_obj, ...)
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

    private getLanguage(name) {
        name = (name || '').toLowerCase();
        return this.languages[name] || this.languages[this.aliases[name]];
    }

    private buildSpan(classname, insideSpan, leaveOpen ?: any, noPrefix ?: any) {

        let classPrefix = noPrefix ? '' : this.options.classPrefix,
            openSpan = '<span class="' + classPrefix;

        openSpan += classname + '">';

        this.colorFunc = chalk.hex(colorDefinitions[classname].color);

        if (!classname) return insideSpan;
        // return openSpan + insideSpan + closeSpan;
        return '';
    }

    private testRe(re, lexeme) {
        let match = re && re.exec(lexeme);
        return match && match.index === 0;
    }

    private endOfMode(mode, lexeme) {
        if (this.testRe(mode.endRe, lexeme)) {
            while (mode.endsParent && mode.parent) {
                mode = mode.parent;
            }
            return mode;
        }
        if (mode.endsWithParent) {
            return this.endOfMode(mode.parent, lexeme);
        }
    }

    private subMode(lexeme, mode) {
        let i, length;

        for (i = 0, length = mode.contains.length; i < length; i++) {
            if (this.testRe(mode.contains[i].beginRe, lexeme)) {
                if (mode.contains[i].endSameAsBegin) {
                    mode.contains[i].endRe = this.escapeRe(mode.contains[i].beginRe.exec(lexeme)[0]);
                }
                return mode.contains[i];
            }
        }
    }

    private escapeRe(value) {
        return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
    }

    private registerLanguage(name, language: any) {
        let lang = this.languages[name] = xml(this);
        this.restoreLanguageApi(lang);
        if (lang.aliases) {
            lang.aliases.forEach((alias) => {
                this.aliases[alias] = name;
            });
        }
    }

    private restoreLanguageApi(obj) {
        if (this.API_REPLACES && !obj.langApiRestored) {
            obj.langApiRestored = true;
            for (let key in this.API_REPLACES)
                obj[key] && (obj[this.API_REPLACES[key]] = obj[key]);
            (obj.contains || []).concat(obj.variants || []).forEach(this.restoreLanguageApi);
        }
    }
}
