import {Codesole} from './codesole';

const codesole = new Codesole();
const someHTML = '<div _ngcontent-c0="" class="dropdown-wrapper is-focusing" e2e-test-dropdown-clickable="" ng-reflect-klass="dropdown-wrapper" ng-reflect-ng-class="[object Object]"><div _ngcontent-c0="" class="hidden-accessible"><input _ngcontent-c0="" readonly="" type="text"></div><label _ngcontent-c0="" class="input-wrapper" e2e-test-dropdown-label=""><!--bindings={}--></label><!--bindings={\n' +
    '  "ng-reflect-ng-if": "true"\n' +
    '}--><div _ngcontent-c0="" class="icon-wrapper" ng-reflect-ng-class="[object Object]"><mobi-icon _ngcontent-c0="" _nghost-c1="" ng-reflect-icon="up" class="mobi-icon-base"><!--bindings={\n' +
    '  "ng-reflect-ng-if": "up"\n' +
    '}--><span _ngcontent-c1="" class="icon-sized mobi-iconfont mob_ico_base_up" ng-reflect-ng-class="icon-sized mobi-iconfont mob_i" e2e-test-icon="up"></span></mobi-icon></div><mobi-overlay _ngcontent-c0="" ng-reflect-target="[object HTMLDivElement]" ng-reflect-context="mobi-ng-overlay-dropdown" ng-reflect-position="bottom-end" ng-reflect-offset="22px, 12px" ng-reflect-open-on="none" ng-reflect-close-on="none" mobi-overlay-uid="0" is-open="true"><!----><!----></mobi-overlay></div>';
console.log(codesole.highlight('xml', someHTML).value);
