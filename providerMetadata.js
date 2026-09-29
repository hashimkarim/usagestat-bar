// Shared presentation defaults for the desktop frontends.
// Immutable dependency snapshot; update using scripts/update-provider-icons.sh.
export {PROVIDER_ICON_FILES, providerIcons, providerIconVersion, resolveProviderIcon,
    searchProviderIcons as providerIconChoices} from './assets/provider-icons/index.js';
import {resolveProviderIcon} from './assets/provider-icons/index.js';

// An app-level artwork override may select any library mark. It never changes
// the provider/account ID sent to the backend. The library's variant contract
// remains restricted to related products for other consumers.
export function selectedProviderIcon(providerId, iconSource, style = 'monochrome') {
    return resolveProviderIcon(iconSource, {style}) || resolveProviderIcon(providerId, {style});
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
