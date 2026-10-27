# Independent provider icon updates

The user requires new provider-icons releases to reach installed bars without a
bar package update, with daily checks and manual update as the third CLI section
entry. This is a prerequisite to the first public bar release, not a replacement
for the desktop-distribution task.

## Next Agent Prompt

Data-only runtime updates, shared scheduling, manual controls and hot catalog
adoption are implemented and offline checks pass. The companion provider-icons
repository now prepares prebuilt font data with a stale-input release gate. Finish
independent code review, then commit and run exact-candidate desktop release gates.
Preserve the staged distro packaging changes and unrelated screenshots/.

- [x] Pure manifest catalog with parity tests; central SVG path resolution.
- [x] Bounded data-only acquisition, validation, atomic cache activation and rollback.
- [x] Runtime lifecycle, persisted daily scheduling and cross-process hot reload.
- [x] Third CLI monitor with Update now, failure/status UI and visual verification.
- [ ] Polybar font release/activation contract, and final all-target validation.

## Contracts and decisions

Three independent drafts agree on an immutable catalog generation and atomic
active pointer, a shared update operation, a pure resolver over JSON, and host-owned
cleanup. Search/alias/artwork/color semantics must match the bundled library.
Saved custom files and explicitly selected marks are never rewritten by updates.
All SVG consumers resolve through one catalog owner; derived caches include the
generation or content hash. An invalid generation cannot replace the last good one.

GNOME and Linux consumers load the current generation at start, watch atomic
pointer changes, and redraw visible content. Timers/network/monitors are canceled
on disable/close. A daily attempt uses persisted time; manual Update now bypasses
the interval but not validation or an in-flight update.

Use GJS for GNOME runtime acquisition to meet EGO's preference for GJS scripts.
Validate stable release identity, SHA-256, archive limits/paths/types, schema,
referenced file completeness, and SVG external/executable content restrictions.
Do not extract archive JS or execute any downloaded build script. Downloaded SVGs
and JSON are interpreted by installed reviewed code.

Polybar's font is a separate data dependency: new SVGs do not create glyphs.
Prepare prebuilt font + stable glyph mapping in the provider-icons release process
instead of installing font build tools on users' desktops. Preserve existing
codepoints. Fontconfig refresh alone may not update an already running Polybar;
test activation and otherwise explicitly report panel restart needed. Do not
restart unrelated panels. Do not silently claim full Polybar updates without this.

Tests use offline fixtures: a new mark plus changed existing artwork, alias/search
parity, corrupt digest/schema/SVG, interrupted update, concurrent callers, fake
clock scheduling, cache fallback and live consumers. UI verification requires
compare-screenshots and an unprimed screenshot-critique before claiming acceptance.

## Validation evidence

Offline tests cover new marks, resolver parity, SHA rejection, data-only extraction,
daily scheduling, concurrent callers and a competing updater lease, cached startup,
corruption fallback, rejection of resolver-incompatible catalogs before activation,
native font installation and an unavailable cache. Existing
shared/Linux contracts and both package lifecycle suites pass. The GTK picker
harness captures the new CLI section in both themes under artifacts/runtime-icon-ui.
Fresh visual review found no clipping or overlap; it noted faint secondary text
and an icon-only refresh action, consistent with adjacent native GTK controls.
Both unchecked and populated current-version states are captured. A second visual
review confirms timestamps and versions fit in both themes. Network failure states
are covered functionally, not claimed as visually verified.

The new crossmodel mark exposed unsupported dashed strokes in the font generator.
Both generators now trace dashed outlines through librsvg/Potrace; all 432 glyph
silhouette checks pass without weakening the threshold. The updater validates
font table bounds, the SFNT checksum and character-map coverage before activation.

Independent code review identified malformed XML reaching activation and a font
symlink into disposable cache storage. Both are fixed: the installed SVG loader
parses bounded-size artwork before committing the active pointer, and fonts plus
their glyph map and attribution live in durable user data outside the runtime
installation. Regression tests exercise malformed XML, cache clearing and package
upgrade/uninstall after font updates. Review evidence is retained under
artifacts/runtime-icons-review; the original verdict is not rewritten.
