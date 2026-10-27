import {catalog} from '../assets/provider-icons/manifest.js';
import * as bundled from '../assets/provider-icons/index.js';
import {createProviderCatalog} from '../providerCatalog.js';
import {activateProviderCatalog, resolveProviderIcon, providerIconChoices, providerIconPath,
    selectedProviderIcon} from '../providerMetadata.js';
import {equal} from './assert.js';

const live = createProviderCatalog(catalog);
for (const id of [...Object.keys(catalog.icons), ...Object.keys(catalog.aliases)]) {
    for (const style of ['monochrome', 'color'])
        equal(live.resolveProviderIcon(id, {style}), bundled.resolveProviderIcon(id, {style}));
}
for (const query of ['', 'open ai', 'Claude', 'type safe', '中文', 'does-not-exist'])
    equal(live.searchProviderIcons(query), bundled.searchProviderIcons(query));
const next = JSON.parse(JSON.stringify(catalog));
next.packageVersion = '999.0.0';
next.icons.future = {name: 'Future Model', monochrome: 'future.svg', alternatives: ['future'], searchTerms: ['tomorrow'], colourTheme: []};
next.aliases['future-model'] = 'future';
activateProviderCatalog(next, '/fixture/generation');
equal(resolveProviderIcon('Future Model').id, 'future');
equal(providerIconChoices('tomorrow').map(icon => icon.id), ['future']);
equal(providerIconPath('future.svg', '/bundled'), '/fixture/generation/future.svg');
equal(selectedProviderIcon('future', 'claude').id, 'claude');
activateProviderCatalog();
equal(resolveProviderIcon('future'), undefined);
equal(providerIconPath('future.svg', '/bundled'), '/bundled/future.svg');
print('Passed: library semantics parity, live identity/search/path replacement, explicit selection and fallback');
