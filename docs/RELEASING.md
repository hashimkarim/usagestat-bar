# Linux release automation

The first destination is **GitHub Releases**, with one GNOME extension ZIP and
one Linux runtime/source archive. The latter serves all eleven other native
profiles. No product release has been published by this setup work. The initial
version in `release.json` is `0.1.0-rc.1`.

The hosted [Linux checks workflow](../.github/workflows/ci.yml) runs on main,
PRs and manual requests. It runs the shared/Linux contracts, both package
lifecycle suites, release-gate regression tests, then builds from `git archive`
of the clean tested commit. Logs and candidate packages are downloadable Actions
artifacts, retained for 30 days. A package build alone does not approve a release.

The [release evidence workflow](../.github/workflows/release.yml) runs on version
tags or manual requests. It adds the full native lab, verifies media and results,
then assembles checksummed assets. Manual runs default to **dry run**. Tag pushes
publish only after every gate passes. Only the final hosted publishing job has
write permission. No store credentials or live provider accounts are required.

## Native runner: not activated yet

The owner chose to select the runner host later. No runner is registered by
these changes. `LINUX_LAB_ENABLED` must remain unset until an isolated worker is
provisioned. Without it, the release workflow builds the packages, then fails
with an explicit readiness error before queuing a native job. This is a blocked
release, not a compatibility skip.

Provision an x86_64 Linux worker with label `usagestat-linux-lab` (and GitHub's
standard `self-hosted`, `linux`, `x64` labels). The existing reference host is
Fedora 44 with GNOME Shell 50.5. Requirements:

- Python 3.11+, Bash, Git, GJS, GNOME Shell with headless Wayland support, GLib
  tools, D-Bus, dconf, zip/unzip, FFmpeg with libx264, ffprobe, Podman and the
  GNOME background assets. The desktop install provides GNOME's runtime dependencies.
- Rootless Podman user namespaces/subuid/subgid, enough disk for both desktop
  images and captures, and a usable `/dev/dri/renderD128` for nested Hyprland.
  The current development host has 30 GiB RAM; allow at least 16 GiB for two
  profiles at once. This capacity estimate is not a minimum-memory certification.
- The prepared `localhost/usagestat-linux-lab:44` and
  `localhost/usagestat-hyprland-lab:arch` images, including cached backgrounds.
  Run `tests/linux/build-lab.sh fedora`, `... hyprland`, then `... backgrounds`
  as the worker user. These builds include the pinned private Polybar and
  documented COSMIC/Hyprland patches; keep their build logs. Distribution
  repositories move: the evidence records actual image IDs/package versions.
- Prepare the host GNOME wallpaper cache with
  `python3 tests/linux/fetch-backgrounds.py --target gnome`. It is checksum
  verified. For a custom location set `USAGESTAT_LAB_BACKGROUND_ROOT`.
- Set `USAGESTAT_PODMAN_ROOT` in the runner service environment if its image
  storage is not `$HOME/.local/share/containers/storage`. Set
  `USAGESTAT_LAB_RENDER_NODE` for another render device. Do not change the
  developer's desktop/session or mount a personal home into the worker.

