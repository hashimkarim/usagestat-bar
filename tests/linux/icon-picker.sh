#!/usr/bin/env bash
set -euo pipefail
source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
for tool in gjs Xvfb openbox dbus-run-session import; do
    command -v "$tool" >/dev/null || { echo "Missing UI test dependency: $tool" >&2; exit 1; }
done
test_root="$(mktemp -d -t usagestat-icons.XXXXXX)"
cleanup() {
    if [[ -n "${display_pid:-}" ]]; then kill "$display_pid" 2>/dev/null || true; wait "$display_pid" 2>/dev/null || true; fi
    rm -rf -- "$test_root"
}
trap cleanup EXIT
export XDG_CONFIG_HOME="$test_root/config" XDG_DATA_HOME="$test_root/data" XDG_CACHE_HOME="$test_root/cache"
export XDG_STATE_HOME="$test_root/state" XDG_RUNTIME_DIR="$test_root/runtime"
export GSETTINGS_BACKEND=memory GDK_BACKEND=x11 GSK_RENDERER=cairo GTK_A11Y=none NO_AT_BRIDGE=1 GIO_USE_VFS=local
export USAGESTAT_FIXTURE_LOG="$test_root/commands.jsonl"
unset USAGESTAT_FIXTURE_STATE USAGESTAT_FIXTURE_SCENARIO
mkdir -p "$XDG_CONFIG_HOME/usagestat" "$XDG_CACHE_HOME" "$XDG_RUNTIME_DIR" "$source_dir/artifacts"
chmod 700 "$XDG_RUNTIME_DIR"
cp "$source_dir/tests/fixtures/config.toml" "$XDG_CONFIG_HOME/usagestat/config.toml"
export USAGESTAT_ICON_TEST_OUTPUT="${USAGESTAT_ICON_TEST_OUTPUT:-$(mktemp -d "$source_dir/artifacts/icon-picker.XXXXXX")}"
mkdir -p "$USAGESTAT_ICON_TEST_OUTPUT"
python3 "$source_dir/platforms/linux/package.py" stage "$test_root/app"
export USAGESTAT_BAR_SCHEMA_DIR="$test_root/app/platforms/linux/schemas"
Xvfb -displayfd 3 -screen 0 1400x1000x24 -nolisten tcp 3>"$test_root/display" >"$USAGESTAT_ICON_TEST_OUTPUT/display.log" 2>&1 &
display_pid=$!
for _ in $(seq 1 100); do
    [[ -s "$test_root/display" ]] && break
    sleep 0.05
done
[[ -s "$test_root/display" ]] || { echo 'Xvfb did not start' >&2; exit 1; }
export DISPLAY=":$(cat "$test_root/display")"
echo "Icon picker evidence: $USAGESTAT_ICON_TEST_OUTPUT"
dbus-run-session -- bash -c '
    openbox > "$USAGESTAT_ICON_TEST_OUTPUT/window-manager.log" 2>&1 &
    manager=$!
    trap '\''kill "$manager" 2>/dev/null || true'\'' EXIT
    sleep 0.2
    timeout 60s gjs -m "$1/tests/linux/icon-picker.js"
' -- "$source_dir"
