# Linux release automation rehearsal — 29 September 2026

The complete local release pipeline passed at clean commit
`2f83dd146c2a085cc80cb8a921c287ea650392a6`: **388 native checks passed, zero failed,
five explicit compatibility skips across all twelve profiles**. The candidate
archives were installed in the sessions, not restaged from the working tree.
Every passed scenario has a validated PNG; all twelve H.264 recordings were
fully decoded and checked against the scenario timestamps. Assembly and the
publisher's dry run succeeded. No tag or product release was created.

This is evidence for that candidate commit. The follow-up changes correct the
Ubuntu CI dependency list and harden report/failure validation; they do not
change application code or the native scenarios. Future tags require their own
fresh native run, even when an older candidate passed.

## Verification

| Profile | Passed | Compatibility skips | Video duration |
| --- | ---: | ---: | ---: |
| bspwm | 27 | 2 | 89.4 s |
| budgie | 35 | 0 | 133.2 s |
| cinnamon | 36 | 0 | 123.2 s |
| cosmic | 35 | 0 | 179.4 s |
| gnome | 19 | 1 | 24.2 s |
| hyprland | 35 | 0 | 124.6 s |
| i3 | 27 | 2 | 57.6 s |
| lxqt | 35 | 0 | 140.6 s |
| mate | 35 | 0 | 164.8 s |
| plasma | 34 | 0 | 125.0 s |
| sway | 35 | 0 | 154.8 s |
| xfce | 35 | 0 | 157.8 s |

The skips remain GNOME's fixed top panel and Polybar's absent left/right panel
edges on i3 and bspwm. Missing infrastructure, missing scenarios, corrupt media,
wrong profile identity, stale commits and changed archive hashes block release.

Fast checks passed on the Fedora development host and an isolated Ubuntu 24.04
container: 36 shared contracts, 33 Linux contracts, six placement tests, both
package lifecycle suites and release-tool regression tests. Ubuntu initially
exposed missing `rsync` and Rsvg introspection packages; adding them made all
suites pass and the dependency list is now in CI and the setup documentation.
The release-tool suite also tests rejection paths using real generated media.

Both archives and their manifest were byte-identical when rebuilt on the same
host/toolchain. Ubuntu and Fedora produced identical extracted ZIP contents and
uncompressed tar bytes, but different compressed archives because their
compression libraries differ. Evidence is bound to the actual archive hashes;
a deliberate attempt to combine the Ubuntu archives with the Fedora candidate's
native evidence was rejected.

## Candidate identity and local artifacts

- Version: `0.1.0-rc.1` (unpublished prerelease candidate).
- Linux archive SHA-256: `ff9d4011b52ad27f21a652b2608861fd0303123a0ddd22e2682579af6304aa59`.
- GNOME archive SHA-256: `0a3b812adc18b6f5017daae81cbb09aa7882aea56f7c49e8f509df7373f91be2`.
- Local checks/build/native evidence: `artifacts/release-rehearsal-1/`.
- Review gallery: `artifacts/release-rehearsal-1/native/gallery/index.html`.
- Assembled assets/checksums/verification: `artifacts/release-rehearsal-1/release/`.
- Ubuntu checks and package comparison: `artifacts/release-ubuntu-checks/`.

The artifacts are ignored local files, not committed media or public downloads.
Once configured, the Actions workflow retains check logs, candidate archives,
curated native evidence and verified release assets as downloadable artifacts.
Published releases also carry the compressed evidence gallery and checksums.
The gallery contains fixture account data only; process-environment dumps and
source/frame caches are excluded from uploads.

## Remaining activation and acceptance

The owner chose to select the native runner host later. No runner was registered
and `LINUX_LAB_ENABLED` remains unset. Hosted checks can run immediately; native
CI activation needs the documented isolated worker, images, render device and
a successful Actions rehearsal. This readiness block cannot be counted as a skip.
See [release setup](../RELEASING.md) for the exact commands and retry rules.

This run does not close manual desktop review, full native login/reboot/upgrade
VM coverage, stock COSMIC/Hyprland acceptance, physical display/accessibility
coverage or other architectures/distributions. Live backend evidence remains
the separately retained September 7 `usagestat 1.0.3` smoke. Those boundaries
are recorded in the manifest, release notes and [roadmap](../ROADMAP.md).

Jev remains an optional future exploratory action selector/failure classifier.
The scripted native drivers supply observation, execution and recordings;
model confidence does not approve releases or waive required checks.
