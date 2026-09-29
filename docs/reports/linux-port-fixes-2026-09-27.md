# Linux port fixes and verification — 27 September 2026

Four confirmed problems were fixed in the Linux integrations. The selected
final native runs pass 388 checks across 12 profiles, with no failed checks
and five checks skipped for platform compatibility. This supplements the
[section-alignment review](linux-section-alignment-fixes-2026-09-11.md).

## Fixes

- **Saved provider marks:** Linux snapshots now validate `iconSource` through
  the shared provider-icons resolver. Supported product aliases work;
  missing or unrelated alternatives fall back to the provider's default mark.
  Account keys, provider identities, grouping and usage are preserved.
- **Malformed custom SVGs:** invalid XML previously propagated into the
  combined panel image and could interrupt snapshot rendering for every
  provider. Custom images are now decoded separately; unreadable images
  receive the existing visible fallback.
- **Custom SVGs without a viewBox:** files with intrinsic width and height
  previously disappeared from panels and trays. Rendering now preserves
  those coordinates, aspect ratio, transparency and theme color. Custom
  images are embedded as bounded PNGs with a maximum dimension of 128 pixels;
  bundled catalogue SVGs retain their vector rendering.
- **Cinnamon tooltip overlap:** the applet tooltip could reappear over an
  open UsageStat popup after pointer movement. It is now suppressed while
  a UsageStat window has focus and becomes available after dismissal. The
  focus listener is disconnected when the applet is removed.

The custom SVG regressions were reproduced before the renderer changes.
The new native Cinnamon hover/dismiss/reopen check also failed before its
fix and passes afterward.

The native interaction runner now waits for popup positioning to finish
before asserting edge and section alignment. Earlier Plasma and Cinnamon
samples captured transient opening positions; the corresponding screenshots
showed the final correct positions. The bounds, four-pixel section tolerance
and reopening checks were retained. No Plasma application change was needed.

## Native results

| Profile | Passed | Failed | Skipped (compatibility) |
| --- | ---: | ---: | ---: |
| GNOME | 19 | 0 | 1 |
| Plasma | 34 | 0 | 0 |
| Cinnamon | 36 | 0 | 0 |
| MATE | 35 | 0 | 0 |
| Xfce | 35 | 0 | 0 |
| LXQt | 35 | 0 | 0 |
| Budgie | 35 | 0 | 0 |
| COSMIC | 35 | 0 | 0 |
| Sway | 35 | 0 | 0 |
| Hyprland | 35 | 0 | 0 |
| i3 | 27 | 0 | 2 |
| bspwm | 27 | 0 | 2 |
| **Total** | **388** | **0** | **5** |

The compatibility skips are GNOME's fixed top-panel edge (one grouped check)
and Polybar's lack of vertical panels (left and right, separately for i3 and
bspwm). They do not block the supported Linux baseline and are excluded from
pass/fail counts. On 29 September the reporting classification changed from
`unsupported` to `skipped`; the original raw recordings retain their original
status labels. This is a classification change, not a new native test run.
The tests cover native clicks and scrolling, pinning, provider count, popup
content resizing and scrolling, dismissal/reopening, panel placement, section
alignment and preferences activation. GNOME uses its separate Shell driver.

Additional checks passed:

- 36 backend/configuration contracts; 33 Linux contracts and six placement tests.
- GNOME packaging and Linux installation, upgrade, removal, unusual paths,
  configuration preservation and file ownership checks.
- 80 tray lifecycles and 160 native property snapshots through garbage collection.
- 155 Polybar glyph comparisons against the vendored SVG silhouettes.
- 11 real GTK preferences checks at 1×, including provider creation/removal,
  custom icons, terminal/URL actions, light/dark themes and process cleanup.
  XTerm was installed only in the disposable preferences-test container.

## Local evidence

The self-contained gallery is at
`artifacts/linux-repair-gallery-2026-09-27/index.html`. Its `summary.json`
records each selected source run; screenshots, videos and raw results are
included. Representative popup and preferences screenshots were inspected.
All 12 videos decoded successfully.

The gallery regenerated with compatibility-skip labels is at
`artifacts/linux-compatibility-skips-2026-09-29/index.html`. Its raw result files
are byte-for-byte identical to the original gallery's results.

Selected runs:

- `artifacts/gnome.FHR594`: isolated GNOME 50.5 Wayland session.
- `artifacts/linux-repair-final-2026-09-27/cinnamon`: final applet and runner.
- `artifacts/linux-repair-rechecked-2026-09-27/plasma`: positioning recheck.
- `artifacts/linux-repair-verified-2026-09-27`: the other nine port profiles.
- `artifacts/linux-repair-preferences-verified-2026-09-27`: GTK preferences.

Earlier diagnostic runs, the tooltip reproduction in
`artifacts/linux-tooltip-before-2026-09-27`, and the renderer's before/after
contract logs remain available. Failed runs were not rewritten as passing.
Port recordings freeze their source and record its digest, container image
identity and package versions. The GNOME extension is packaged into its own
disposable session. Test artifacts are local and excluded from Git.

## Verification limits

These are single-output desktop sessions with synthetic provider accounts.
The Fedora and Arch lab images retain the previously documented COSMIC and
Hyprland compositor compatibility patches. This pass did not rerun the older
Ubuntu/Fedora VM acceptance suite or certify other distributions and CPU
architectures. Multiple monitors, hotplug, fractional scaling and accessibility
still need dedicated verification. Automated checks do not replace the
remaining user manual reviews described in the [Linux guide](../LINUX.md).
