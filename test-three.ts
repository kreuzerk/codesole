import {Codesole} from './codesole';

const codesole = new Codesole();
const someOtherHTML = '<html><div class="test">Test</div></html>';
console.log(codesole.highlight(someOtherHTML));


