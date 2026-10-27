# Desktop distribution

The user authorized proper delivery for every implemented desktop, including first
public releases and store submissions after validation (2026-10-27).

## Next Agent Prompt

Implement the package staging contract first, then validate RPM, Debian and Arch
packages from the same source. Continue native-store readiness and first authorized
publication independently where possible. Preserve `screenshots/` and all backend
configuration. Update this section as work advances. Current release remains
`0.1.0-rc.1`; do not silently promote it to stable or overwrite stable repositories.

Update 2026-10-27: user additionally requires independent daily/manual icon updates
before first publication. The bundle has been refreshed to provider-icons 1.1.0.
See ../runtime-provider-icons/README.md for that prerequisite. Distro staging,
recipes and build CI are implemented; Fedora package interaction checks pass
including the corrected LXQt harness restart path. Ubuntu packages build
and installed-service smoke passes. Independent review found missing Debian test
dependencies and a CI/release source checksum mismatch; both have been fixed.
GNOME credentials are available privately and login was verified. KDE account
approval is pending. COPR testing project and Launchpad testing archive exist.

- [ ] Pure system staging and distro package lifecycle tests.
- [ ] RPM, Debian source and Arch recipes; isolated builds and destination access.
- [ ] Native-store packaging and policy/account readiness.
- [ ] Exact final artifact native validation and authorized publication/readback.

## Ownership and contracts

`platforms/linux/package.py` owns the portable runtime payload. System staging
consumes that payload and writes only a requested DESTDIR, with final `/usr` paths
in activation files. Package managers own upgrade/removal; the user installer
continues owning user-prefix installations. Neither owns provider credentials or
configuration. Compile panel adapters during package builds against the target
distro ABI, never in post-install scripts. The independent `usagestat` CLI remains
a dependency, not bundled code. No data migrations are needed for first publication.

The existing release manifest/check/evidence gate remains authoritative for its
extension, runtime and source artifacts. Additional artifacts need their own installation evidence and
checksums tied to the source commit; historical evidence cannot certify new bytes.

## Delivery and unresolved acceptance

| Target | Delivery | Remaining acceptance |
| --- | --- | --- |
| GNOME | Extensions ZIP, GitHub and EGO | Account, review guidelines, test advertised shell majors |
| Plasma | Native widget plus distro runtime | KDE account, dependency discovery, Plasma 6.4+ |
| Cinnamon | Distro applet package | Spices currently disallows our externally supplied runtime |
| MATE | Distro applet and D-Bus factory | Package install/upgrade/removal |
| Xfce, Budgie, LXQt | Distro ABI-specific plugin packages | Compile per distro, panel discovery and lifecycle |
| Sway | Distro Waybar module | Waybar ABI and clean installed-package session |
| Hyprland | Same Waybar package | Stock compositor; existing lab applies focus patch |
| COSMIC | Applet package | Stock compositor; existing lab patches Smithay |
| i3, bspwm | Private Polybar integration | Offline pinned Polybar sources, licensing and lifecycle |

The three independent drafts agreed on staging first, final-byte validation, and
separate submission versus availability states. Risk-first review added stock
compositor gates and offline private Polybar builds. Cinnamon native-store advice
was rejected after checking current upstream rules.

Sandboxed app stores and containers do not currently fit host panel plugins and
host CLI access. Language registries do not fit this GJS desktop integration.
Homebrew does not provide the host panel ABI matrix. Nix needs a dedicated module
and integration validation and is not a substitute for the selected distro lanes.

Sources: [GNOME review](https://gjs.guide/extensions/review-guidelines/review-guidelines.html),
[KDE plugin layout](https://develop.kde.org/docs/plasma/),
[Cinnamon policy](https://github.com/linuxmint/cinnamon-spices-applets#spices-must-be-self-contained).
