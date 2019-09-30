import {xml} from './languages/xml';
import {HighlightEngine} from './highlight-engine';

export class Codesole {

    private highlightEngine: HighlightEngine;

    constructor() {
        this.highlightEngine = new HighlightEngine(xml());
    }

    public highlight(value) {
        return this.highlightEngine.highlight(value);
    }


}
