import chalk from 'chalk';
import {colorDefinitions} from './themes/github';

export class HighlightEngine {

    private buffer = '';
    private result = '';
    private languageDefinition: any;
    private colorFunc;

    constructor(languageDefinition) {
        this.languageDefinition = languageDefinition;
    }

    public highlight(value: string) {
        this.result = '';
        this.buffer = '';
        try {
            this.processHTML(value);
            return this.result;
        } catch (e) {
            if (e.message && e.message.indexOf('Illegal') !== -1) {
                return escape(value);
            }
            throw e;
        }
    }

    private processHTML(value: string) {
        let match;
        let count;
        let index = 0;
        while (true) {
            this.languageDefinition.terminators.lastIndex = index;
            match = this.languageDefinition.terminators.exec(value);
            if (!match) {
                break;
            }
            count = this.processLexeme(value.substring(index, match.index), match[0]);
            index = match.index + count;
        }
        this.processLexeme(value.substr(index));
    }

    private isIllegal(lexeme, mode) {
        return this.testRe(mode.illegalRe, lexeme);
    }

    private keywordMatch(mode, match) {
        const match_str = this.languageDefinition.case_insensitive ? match[0].toLowerCase() : match[0];
        return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    private processKeywords() {
        let keyword_match, last_index, match, result;

        if (!(this.languageDefinition as any).keywords) {
            return this.buffer;
        }

        result = '';
        last_index = 0;
        (this.languageDefinition as any).lexemesRe.lastIndex = 0;
        match = (this.languageDefinition as any).lexemesRe.exec(this.buffer);

        while (match) {
            result += this.buffer.substring(last_index, match.index);
            keyword_match = this.keywordMatch(this.languageDefinition, match);
            if (keyword_match) {
                result += this.addCodePart(keyword_match[0]);
            } else {
                result += match[0];
            }
            last_index = (this.languageDefinition as any).lexemesRe.lastIndex;
            match = (this.languageDefinition as any).lexemesRe.exec(this.buffer);
        }
        return result + this.buffer.substr(last_index);
    }

    private processBuffer() {
        if (this.colorFunc) {
            this.result += this.colorFunc(this.processKeywords());
        }
        this.buffer = '';
    }

    private startNewMode(mode, something ?: any) {
        this.result += mode.className ? this.addCodePart(mode.className) : '';
        this.languageDefinition = Object.create(mode, {parent: {value: this.languageDefinition}});
    }

    private processLexeme(buffer, lexeme ?: any) {
        this.buffer += buffer;
        if (lexeme == null) {
            this.processBuffer();
            return 0;
        }

        const newMode = this.subMode(lexeme);
        if (newMode) {
            return this.processNewMode(newMode, lexeme);
        }

        const end_mode = this.endOfMode(this.languageDefinition, lexeme);
        if (end_mode) {
            return this.processEndMode(lexeme, end_mode);
        }

        if (this.isIllegal(lexeme, this.languageDefinition))
            throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + ((this.languageDefinition as any).className || '<unnamed>') + '"');

        this.buffer += lexeme;
        return lexeme.length || 1;
    }

    private processEndMode(lexeme: any, end_mode) {
        const origin: any = this.languageDefinition;
        if (origin.skip) {
            this.buffer += lexeme;
        } else {
            if (!(origin.returnEnd || origin.excludeEnd)) {
                this.buffer += lexeme;
            }
            this.processBuffer();
            if (origin.excludeEnd) {
                this.buffer = lexeme;
            }
        }
        do {
            if ((this.languageDefinition as any).className) {
                this.colorFunc = chalk.hex(colorDefinitions['tag'].color);
            }
            this.languageDefinition = this.languageDefinition.parent;
        } while (this.languageDefinition !== end_mode.parent);
        if (end_mode.starts) {
            if (end_mode.endSameAsBegin) {
                end_mode.starts.endRe = end_mode.endRe;
            }
            this.startNewMode(end_mode.starts, '');
        }
        return origin.returnEnd ? 0 : lexeme.length;
    }

    private processNewMode(new_mode, lexeme: any) {
        if (new_mode.skip) {
            this.buffer += lexeme;
        } else {
            if (new_mode.excludeBegin) {
                this.buffer += lexeme;
            }
            this.processBuffer();
            if (!new_mode.returnBegin && !new_mode.excludeBegin) {
                this.buffer = lexeme;
            }
        }
        this.startNewMode(new_mode, lexeme);
        return new_mode.returnBegin ? 0 : lexeme.length;
    }

    private addCodePart(classname) {
        this.colorFunc = chalk.hex(colorDefinitions[classname].color);
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

    private subMode(lexeme) {
        for (let i = 0, length = this.languageDefinition.contains.length; i < length; i++) {
            if (this.testRe(this.languageDefinition.contains[i].beginRe, lexeme)) {
                if (this.languageDefinition.contains[i].endSameAsBegin) {
                    this.languageDefinition.contains[i].endRe = this.escapeRe(this.languageDefinition.contains[i].beginRe.exec(lexeme)[0]);
                }
                return this.languageDefinition.contains[i];
            }
        }
    }

    private escapeRe(value) {
        return new RegExp(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
    }
}
