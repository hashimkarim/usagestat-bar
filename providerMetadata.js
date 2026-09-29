// Shared presentation defaults for the desktop frontends.
// Immutable dependency snapshot; update using scripts/update-provider-icons.sh.
export {PROVIDER_ICON_FILES, providerIcons, providerIconVersion,
    searchProviderIcons as providerIconChoices} from './assets/provider-icons/index.js';
import {providerIcons, providerAliases, resolveProviderIcon as resolveLibraryIcon} from './assets/provider-icons/index.js';

// Backend IDs occasionally differ from the library's brand ID. A new exact
// upstream ID/alias always wins over these compatibility names.
const backendIconAliases = new Map([['typesafe', 'typesafeai']]);
const iconIdentity = value => value.normalize('NFKC').toLowerCase().replace(/[\s._-]+/g, '');
const iconIdentities = new Map();
for (const [id, icon] of Object.entries(providerIcons)) {
    for (const name of [id, icon.name, icon.fullName,
        ...Object.keys(providerAliases).filter(alias => providerAliases[alias] === id)]) {
        if (!name) continue;
        const key = iconIdentity(name);
        // Do not guess when two marks have the same normalized name.
        iconIdentities.set(key, !iconIdentities.has(key) || iconIdentities.get(key) === id ? id : null);
    }
}

// Build matching from the installed catalog, so every later bundle immediately
// supplies defaults without a separate provider allowlist or saved fallback.
export function resolveProviderIcon(provider, options = {}) {
    if (typeof provider !== 'string') return undefined;
    const key = iconIdentity(provider);
    const id = resolveLibraryIcon(provider)?.id
        || iconIdentities.get(key) || backendIconAliases.get(key);
    return id ? resolveLibraryIcon(id, options) : undefined;
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