Prefer a disposable VM/ephemeral runner with its own account and image storage;
keep live provider credentials and publication secrets out of it. This is a
public repository: workflow event filters do not isolate a compromised
persistent runner. GitHub explains the risks and ephemeral-worker guidance in
[its self-hosted runner documentation](https://docs.github.com/en/actions/reference/runners/self-hosted-runners).
The native job accepts repository tag/manual events; fork PRs run only the
hosted checks. Worker provisioning and access controls must be reviewed when the
host is selected. Rehearse locally and in Actions before enabling tag publication:

```bash
gh variable set LINUX_LAB_ENABLED --repo hashimkarim/usagestat-bar --body true
```

Only do this after the runner is registered, online and tested. Disabling the
variable blocks subsequent native/release runs without disabling fast CI.

## Reproduce a candidate locally

Commit the intended changes first. Commands reject tracked modifications and
bind evidence to the clean commit and archive SHA-256 values. Use new output
directories for each attempt; previous evidence is never silently replaced.
The package build excludes untracked files (including personal screenshots).

Install the fast-check dependencies on Ubuntu 24.04:

```bash
sudo apt-get install gjs gir1.2-gtk-3.0 gir1.2-gtk-4.0 gir1.2-adw-1 \
  libglib2.0-bin dbus-x11 fontconfig zip unzip ffmpeg
```

Then, from the repository root:

```bash
python3 scripts/release.py check --output artifacts/rc-checks
python3 scripts/release.py build --checks artifacts/rc-checks --output artifacts/rc-build
python3 scripts/release.py native --artifacts artifacts/rc-build --output artifacts/rc-native --jobs 2
python3 scripts/release.py assemble --artifacts artifacts/rc-build \
  --evidence artifacts/rc-native --output artifacts/rc-release
python3 scripts/publish-release.py --directory artifacts/rc-release --tag v0.1.0-rc.1
```

The last command is a dry run and does not call the publishing API. Native
checks install the built archives: GNOME uses its ZIP, other profiles extract
the Linux bundle and compile adapters as appropriate. Polybar is a prebuilt lab
dependency; its binary/patch hashes must match the image record and candidate
patch. Its upstream source build remains pinned in `platforms/polybar/build.sh`.
Generic install/upgrade/uninstall/config-preservation tests run in fast CI;
full native desktop login and VM lifecycle checks remain separate acceptance work.

For a quick target investigation, add `--targets gnome,xfce` to `native` or select
those targets in the manual workflow. A partial run retains evidence but cannot
assemble/publish a full release. After fixing a failure, rerun at the new clean
commit; do not splice old profiles into a new candidate. Shared code and full
releases require all twelve profiles.

`native` retains raw local captures under `raw/`. Actions uploads only the
curated `gallery/`, run metadata and logs: no copied source trees, raw frame
caches or process environment dumps. Open `gallery/index.html`; it links each
scenario to its PNG, video position and observed result. Videos preserve the
observed timing at 5 FPS, including slower captures. Setup/encoder failures
are retained as failures, even when some scenario results exist.

`assemble` requires every check named in `release.json`, rejects duplicate names,
failed/unknown statuses and missing profiles, and allows only explicitly listed
compatibility skips with reasons. It validates PNG content, fully decodes each
H.264 video, checks that recordings cover the scenario timestamps, and requires
source/archive identity from every profile. Manual acceptance and untested
hardware/distro scope are described in the notes and roadmap; automated pass
counts do not claim those approvals.

## Versioning, publication and retry

Update `release.json` and `docs/RELEASE_NOTES.md` together. Use semantic versions
with optional `alpha.N`, `beta.N` or `rc.N`; increment `gnomeVersion` for each
published GNOME package. Its metadata receives both versions while retaining
the extension UUID. Runtime archives normalize timestamps/ownership/order for
deterministic contents from the same source; evidence itself varies between runs.
The manifest records the backend fixture reference, last live smoke, icon
provenance, checks, scope, commit and archive hashes.

After review and runner activation, an authorized maintainer can publish by
pushing an existing reviewed commit as `v<version>`, or dispatch the release
workflow with that existing tag and `dry_run=false`. The tag must point to the
verified commit on remote main. The publisher will not create/move tags, replace
assets, or downgrade the latest-release pointer. Prerelease versions are marked
as prereleases; all initial downloads use explicit tags. Stable promotion and
setting the latest-release pointer are separate maintainer decisions.

A failed upload leaves a draft. **Rerun the failed publishing job** using its
retained verified artifact, or rerun `publish-release.py --publish` against that
same directory. It compares remote asset bytes and uploads only missing files;
API errors are failures, never evidence that a release is absent. A fresh native
run changes the evidence archive, so do not replace an existing draft's assets
with newly generated evidence under the same version. Published assets are
immutable. For fixes, use a new version/tag and keep older downloads available.
Publishing is serialized per tag. Checksums accompany all public assets; no
signing identity or attestation is claimed by this first setup.

## Downloads and installation

After the first release, use its explicit tag page (there is no working
`releases/latest` installer link yet). Download the selected archive and
`SHA256SUMS`, then run `sha256sum --ignore-missing -c SHA256SUMS` in that directory.

| Desktop | Archive | Installation after extraction |
| --- | --- | --- |
| GNOME | `usagestat-bar-VERSION.shell-extension.zip` | `gnome-extensions install --force ARCHIVE`; log out/in on Wayland, then enable `usagestat-bar@hashimkarim` |
| Plasma, Cinnamon, MATE | `usagestat-bar-VERSION-linux.tar.gz` | `python3 usagestat-bar/platforms/linux/install.py` then add the desktop widget/applet |
| Xfce | same Linux archive | installer with `--native xfce` |
| LXQt | same Linux archive | installer with `--native lxqt` |
| Budgie | same Linux archive | installer with `--native budgie` |
| COSMIC | same Linux archive | installer with `--native cosmic` |
| Sway, Hyprland | same Linux archive | installer with `--native waybar` |
| i3, bspwm | same Linux archive | installer with `--native polybar` (first source build needs network or a pinned local source cache) |

Extract with `tar -xzf usagestat-bar-VERSION-linux.tar.gz`. See
[LINUX.md](LINUX.md) for dependencies, panel integration and autostart options.
The archive includes source adapters that compile against the destination ABI;
it is not a universal prebuilt `.so` package. A portable source bundle does not
establish tested support on another architecture. Repeat the same installer for
upgrades; it retains selected native adapters and provider configuration.
Uninstall with the installer and `--uninstall` (same custom `--prefix`, if used).
Install the independent `usagestat` CLI separately as described in the README.

AUR, COPR/RPM, PPA/DEB, Flathub, Snap, GNOME Extensions and other stores are later
publishing destinations. They need their own package policies and acceptance;
this workflow does not claim packages were submitted there. Windows/macOS wait
for their ports. The initial cohort is x86_64 in the environments documented in
[ROADMAP.md](ROADMAP.md), with experimental/pending coverage explicitly retained.

## Where Jev could help

[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) returns
structured decisions from supplied state; the published Doom demonstration uses
text/data state, not images. It could choose exploratory UI actions or classify
failure logs, given an accessibility/state observer and a desktop action driver.
It does not supply the native recorder or execution layer. The current drivers
already provide the clicks, wheel events, screenshots and videos needed here.

A later optional experiment can give Jev a bounded list of actions on fixture
sessions, log its observations/choices and capture resulting behaviour. Measure
new reproducible bugs and coverage against scripted exploration before adding
it as a dependency. Convert discoveries into deterministic regression tests.
Model confidence must not waive required checks or approve releases. No TypeSafe
API key, model call or cost is needed for the standard workflow.
