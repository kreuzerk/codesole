import {HighlightEngine} from './highlight-engine';
import * as prettier from 'prettier';
import {htmlParsingRules} from './languages/html-parsing-rules';

export class Codesole {

    private highlightEngine: HighlightEngine;

    constructor() {
        this.highlightEngine = new HighlightEngine(htmlParsingRules);
    }

    public highlight(value) {
        return this.highlightEngine.highlight(
            prettier.format(value)
        );
    }


}
