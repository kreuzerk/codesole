import {Codesole} from './codesole';

const codesole = new Codesole();
const someHTML = '<html><div class="test">Test</div></html>';
console.log(codesole.highlight('xml', someHTML).value);
