import {LanguageCompiler} from './language-compiler';
import {xml} from './languages/xml';
import {colorDefinitions} from './themes/github';
import chalk from 'chalk';
import {HighlightEngine} from './highlight-engine';
import {javascript} from './languages/javascript';

export class Codesole {

    private languageCompiler: LanguageCompiler;
    private aliases = {};
    private API_REPLACES;
    private ignore_illegals: boolean;
    private highlightEngine: HighlightEngine;

    constructor() {
        this.languageCompiler = new LanguageCompiler();
        const languageDefinition = this.getLanguageDefinition('xml', xml);
        this.languageCompiler.compileLanguage(languageDefinition);
        this.highlightEngine = new HighlightEngine(languageDefinition);
    }

    public highlight(name, value, ignore_illegals ?: any, continuation ?: any) {
        return this.highlightEngine.highlight(name, value);
    }

    private getLanguageDefinition(name, languageBuilder: (any) => any) {
        let lang = languageBuilder(this);
        this.restoreLanguageApi(lang);
        if (lang.aliases) {
            lang.aliases.forEach((alias) => {
                this.aliases[alias] = name;
            });
        }
        return lang;
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
