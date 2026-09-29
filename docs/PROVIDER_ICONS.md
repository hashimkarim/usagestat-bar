# Bundled provider icon updates

The app bundles the latest **stable GitHub release** of
[AgenticDriver provider-icons](https://github.com/agenticdriver/provider-icons/releases/latest).
It keeps the complete catalog, artwork variants and license/provenance files.
The picker searches upstream aliases, localized names and model names and shows
the bundled version and mark count. Marks and SVG files have different counts:
one mark can have monochrome, color, brand and wordmark variants.

Default provider icons are resolved from that catalog on each app start. A new
matching mark is adopted after updating the app, without choosing it manually or
resetting provider settings. Matching uses canonical IDs, upstream aliases and
unambiguous names, allowing differences in spacing, dots, hyphens and underscores.
Plugin manifest names are also checked when the provider ID has no match; account
display names do not affect the icon. The backend's `typesafe` ID maps to the
library's `typesafeai` mark. There is no separate list of supported icon providers.

Custom images and explicitly selected library marks take priority. Clearing those
overrides restores the current automatic default. GNOME and preference previews
prefer the matching library icon over artwork shipped by the backend plugin,
keeping plugin artwork as a fallback when no library mark matches. Linux graphical
frontends and the generated Polybar font use the same catalog resolver. Matching
does not use fuzzy search or infer a brand from part of a provider name.

`assets/provider-icons/source.json` pins the exact archive URL and SHA-256;
`package.json` records its version. Builds and installed applications use that
committed snapshot offline. Rebuilding an older commit preserves its icon version.

## Automatic refreshes

[Refresh bundled provider icons](../.github/workflows/provider-icons.yml) runs
daily at 06:17 UTC and can be dispatched manually. It resolves GitHub's latest
stable release, checks the release asset digest and manifest, and rebuilds the
Polybar font from every default monochrome mark. Existing codepoints are retained;
wordmark/brand variants are not mistaken for additional providers.

The bundle and font are staged together before replacement. Failed downloads,
digest checks or font generation leave the previous files intact. The workflow
commits only the generated bundle/font, runs the offline contracts, all glyph
silhouette comparisons, package checks and the GTK picker tests, then pushes
the tested commit to main. A concurrent main update causes a normal push refusal;
it never force-pushes. Successful updates dispatch the usual candidate CI.
Unchanged releases produce no commit. Failures remain visible in Actions.

The Linux release workflow checks upstream freshness **before building** its
candidates. A stale bundle or unavailable upstream metadata blocks that release
build. Refresh and commit before making a new release tag. Existing tags and
published archives are never rewritten. Ordinary tests and offline package
builds do not require network access.

## Refresh locally

On Ubuntu/Debian, install the font build dependencies and use the system Python
so its GObject introspection bindings are available:

```bash
sudo apt-get install python3-venv python3-gi gir1.2-rsvg-2.0 librsvg2-common potrace
/usr/bin/python3 -m venv --system-site-packages artifacts/icon-tools
artifacts/icon-tools/bin/python -m pip install -r platforms/polybar/requirements-build.txt
artifacts/icon-tools/bin/python scripts/update-provider-icons.py
```

With that environment active, `./scripts/update-provider-icons.sh` does the same.
There is no URL/hash to edit for routine updates. `--force` re-vendors the same
release and regenerates its font. To check freshness without changing files or
installing font build tools:

```bash
python3 scripts/update-provider-icons.py --check
```

The checker exits 0 when current, 1 when stale, and 2 on verification/network
errors. `GH_TOKEN`/`GITHUB_TOKEN` are optional for public GitHub API rate limits;
they are passed only to GitHub's API, never to asset downloads or command arguments.

Run the normal contract/package checks, `tests/provider-icons-test.py`,
`tests/linux/polybar-font.py` and `bash tests/linux/icon-picker.sh` before committing
the refreshed bundle and font. Check dependencies and screenshot evidence are
documented in [TESTING.md](TESTING.md). SVG edits belong in the upstream library.
