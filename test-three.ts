import {Codesole} from './codesole';

const codesole = new Codesole();
const someHTML = '<html><div class="test">Test</div></html>';
console.log(codesole.highlight('xml', someHTML).value);

const someJavascript = 'const i = 4;while(i>0){console.log("this is cool");i--;}';
console.log(codesole.highlight('javascript', someJavascript).value);
