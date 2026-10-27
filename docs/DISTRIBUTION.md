# Desktop distribution

The portable installer and system packages have different ownership boundaries.
The installer manages a user prefix; RPM, Debian and Arch packages own `/usr`
files and compile native adapters during their builds. Neither installs provider
credentials or enables a panel in an existing user session. Install the independent
`usagestat` CLI first, then the runtime and the adapter for your desktop.

## Publication status

No desktop package or native store submission from this work is public yet.
The Fedora [testing COPR](https://copr.fedorainfracloud.org/coprs/hashimkarim/usagestat-bar-testing/)
exists and publishing permission has been verified. AUR SSH authentication and
the Launchpad signing key have been verified. The new
[Launchpad testing archive](https://launchpad.net/~hashimkarim/+archive/ubuntu/usagestat-bar-testing)
is active for amd64. GNOME upload authentication works; KDE Store account approval
is pending. Store accounts use `hashimkarim`. The release remains a prerelease,
not a stable-channel update.

The package inventory and target versions live in [packaging](../packaging/).
Fedora has native runtime/adapters for Plasma, Cinnamon, MATE, Xfce, Budgie, LXQt
and Waybar. Ubuntu Noble's recipes include Cinnamon, MATE, Xfce and Budgie:
its Plasma and LXQt versions do not meet this implementation's requirements.
The Arch recipe targets current Qt 6 desktops and remains subject to clean-build
validation. Installable availability must be checked at the actual destination
before turning these recipes into public installation instructions.

## Store and compatibility boundaries

GNOME has a separate extension ZIP and review process. Submit only advertised
Shell versions with matching test evidence. The release configuration limits
the first submitted archive to Shell 50; older majors in development metadata
need their own acceptance before being added to the published archive.

Plasma's widget requires the shared runtime, so a KDE Store download alone cannot
complete installation. Publish the runtime first and make that dependency clear
in the listing. Cinnamon's current [Spices rules](https://github.com/linuxmint/cinnamon-spices-applets#spices-must-be-self-contained)
require self-contained applets and allow system dependencies from trusted distro
repositories. Our externally delivered runtime does not meet that submission
contract; the distro applet is the current delivery path.

COSMIC and Hyprland still need acceptance on stock compositors: the native lab
applies compositor fixes. i3/bspwm use a private patched Polybar executable whose
offline source and license packaging still need completion. Do not infer stock
desktop support from those lab results. Flatpak, Snap and AppImage do not currently
provide the required host plugin installation and native ABI integration.

## Build and verify

The [package CI workflow](../.github/workflows/distribution.yml) builds each
distro independently and exercises the installed runtime on a private display
and D-Bus session with synthetic providers. It has no publishing credentials.
The [source preparation tool](../scripts/prepare-distribution.py) consumes a
source archive and its expected SHA-256, generates versioned recipes, and leaves
signing and publication to the destination-specific step. Never substitute a
source archive from an unverified tag or modify an already published artifact.

Native package acceptance uses the existing interaction harness with
`USAGESTAT_LAB_SYSTEM=1` and an image containing the installed packages. This mode
does not invoke the portable installer; package versions and the image identity
are retained with the results. Build/install smoke tests, full panel interactions,
and full login/upgrade/removal acceptance are distinct evidence.

For removal use the package manager that installed the package. User configuration
is preserved. Remove the widget from the panel before uninstalling its adapter;
restart the panel after an adapter upgrade so an old loaded library is not retained.
