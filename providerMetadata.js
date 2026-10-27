import {catalog as bundledCatalog} from './assets/provider-icons/manifest.js';
import {createProviderCatalog} from './providerCatalog.js';

export let providerIcons, providerIconVersion, PROVIDER_ICON_FILES;
export const bundledProviderIconVersion = bundledCatalog.packageVersion;
let library, iconRoot = null;
export const providerIconChoices = (...args) => library.searchProviderIcons(...args);
export const providerIconPath = (file, bundledRoot) => `${iconRoot || bundledRoot}/${file}`;

// Backend IDs occasionally differ from the library's brand ID. A new exact
// upstream ID/alias always wins over these compatibility names.
const backendIconAliases = new Map([['typesafe', 'typesafeai']]);
const iconIdentity = value => value.normalize('NFKC').toLowerCase().replace(/[\s._-]+/g, '');
const iconIdentities = new Map();
export function activateProviderCatalog(data = bundledCatalog, root = null) {
    library = createProviderCatalog(data);
    ({providerIcons, providerIconVersion, PROVIDER_ICON_FILES} = library);
    iconRoot = root;
    iconIdentities.clear();
    for (const [id, icon] of Object.entries(providerIcons)) {
        for (const name of [id, icon.name, icon.fullName,
            ...Object.keys(library.providerAliases).filter(alias => library.providerAliases[alias] === id)]) {
            if (!name) continue;
            const key = iconIdentity(name);
            // Do not guess when two marks have the same normalized name.
            iconIdentities.set(key, !iconIdentities.has(key) || iconIdentities.get(key) === id ? id : null);
        }
    }
}
activateProviderCatalog();

// Build matching from the installed catalog, so every later bundle immediately
// supplies defaults without a separate provider allowlist or saved fallback.
export function resolveProviderIcon(provider, options = {}) {
    if (typeof provider !== 'string') return undefined;
    const key = iconIdentity(provider);
    const id = library.resolveProviderIcon(provider)?.id
        || iconIdentities.get(key) || backendIconAliases.get(key);
    return id ? library.resolveProviderIcon(id, options) : undefined;
}

// An app-level artwork override may select any library mark. It never changes
// the provider/account ID sent to the backend. The library's variant contract
// remains restricted to related products for other consumers.
export function selectedProviderIcon(providerId, iconSource, style = 'monochrome', manifest = null) {
    return resolveProviderIcon(iconSource, {style}) || resolveProviderIcon(providerId, {style})
        || resolveProviderIcon(manifest?.name, {style}) || resolveProviderIcon(manifest?.displayName, {style});
}

export const PROVIDER_DASHBOARD_URLS = {
    augment: 'https://app.augmentcode.com/account',
    claude: 'https://claude.ai/settings/usage',
    codebuff: 'https://www.codebuff.com/usage',
    codex: 'https://chatgpt.com/codex/cloud/settings/analytics#usage',
    crof: 'https://crof.ai',
    cursor: 'https://www.cursor.com/dashboard',
    deepseek: 'https://platform.deepseek.com/usage',
    doubao: 'https://console.volcengine.com/ark/region:ark+cn-beijing/usage',
    kilo: 'https://app.kilo.ai/usage',
    'kimi-k2': 'https://platform.moonshot.cn',
    mistral: 'https://admin.mistral.ai/organization/usage',
    nanogpt: 'https://nano-gpt.com/usage',
    ollama: 'https://ollama.com/settings',
    'openai-api': 'https://platform.openai.com/usage',
    'opencode-go': 'https://opencode.ai/auth',
    synthetic: 'https://synthetic.new/landing/home',
};
