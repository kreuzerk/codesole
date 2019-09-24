import {LanguageCompiler} from './language-compiler';
import {xml} from './languages/xml';
import {HighlightEngine} from './highlight-engine';

export class Codesole {

    private languageCompiler: LanguageCompiler;
    private highlightEngine: HighlightEngine;

    constructor() {
        this.languageCompiler = new LanguageCompiler();
        const languageDefinition = LanguageCompiler.getLanguageDefinition('xml', xml);
        this.languageCompiler.compileLanguage(languageDefinition);
        this.highlightEngine = new HighlightEngine(languageDefinition);
    }

    public highlight(name, value) {
        return this.highlightEngine.highlight(name, value);
    }


}
