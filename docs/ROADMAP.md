# Roadmap — reviewed 29 September 2026

The Linux implementations and reusable baseline checks are in `main`. The next
development priority is [#17: coordinated verification and releases](https://github.com/hashimkarim/usagestat-bar/issues/17).
Finish the scoped acceptance work in [#4–#13](https://github.com/hashimkarim/usagestat-bar/issues/2)
and the support matrix in [#16](https://github.com/hashimkarim/usagestat-bar/issues/16)
alongside it. Windows and macOS follow the Linux release workflow.

This is the current planning snapshot. Dated reports retain their original
evidence and limitations. The [GitHub roadmap](https://github.com/hashimkarim/usagestat-bar/issues/2)
tracks completion; [FEATURES.md](../FEATURES.md) separates implemented behavior
from optional product work.

## What is complete

- The [shared feature contract and fixtures](BASELINE.md), reference GNOME
  checks, and reusable acceptance protocol satisfy
  [#3](https://github.com/hashimkarim/usagestat-bar/issues/3). Closing that
  deliverable does not certify every desktop, version or distribution.
- All initial Linux integrations are implemented. LXQt, Budgie and COSMIC now
  have native widgets; their earlier tray-only limitations no longer describe
  the native integrations. Polybar has real provider-logo glyphs and a private
  build that exposes module geometry for popup alignment.
- Provider artwork comes from the pinned AgenticDriver provider-icons
  `v0.1.0-alpha.1` dependency. Update artwork in that library; keep usage/backend
  integration in the independent `usagestat` project.
- Linux fixes, adapters and test tooling were integrated into `main` through
  `b671629`; `3809bda` classifies native panel limitations as compatibility skips.
  The old feature branches are deleted. There are no open PRs to consolidate.

The latest native recordings are from **27 September: 388 passed, 0 failed,
5 compatibility skips across 12 profiles**. The skips are GNOME's fixed top
panel (one grouped check) and Polybar's absent left/right panels (two checks
each for i3 and bspwm). They are accepted architecture/compatibility limits
and do not block the supported baseline.

The [fix report](reports/linux-port-fixes-2026-09-27.md) records those results,
the exact local evidence sources, 80 tray lifecycles, 155 logo-glyph comparisons,
and preferences checks. The 29 September integration also passed 36 shared
contracts, 33 Linux contracts, six placement tests and both package suites.
These are distinct runs; the native matrix was not rerun during this roadmap
review. Existing native recordings retain their source snapshots and hashes.

## Linux coverage and remaining acceptance

All rows below are x86_64 desktop-lab evidence. They are not claims of full
login lifecycle coverage for every desktop. The later release candidate must
have fresh evidence tied to its own source revision.

| Target | Recorded environment | Passed / skipped | Remaining acceptance owner |
| --- | --- | ---: | --- |
| GNOME | Fedora 44, Shell 50.5, Wayland | 19 / 1 | [#4](https://github.com/hashimkarim/usagestat-bar/issues/4): declared Shell 45–49 coverage, full GNOME login lifecycle, input/display review |
| Plasma | Fedora 44, X11 | 34 / 0 | [#5](https://github.com/hashimkarim/usagestat-bar/issues/5): Wayland and Plasma login lifecycle; September 7 manual approval remains scoped to its reviewed version |
| Cinnamon | Fedora 44, X11 | 36 / 0 | [#7](https://github.com/hashimkarim/usagestat-bar/issues/7): Mint/Cinnamon lifecycle and manual review |
| MATE | Fedora 44, X11 | 35 / 0 | [#8](https://github.com/hashimkarim/usagestat-bar/issues/8): reference login session, applet discovery and manual review |
| Xfce | Fedora 44, X11 | 35 / 0 | [#6](https://github.com/hashimkarim/usagestat-bar/issues/6): native-plugin VM lifecycle and manual review |
| LXQt | Fedora 44, X11, native panel plugin | 35 / 0 | [#9](https://github.com/hashimkarim/usagestat-bar/issues/9): full LXQt login/plugin lifecycle, Qt/display and manual review |
| Budgie | Fedora 44, Wayland, native applet | 35 / 0 | [#10](https://github.com/hashimkarim/usagestat-bar/issues/10): maintained reference login session and manual review |
| COSMIC | Fedora 44, patched Wayland lab, native applet | 35 / 0 | [#11](https://github.com/hashimkarim/usagestat-bar/issues/11): stock/reference COSMIC session and full lifecycle/manual review |
| Sway | Fedora 44, Wayland, native Waybar widget | 35 / 0 | [#12](https://github.com/hashimkarim/usagestat-bar/issues/12): login lifecycle, Waybar compatibility and manual review |
| Hyprland | Arch, patched Wayland lab, native Waybar widget | 35 / 0 | [#12](https://github.com/hashimkarim/usagestat-bar/issues/12): stock compositor compatibility, login lifecycle and manual review |
| i3 | Fedora 44, X11, private Polybar build | 27 / 2 | [#13](https://github.com/hashimkarim/usagestat-bar/issues/13): login lifecycle, font/build compatibility and manual review |
| bspwm | Fedora 44, X11, private Polybar build | 27 / 2 | [#13](https://github.com/hashimkarim/usagestat-bar/issues/13): login lifecycle, font/build compatibility and manual review |

The [September 7 VM evidence](reports/linux-acceptance.md#full-vm-lifecycle-and-preferences)
covers Ubuntu 24.04 and Fedora 44 Xfce **tray** sessions: 24 lifecycle and 44
preferences checks at 1×/2× in light/dark themes. Those runs predate the latest
native changes and do not certify native-plugin or other desktop login flows.
Separate Codex/Claude smoke checks used `usagestat 1.0.3`; their recorded
backend compatibility must be refreshed or explicitly retained for a release.

The [manual review queue](reports/linux-manual-review.md) remains open for ten
non-GNOME profiles other than Plasma. Automated recordings do not constitute
the user's manual approval. GNOME's remaining review belongs to #4.

Optional tray hosts still control icon size/order. Polybar supplies monochrome
logos, but color SVG/custom-image/partial-logo-fill and graphical multi-row
parity remain distinct limitations for #13 to review. Acceptance of the five
panel-placement skips does not automatically accept every visual difference.

## Next: a repeatable Linux release candidate (#17)

The [Linux release workflow](RELEASING.md) now defines hosted fast checks and
versioned package builds, a unified native lab with automatic screenshots and
videos, and publication gates for the candidate's exact commit and archives.
`release.json` defines the initial x86_64 prerelease scope and the required
scenarios. The native CI runner is deliberately awaiting host selection;
`LINUX_LAB_ENABLED` remains unset. No product release has been published.

Local lab execution can rehearse the complete pipeline. Activation requires a
provisioned isolated runner and a successful Actions dry run. The remaining
acceptance below, especially VM/login lifecycle and manual review, remains
separate from the automated native scenario gate.

The [September 29 clean-commit rehearsal](reports/linux-release-rehearsal-2026-09-29.md)
produced both candidate archives, **388 passes / 5 compatibility skips** across
all twelve profiles, validated screenshots and twelve decoded videos, and a
checksummed evidence archive. Fast checks also passed in Ubuntu 24.04 after
fixing the CI dependency list. This establishes a local rehearsal, not native
Actions runner activation or a published product release.

1. **Automate fast checks and packaging.** Run the existing shared/Linux
   contracts and GNOME/Linux package suites in CI. Build from a clean checkout
   and retain logs and installable artifacts. Define the initial desktop,
   session and architecture scope with #16.
2. **Coordinate native verification.** Provide one documented entry point for
   GNOME and the eleven other profiles, including target filtering and a full
   run for shared changes. Connect existing runners to an appropriate desktop
   lab/CI environment. Publish one matrix with source revision, environment
   and image identity, logs, screenshots/videos, and required/manual/untested/
   blocked/failed/skipped states. Recheck the selected VM lifecycle profiles
   against the candidate. Compatibility skips need explicit reasons; missing
   infrastructure or untested supported behavior cannot be relabeled as skips.
3. **Produce and verify one release candidate.** Build versioned GNOME and
   Linux artifacts from the same commit, with checksums, dependency/backend
   compatibility, supported scope, installation/upgrade instructions and a
   shared changelog. Gate included targets on their required checks. Keep
   experimental or blocked combinations visible; document any exclusion.
   Verify config-preserving upgrades before publishing the release.

The initial acceptance demonstration is a clean-checkout run producing those
artifacts and evidence, plus a representative shared change whose affected
frontends are covered by the checks. Windows/macOS jobs join when their ports
are ready; they do not block this Linux workflow.

## Alongside releases: explicit support coverage (#16)

Prioritize the combinations that change the support claim: Plasma Wayland,
native desktop login/upgrade/uninstall (including Xfce's plugin), and stock
COSMIC/Hyprland behavior where the lab currently uses compositor patches.
Complete the current manual review queue for the release scope.

Track physical multimonitor/hotplug, fractional scaling, keyboard/screen-reader
journeys, theme transitions, other notification daemons and provider-specific
external setup separately. The older virtual-output and integer-scale checks
do not establish that coverage. Arbitrary custom-command process trees also
remain an explicit lifecycle check.

Debian as a separate distribution, Mint, openSUSE, a COSMIC reference image,
other desktop versions/sessions and arm64 remain unverified. LXDE, Pantheon,
Deepin, Enlightenment and UKUI are inventory items; first evaluate whether an
existing adapter fits before creating a new port. These extensions to the
matrix are not prerequisites for beginning #17. Distribution-repository/store
publishing is a later destination choice, not required to establish the first
installable release candidate.

## Later platform baselines

- [Windows #14](https://github.com/hashimkarim/usagestat-bar/issues/14): no
  implementation yet. Verify backend support, then native tray/process/path
  adapters, an installer and real Windows lifecycle/display checks.
- [macOS #15](https://github.com/hashimkarim/usagestat-bar/issues/15): no
  implementation yet. Verify backend support and architecture scope, then
  menu-bar/process/path adapters, an application bundle and real Mac UI checks.

These have their own later milestone. Share contracts, fixtures and appropriate
behavior; preserve native integration and the independent backend. Signing,
notarization and store destinations are release work for the respective port.
