#!/usr/bin/env bash
# Exercise installed files on a private display/bus with synthetic providers.
set -euo pipefail
export USAGESTAT_ICON_UPDATES=0
source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_root="$(mktemp -d -t usagestat-installed.XXXXXXXX)"
display_pid=''
trap 'if [[ -n "$display_pid" ]]; then kill "$display_pid" 2>/dev/null || true; fi; rm -rf "$test_root"' EXIT
export XDG_CONFIG_HOME="$test_root/config" XDG_DATA_HOME="$test_root/data" XDG_CACHE_HOME="$test_root/cache"
export XDG_STATE_HOME="$test_root/state" XDG_RUNTIME_DIR="$test_root/runtime"
export GSETTINGS_BACKEND=memory GSK_RENDERER=cairo GTK_A11Y=none NO_AT_BRIDGE=1
export USAGESTAT_CLI="$source_dir/tests/fixtures/usagestat" USAGESTAT_FIXTURE_LOG="$test_root/backend.jsonl"
unset WAYLAND_DISPLAY USAGESTAT_FIXTURE_STATE USAGESTAT_FIXTURE_SCENARIO
mkdir -p "$XDG_CONFIG_HOME/usagestat" "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"
cp "$source_dir/tests/fixtures/config.toml" "$XDG_CONFIG_HOME/usagestat/config.toml"
Xvfb -displayfd 3 -screen 0 1280x800x24 -nolisten tcp 3>"$test_root/display" >"$test_root/display.log" 2>&1 &
display_pid=$!
for attempt in {1..50}; do
    if [[ -s "$test_root/display" ]]; then break; fi
    sleep 0.1
done
if [[ ! -s "$test_root/display" ]]; then
    cat "$test_root/display.log"
    exit 1
fi
export DISPLAY=":$(cat "$test_root/display")"
export USAGESTAT_SMOKE_DIR="$test_root"
dbus-run-session -- bash -euc '
    usagestat-bar service > "$USAGESTAT_SMOKE_DIR/app.log" 2>&1 &
    service_pid=$!
    trap '\''kill "$service_pid" 2>/dev/null || true'\'' EXIT
    if ! gdbus wait --session --timeout 20 io.github.HashimK.UsageStatBar; then
        cat "$USAGESTAT_SMOKE_DIR/app.log"; exit 1
    fi
    usagestat-bar snapshot > "$USAGESTAT_SMOKE_DIR/snapshot.json"
    python3 -c '\''import json,os; data=json.load(open(os.environ["USAGESTAT_SMOKE_DIR"]+"/snapshot.json")); assert isinstance(data,dict) and data, data'\''
    usagestat-bar preferences
    usagestat-bar quit
    wait "$service_pid"
'
echo 'Passed: installed service startup, snapshot, preferences request and clean shutdown'
