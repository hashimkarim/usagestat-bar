# Features

Implementation and release priorities are tracked in the
[current roadmap](docs/ROADMAP.md). This list was reviewed on 29 September 2026;
implemented features remain subject to the recorded platform coverage.

## Implemented

- [x] Remove the broken overview tab.
- [x] Provider switcher with provider logos and mini usage bars.
- [x] Loading placeholders that do not block provider tabs/logos from rendering.
- [x] Show last refreshed time in the provider popup header.
- [x] Popup edit button opens Preferences on the Providers page and expands the active provider.
- [x] Choose which usage window drives the top bar per provider: auto, session, or weekly.
- [x] Top bar component controls:
  - [x] Usage bar
  - [x] Usage percent
  - [x] Logo
  - [x] Text
  - [x] Enable/disable components
  - [x] Drag enabled components to set order
- [x] Custom usage thresholds.
- [x] Add more thresholds.
- [x] Per-threshold settings:
  - [x] Name
  - [x] Percent used
  - [x] Color
  - [x] Notification on/off
  - [x] Delete threshold
- [x] Threshold color picker and hex field stay synced.
- [x] Improved provider settings layout:
  - [x] Enabled and disabled providers are separated.
  - [x] Disabled providers are not draggable.
  - [x] Disabled providers become draggable after enabling.
  - [x] Add Provider Source section between enabled and disabled providers.
  - [x] Custom provider source names.
  - [x] Add another account/source as either a separate switcher tab or inside an existing provider tab.
  - [x] Add API token tracking as a separate source for providers with API-key support.
  - [x] Switch an existing provider source to API tracking.
  - [x] Add custom CLI command-backed providers.
  - [x] Delete user-created provider sources without deleting built-in providers.
  - [x] Drag provider-tab child sources to reorder sections inside the popup tab.
- [x] GNOME 50 nested shell development helper.
- [x] Usage dashboard and status-page links in provider details when available.
- [x] Provider icons and icon-source/style previews in preferences.
- [x] Shared AgenticDriver provider-icons catalogue with pinned provenance.
- [x] Linux native panel integrations, shared preferences and fixture-driven desktop checks.
- [x] Recorded popup/preferences screenshots and native interaction videos.
- [x] Documented GNOME nested development and fixture workflows.
- [x] Deterministic threshold boundary/crossing/recovery checks, including native notification delivery in the recorded environments.

## Remaining validation

- [ ] Validate real-provider threshold crossings and additional notification daemons; the existing live smoke checks do not exercise live quota crossings.
- [ ] Complete the scoped manual, lifecycle and compatibility acceptance in [#4–#13 and #16](docs/ROADMAP.md#linux-coverage-and-remaining-acceptance).
- [ ] Automate verification and produce coordinated release artifacts in [#17](https://github.com/hashimkarim/usagestat-bar/issues/17).

## Optional product work after the release baseline

- [ ] Refine threshold controls or notification wording/frequency when user testing identifies a concrete need.
- [ ] Add a direct add-account shortcut in the popup; account/source creation already exists in preferences.
- [ ] Evaluate additional settings/about/session actions where useful for the native host.
- [ ] Improve provider-specific setup and API-source presets through backend-supported configuration. New provider API integrations belong in `usagestat`, not a second API client in the bar.
