import {Codesole} from './codesole';

const codesole = new Codesole();
const someHTML = '<div _ngcontent-c0="" class="dropdown-wrapper is-focusing" e2e-test-dropdown-clickable="" ng-reflect-klass="dropdown-wrapper" ng-reflect-ng-class="[object Object]"><div _ngcontent-c0="" class="hidden-accessible"><input _ngcontent-c0="" readonly="" type="text"></div><label _ngcontent-c0="" class="input-wrapper" e2e-test-dropdown-label=""><!--bindings={}--></label><!--bindings={\n' +
    '  "ng-reflect-ng-if": "true"\n' +
    '}--><div _ngcontent-c0="" class="icon-wrapper" ng-reflect-ng-class="[object Object]"><mobi-icon _ngcontent-c0="" _nghost-c1="" ng-reflect-icon="up" class="mobi-icon-base">';
console.log(codesole.highlight(someHTML));

const someOtherHTML = '<html><div class="test">Test</div></html>';
console.log(codesole.highlight(someOtherHTML));


