# Installation

[Back to the README](../README.md) · [API reference](api.md)

`@agenticdriver/provider-icons` is an ESM library containing JavaScript,
TypeScript declarations and SVG assets. It has no platform-specific binaries.
Use a modern ESM-capable runtime or browser; the React entrypoint requires your
application's React 18.3.1 or 19. React is an optional peer dependency. See the
[supported environments and 1.x stability policy](stability.md).

## Package managers

Install it as a project dependency using one package manager:

| Client | Install |
| --- | --- |
| npm | `npm install @agenticdriver/provider-icons` |
| pnpm | `pnpm add @agenticdriver/provider-icons` |
| Yarn | `yarn add @agenticdriver/provider-icons` |
| Bun | `bun add @agenticdriver/provider-icons` |
| Deno | `deno add npm:@agenticdriver/provider-icons` |

These clients consume the same npm package. Commit the generated lockfile.
To pin a release explicitly, install `@agenticdriver/provider-icons@1.0.0`.

Check an npm installation:

```sh
node --input-type=module -e "import { searchProviderIcons } from '@agenticdriver/provider-icons'; console.log(searchProviderIcons('千问')[0].id)"
```

Expected output: `qwen`. See the [React and JavaScript examples](../README.md).

### Update

```sh
npm install @agenticdriver/provider-icons
```

For another package manager, repeat its install command above. A CDN URL or
archive pinned to a version changes only when you deliberately update it.

### Remove

```sh
npm uninstall @agenticdriver/provider-icons
```

The equivalent commands are `pnpm remove`, `yarn remove`, `bun remove`, and
`deno remove npm:@agenticdriver/provider-icons`. Remove application imports too.

## CDN

[jsDelivr](https://www.jsdelivr.com/package/npm/@agenticdriver/provider-icons)
and [UNPKG](https://unpkg.com/@agenticdriver/provider-icons@1.0.0/)
serve the public npm package. Use a full version and filename for reproducible URLs.

```html
<img
  src="https://cdn.jsdelivr.net/npm/@agenticdriver/provider-icons@1.0.0/assets/claude-color.svg"
  width="32" height="32" alt="Claude"
/>
```

The equivalent UNPKG asset is:

```text
https://unpkg.com/@agenticdriver/provider-icons@1.0.0/assets/claude-color.svg
```

For browser JavaScript without a bundler:

```html
<span id="provider-icon"></span>
<script type="module">
  import { mountProviderIcon } from 'https://cdn.jsdelivr.net/npm/@agenticdriver/provider-icons@1.0.0/dom.js';
  mountProviderIcon('#provider-icon', 'claude', { style: 'color', size: 32, label: 'Claude' });
</script>
```

CDN use makes network requests. Install or vendor the files for offline use.
Monochrome SVGs in an external `<img>` cannot inherit the page's text colour;
use inline SVG, a component, or a CSS mask when you need `currentColor`.

## Archives and native apps

[GitHub Releases](https://github.com/agenticdriver/provider-icons/releases) also
provide the same npm-format archive with `SHA256SUMS`. JavaScript projects can
install a specific archive directly:

```sh
npm install --save-exact https://github.com/agenticdriver/provider-icons/releases/download/v1.0.0/agenticdriver-provider-icons-1.0.0.tgz
```

For Python, Go, Rust, GTK and other native applications, bundle the manifest and
assets. No language-specific wrapper is required. Download and check a release:

```sh
curl -fLO https://github.com/agenticdriver/provider-icons/releases/download/v1.0.0/agenticdriver-provider-icons-1.0.0.tgz
curl -fLO https://github.com/agenticdriver/provider-icons/releases/download/v1.0.0/SHA256SUMS
sha256sum -c SHA256SUMS
tar -xzf agenticdriver-provider-icons-1.0.0.tgz
```

Read `package/manifest.json`; its filenames refer to `package/assets/`.
Bundle `LICENSE`, `NOTICE` and the upstream `licenses/` alongside the assets.
On macOS, `shasum -a 256 -c SHA256SUMS` verifies the same checksum file.

The repository's `scripts/vendor.py` can also copy a verified release into a
dedicated generated directory using its `--sha256` and `--target` arguments.
That helper flattens `assets/` to match manifest filenames. It removes obsolete
SVGs from its target, so use a directory reserved for this library. GJS can
import the supplied `index.js` directly.
