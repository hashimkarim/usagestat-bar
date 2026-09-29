# API reference

[Install the package](installation.md) · [Browse the gallery](https://agenticdriver.dev/icons) · [Back to the README](../README.md)

## React

```tsx
'use client';

import { Claude } from '@agenticdriver/provider-icons/react';

export default () => <Claude.Combine size={32} mode="color" />;
```

Use `<Claude />`, `<Claude.Color />`, `<Claude.Text />`, `<Claude.Combine />`
or `<Claude.Avatar />`. Components handle sizing, layout, colour fallback and
hydration-safe SVG IDs. No wrapper, stylesheet or `dangerouslySetInnerHTML` is
needed in your app. `size` is the height in pixels (default 24); width follows the
artwork. `mode="color"` selects colour for Combine/Avatar; `style` remains a normal
React CSS object. React 18 and 19 are supported. The client directive makes
these examples usable in a Next.js App Router component as well.

Text, Combine, Brand/BrandColor and TextCn/TextCnColor are exported only where the
catalogue contains that artwork. Named imports are tree-shakable: importing one
provider does not include all the other providers' SVGs. For dynamic selection:

```tsx
'use client';

import { ProviderIcon } from '@agenticdriver/provider-icons/react';

export default () => <ProviderIcon provider="ppio" artwork="combine" size={32} mode="color" />;
```

Icons are decorative by default. Add `aria-label` for a standalone accessible
image, or label the surrounding button. Standard SVG props and refs are supported.

Monochrome inherits `currentColor`, so it follows the application's light/dark
text colour without a theme provider or a JavaScript media-query listener.
Original colour artwork keeps its fixed brand colours. Set the surrounding
text colour or pass a normal `style={{color: ...}}` to override monochrome ink.

## Brand colours

```tsx
Claude.primaryColour; // '#D97757' — also exposed as Claude.colorPrimary
Claude.colourTheme;   // ['#D97757'] — also exposed as Claude.colorTheme
```

Without React:

```js
import { providerIconTheme } from '@agenticdriver/provider-icons';
const theme = providerIconTheme('claude');
theme.primaryColour;
theme.colourTheme;
```

These are immutable, normalised hex values from the source's `COLOR_PRIMARY`
and additional literal `COLOR_*` definitions, at the same pinned LobeHub revision
as the artwork. They are not sampled from pixels or a complete brand style guide.
Where no source definition exists, the primary is `undefined` and the palette
is empty. Unknown providers return `undefined`; existing aliases are accepted.
The same metadata is included in `providerIcons` and the native JSON manifest.
Update the verified snapshot with `npm run sync:colours` after an artwork-source
update; generation rejects a mismatched revision or changed source digest.

The [official-source colour audit](https://github.com/agenticdriver/provider-icons/tree/main/research/brand-colours) records
brand guides, press kits, artwork colourways and unresolved entries across the
catalogue. Its dated research data is separate from the released colour metadata.

## JavaScript

```js
import { mountProviderIcon } from '@agenticdriver/provider-icons/dom';

mountProviderIcon('#provider-icon', 'ppio', { artwork: 'combine', style: 'color', size: 32 });
```

Pass a container selector or element. The helper inserts a complete sized SVG and
handles unique IDs; missing icons leave the container unchanged. Use
`createProviderIcon(provider, options)` when you want the SVG element without
mounting it. Add `label` for an accessible image, or `className` to customise it.

## SVG and native applications

```js
import { providerIconSvg } from '@agenticdriver/provider-icons/svg';

const svg = providerIconSvg('ppio', { artwork: 'combine', style: 'color', size: 32 });
```

The SVG helper also supports `combine` (logo plus actual vector wordmark) and
`avatar` (padded logo in a circle). `size` is optional for this lower-level helper.
IDs are generated automatically; a stable explicit `prefix` is available for
manual hydration or deterministic exports. React components manage this for you.

## Catalogue lookup

```js
import {resolveProviderIcon} from '@agenticdriver/provider-icons';
resolveProviderIcon('codex', {style: 'color', variant: 'chatgpt'});
// {id: 'openai', file: 'openai.svg', style: 'monochrome', ...}
resolveProviderIcon('claude', {style: 'color', variant: 'claude-code'});
```

`style` is `monochrome` or `color`. Marks without a colour variant return the
monochrome artwork and report the actual style. `variant` selects a related
product's mark, never an account, model, provider runtime or billing route.
Unknown providers or unrelated alternatives return `undefined` for an app's
own fallback. ChatGPT/OpenAI and Codex are alternatives; Anthropic, Claude and
Claude Code are alternatives; Copilot and GitHub Copilot are alternatives.
Grok now has its own mark, with xAI as an alternative. OpenCode now has its own
mark, with the existing `opencode-go` mark as an alternative. The original IDs
and artwork remain available.

`artwork` selects `icon` (default), `brand`, `text` or `text-cn` where available:

```js
resolveProviderIcon('ai21', {artwork: 'brand', style: 'color'});
resolveProviderIcon('alibaba', {artwork: 'text-cn'});
```

Unavailable artwork returns `undefined`; colour fallback applies within the
selected artwork. `variant` still selects a related product. Enumerate
`providerIcons` and each entry's optional `artworks` to build galleries without
hardcoded lists. `providerIconVersion` exports the installed package version
for version labels and release links; `manifest.json` has `packageVersion` too.

Catalogue entries are deeply immutable, including `alternatives`, `artworks`,
search terms and palettes. Search returns a new sortable array of immutable
entries. `resolveProviderIcon` returns an independent result and a copy of its
alternatives. Copy catalogue metadata before customising it for your app.
See the [1.x stability policy](stability.md) for compatibility guarantees.

For inline browser SVG, import `providerIconSvg` from the `/svg` entrypoint.
An optional unique `prefix` makes exports deterministic. This static markup
has no scripts or external references. Only exact allowlisted rendering styles
(masks, blending, grayscale and stroke width) survive. It is decorative; label
the surrounding UI. Monochrome artwork inherits `currentColor` inline; an
external `<img>` cannot inherit text colour. Render or use a mask for that case.

For Python, Go, Rust, GTK or other applications, read `manifest.json` and serve
or bundle `assets/*.svg`. GJS can import `index.js` directly. Non-npm apps can
vendor an immutable npm-format release tarball using `scripts/vendor.py` with
its required SHA-256. The copied catalogue and assets are generated dependency
files: update the version/digest and run the vendor script, never edit copies.


## Search and categories

```js
import { searchProviderIcons, providerIcons } from '@agenticdriver/provider-icons';

searchProviderIcons('千问'); // Qwen, using the source's localized name
searchProviderIcons('Nemotron'); // Nvidia
searchProviderIcons('claude code', {category: 'application'});
providerIcons.qwen.fullName; // 'Qwen (千问)'
```

Search accepts aliases, alternate names, case differences and punctuation. Results
contain `id` and the catalogue entry; exact names rank first. Categories are
`model`, `provider` and `application`. Use `other` to find entries without a source
category, or omit the filter to search everything. These categories describe the
icon catalogue; they do not indicate SDK/provider support.

Entries expose `fullName`, optional `category`, immutable `searchTerms` and an
`upstreamUrl` to the corresponding LobeHub reference or reviewed PR. The same
metadata is in `manifest.json`. `npm run sync:discovery` refreshes source snapshots
at the already-reviewed artwork revisions; builds verify their hashes and reject
stale revisions. Run it after adding PRs or updating the mainline artwork source.
