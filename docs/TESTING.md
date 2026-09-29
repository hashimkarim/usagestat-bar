# Baseline checks and fixture development

For the new Linux ports, use the [Linux desktop lab](LINUX.md#repeatable-desktop-checks-from-gnome).
It runs real panels/compositors in isolated containers, installs the release
bundle, uses these same fixtures, and retains screenshots and results. The
[current roadmap](ROADMAP.md) records coverage and gaps, with links to the
dated native and VM reports.

## Fast contract checks

Requirements: GJS (`gjs`), Python 3 and Bash. No Node/npm packages, accounts,
running desktop, or backend installation are required.

```bash
./tests/run.sh
```

This runs the real CLI/config modules against the fake backend, prints TAP
results, and exits nonzero on failure. It creates temporary XDG config/data/cache
directories and removes them on exit. The test suite includes actual process
timeout/cancellation checks on Linux, not just mocked promises.

To retain the report:

```bash
mkdir -p artifacts
set -o pipefail
./tests/run.sh 2>&1 | tee artifacts/contracts.tap
```

## Native GNOME checks

Requirements: GNOME Shell, GJS, the desktop's GLib tools, dconf, D-Bus, Python 3,
GNU `timeout`, and a working Mutter rendering backend. The check uses a
headless Wayland compositor with a 1600×1000 virtual monitor. It renders the
actual GNOME panel and GTK preferences; no VM or logout is needed for this
local smoke check.

```bash
./test-nested.sh
```

The script builds the release archive and installs it with a test-only driver
into a temporary extension directory. It creates separate XDG config, cache, data,
state and runtime directories plus a private session bus. Only fixture config
and the fixture backend are used. It does not relink your installed extension
or modify your normal provider settings. The test driver is not included in
the extension release archive.

The result directory is printed at startup under `artifacts/gnome.*`:

| File | Contents |
| --- | --- |
| `environment.json` | Source commit/dirty state, OS/kernel, architecture, GNOME and GJS versions, command |
| `result.json` | Native checks, failures and stack traces |
| `shell.log`, `session.log` | Shell and private-session diagnostics, including startup failure details |
| `build.log` | Release archive build output |
| `backend-commands.jsonl` | Fixture command names, arguments and process IDs |
| `01-provider-details.png` | Current provider, child account, quota windows and costs |
| `02-multiple-providers-used.png` | Multiple panel providers and used-mode fills |
| `03-multiple-providers-remaining.png` | Remaining-mode fills |
| `04-backend-error.png` | Native error presentation |
| `05-preferences.png` | A mapped preferences window |
| `08-custom-provider-icon.png` | Custom raster override on a built-in provider |

The script exits nonzero on a failed assertion, early Shell exit, or timeout.
It terminates the test Shell/session and removes temporary state; evidence
stays in `artifacts/`, which is ignored by Git. Failed runs are retained too.
Review screenshots as well as the JSON result, especially after UI changes.

Use the desktop's `gsettings` and `glib-compile-schemas` beside `gnome-shell`.
The harness selects those explicitly: a Homebrew GLib installation earlier on
PATH can lack the desktop's dconf backend and silently discard settings.

Accessibility services are disabled inside this disposable session because
it has no user-systemd accessibility registry. Screen-reader/accessibility
verification therefore remains a separate real-session check. Portal,
PipeWire, authentication-agent or shutdown-service warnings may occur in a
minimal session; inspect them separately from application JavaScript errors.

The initial checks verified GNOME 50.4; the latest
[native interaction report](reports/linux-port-fixes-2026-09-27.md) uses 50.5.
The extension metadata still declares 45–50; these runs do not verify 45–49. See the
[parity checklist](BASELINE.md) for further coverage still needed.

## Icon picker checks

```bash
bash tests/linux/icon-picker.sh
```

This runs the shared GTK preferences under Xvfb and Openbox with a private
D-Bus session, memory-backed settings and synthetic provider configuration.
Requirements: GJS, GTK 4, libadwaita, librsvg introspection bindings, Python 3,
GLib schema tools, Xvfb, Openbox and ImageMagick (`import`). No GPU or live
credentials are needed; the harness uses Cairo rendering.

It checks library search, built-in/custom/grouped source choices, PNG overrides,
missing-image fallback, reset and window cleanup. Light/dark screenshots and
`result.json` are retained under the printed `artifacts/icon-picker.*` directory.
Set `USAGESTAT_ICON_TEST_OUTPUT` to choose a different evidence directory.
GitHub CI runs this before building candidates and retains the same evidence
in `linux-check-logs`. Review screenshots alongside the assertions.

## Icon bundle and font checks

```bash
python3 tests/provider-icons-test.py
/usr/bin/python3 tests/linux/polybar-font.py
```

The updater regressions use synthetic archives and mocked release metadata;
they verify stale-release failures, checksums and rollback without network
access. Font checks compare every catalog mark with the actual bundled glyph,
including holes and masks. They need system Python with fonttools, Pillow,
PyGObject and the librsvg pixbuf loader (`python3-fonttools python3-pil
python3-gi librsvg2-common` on Ubuntu). Both run in the ordinary CI release checks.
See [icon updates](PROVIDER_ICONS.md) for the separate refresh/build toolchain.

## Packaging checks

```bash
./tests/package.sh
```

This requires Python 3, GLib schema tools, `zip`, `unzip`, and `rsync`. It
builds from outside the checkout and installs into a temporary XDG data
directory. It verifies that the archive contains only runtime files, installed
files match the archive, schemas compile, and replacing a development symlink
does not modify that link's source directory. It never installs into your live
extension directory. A clean VM upgrade/login/uninstall check remains separate.

## Interactive fixture desktop

```bash
./dev-shell.sh --fixtures
```

This uses the same isolated config/backend but opens a desktop window without
the automated test driver. GNOME 49+ uses Mutter Development Kit; install
`mutter-devkit` if it is not available. Earlier versions use nested Shell.
The Devkit viewer uses the parent session's PipeWire connection while keeping
the test session's settings and Wayland runtime separate.
Close the desktop window to stop it and clean up temporary state. Existing
`./dev-shell.sh` without `--fixtures` keeps its original live-development
behavior, including using your normal extension/config.

The fixture-state path is printed on startup. Change its JSON and press the
bar's refresh button to reproduce an error or quota transition:

```json
{"scenario": "danger"}
```

Other examples are `normal`, `zero`, `full`, `many-windows`, `no-cost`,
`cost-failure`, `failure`, `malformed`, `empty`, `legacy`, and `hang`.
To set exact quota values:

```json
{"scenario": "normal", "overrides": {"used": 74.9, "weeklyUsed": 90}}
```

The standalone backend also accepts `USAGESTAT_FIXTURE_SCENARIO` when no state
file is selected:

```bash
USAGESTAT_FIXTURE_SCENARIO=full ./tests/fixtures/usagestat --json usage --provider codex
```

## Port acceptance report template

Copy this template into the platform issue or a report file. Keep skipped and
manual checks explicit.

Native interaction checks use `skipped` with a reason when a native platform
cannot support the scenario: GNOME's fixed top panel and Polybar's horizontal-only
panels are the current examples. These architecture/compatibility skips are
counted separately from passes and failures and do not block acceptance of the
supported baseline. An environment failure or an untested supported scenario
remains blocked or untested; it does not qualify as a compatibility skip.
The gallery classifies those specific legacy `unsupported` results as `skipped`
while preserving their original status and raw result files.

```text
Target / desktop / panel / compositor:
OS / distro / version / architecture / session:
App commit and dirty status:
Backend version or fixture revision:
Environment provisioning and dependencies:
Install/build/test commands:
Automated results and artifact locations:
BASELINE.md feature IDs: passed / failed / untested / platform limitation
Manual visual, keyboard, theme, scaling and monitor results:
Install / upgrade / login / restart / uninstall results:
Live-provider smoke result (or not run):
Remaining gaps and linked issues:
```

For clean-install/distro acceptance, use the target VM and record its image,
desktop/session configuration, and reset procedure. A container-only build
cannot verify native panel behavior. The coordinated runner matrix and
release automation are tracked separately in
[Phase 2](https://github.com/Hashim-K/usagestat-bar/issues/17).

## Linux VM and live checks

The [Linux acceptance report](reports/linux-acceptance.md) records the desktop
matrix, Ubuntu/Fedora login lifecycle, four-page preferences at 1×/2× in both
themes, and the separate live-backend smoke check. Reproduction and dependency
commands are in [LINUX.md](LINUX.md#full-login-reboot-and-uninstall-checks).

Use a new `vm.py create` directory for a fresh upstream guest. `vm.py check`
also reruns an existing disposable guest; it reinstalls the fixture application
and preserves earlier local evidence files. Read the current phase JSON and
source fingerprint rather than treating every old screenshot as a final result.
A failed phase exits nonzero. Review the current screenshots too: process,
D-Bus and widget assertions alone do not prove correct visual rendering.

Live checks require the explicit opt-in in `tests/linux/live.sh`; pass the
intended CLI/config environment. They retain version/provider/outcome fields,
not raw usage or account secrets. All ordinary desktop/VM fixtures stay synthetic.
