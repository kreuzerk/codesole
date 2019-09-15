import {THEME} from './theme.model';
import {HLJS_TAGS} from './hljs-tags.model';

export function createTheme(theme: THEME): any {

    const themeDefinition = require(`./themes/${theme}.json`);
    const themeKeys = Object.keys(themeDefinition.children);

    HLJS_TAGS.forEach(tag => {
        const key = themeKeys.find(k => k.includes(tag));

        console.log('theme', themeDefinition.children[key]);

    });

}
