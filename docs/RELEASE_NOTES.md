UsageStat Bar 0.2.0 — GNOME extension

This minor release adds independent provider-icon updates to the GNOME extension.
Preferences → CLI now has a third **Provider icons** section alongside Binary
and Plugin folder. It shows the installed version, latest release, last check
and update status, with a manual refresh button.

Install this extension update once. Future stable AgenticDriver provider-icons
releases are checked daily and adopted without another bar or CLI update.
Manual refresh checks immediately. The bundled catalog remains available offline;
custom images and explicit library selections retain priority.

This release publishes the GNOME Shell 50 extension and source archive. It does
not publish new Linux desktop runtime packages or claim a fresh twelve-desktop
validation. The earlier 0.1.0-rc.1 release remains available for those packages.

The extension UUID and settings remain unchanged. Install the ZIP with
`gnome-extensions install --force usagestat-bar-0.2.0.shell-extension.zip`, then
log out and back in to load the new extension code. The independent `usagestat`
CLI must already be installed. GNOME Extensions availability depends on store
review; GitHub downloads are available independently.
