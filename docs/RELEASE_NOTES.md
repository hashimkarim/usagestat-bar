Initial Linux release candidate. This is a prerelease for the tested x86_64 lab
scope; manual desktop acceptance and broader distribution/hardware coverage
remain open.

- GNOME extension plus a shared Linux runtime/source bundle for Plasma,
  Cinnamon, MATE, Xfce, LXQt, Budgie, COSMIC, Waybar (Sway/Hyprland), and
  Polybar (i3/bspwm).
- Provider icons from AgenticDriver provider-icons v0.1.0-alpha.1, with shared
  usage presentation, preferences, pinning, scrolling and popup placement.
- Archives, native screenshots, interaction videos, environment/package
  identities, scenario results and checksums are produced from one commit.
- GNOME's fixed top panel and Polybar's horizontal-only panels account for five
  accepted placement skips. Missing tests and broken infrastructure block a release.

The Linux archive contains native adapter sources, not universal binary plugins.
The installer builds selected adapters against the destination's libraries and
preserves provider configuration. Build dependencies and desktop setup are in
[Linux installation](https://github.com/hashimkarim/usagestat-bar/blob/main/docs/LINUX.md).
GNOME's archive uses the existing `usagestat-bar@hashimkarim` UUID and settings.

The automated native matrix uses synthetic provider data. Live Codex/Claude
smoke evidence remains the separately recorded September 7 run with
`usagestat 1.0.3`; this release does not claim fresh account-backed testing.
COSMIC and Hyprland labs use documented compositor patches. Stock compositor
coverage, full native login/reboot lifecycle, older GNOME versions, physical
multimonitor/fractional scaling, accessibility, other distros and arm64 remain
unverified or pending acceptance. See the
[roadmap](https://github.com/hashimkarim/usagestat-bar/blob/main/docs/ROADMAP.md).

Download `SHA256SUMS`, the selected archive, and optionally the evidence archive.
Run `sha256sum --ignore-missing -c SHA256SUMS` from that directory. Extract the
evidence archive and open `evidence/index.html` for the scenario gallery and
videos. Installation and release procedures:
[RELEASING.md](https://github.com/hashimkarim/usagestat-bar/blob/main/docs/RELEASING.md).
