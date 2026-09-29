import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import {fillPreferencesWindow} from '../../preferences.js';
import {settings, ROOT} from '../../platforms/linux/settings.js';
import {loadConfig, providerKey} from '../../config.js';
import {assert, equal} from '../assert.js';

String.prototype.format ??= imports.format.format;
const out = GLib.getenv('USAGESTAT_ICON_TEST_OUTPUT');
if (!out || GLib.getenv('GSETTINGS_BACKEND') !== 'memory') throw new Error('Isolated icon test environment required');
const prefs = settings();
const fixture = `${ROOT}/tests/fixtures/usagestat`;
const pause = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
async function wait(predicate) {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await pause(50); }
    throw new Error('UI condition timed out');
}
function all(root) {
    const result = [root];
    for (let child = root.get_first_child?.(); child; child = child.get_next_sibling()) result.push(...all(child));
    return result;
}
function row(root, title) {
    const found = all(root).find(w => w instanceof Adw.PreferencesRow && w.title === title);
    assert(found, `Missing row ${title}`); return found;
}
function provider(page, key) {
    const found = all(page).find(w => w instanceof Gtk.ListBoxRow && w._providerKey === key);
    assert(found, `Missing provider ${key}`); return found;
}
function button(root, tooltip) {
    const found = all(root).find(w => w instanceof Gtk.Button && (!tooltip || w.tooltip_text === tooltip));
    assert(found, `Missing button ${tooltip || ''}`); return found;
}
function entry(root, title, value) {
    const found = all(row(root, title)).find(w => w instanceof Gtk.Entry);
    assert(found, `Missing entry ${title}`); found.set_text(value); return found;
}
function savedIcons() { return JSON.parse(prefs.get_string('provider-usage-settings')); }
function config() { return loadConfig(fixture).providers; }
async function screenshot(name) {
    // Let the mapped window, theme transition and asynchronous image loads paint.
    await pause(1000);
    Gio.Subprocess.new(['import', '-window', 'root', `${out}/${name}.png`], Gio.SubprocessFlags.NONE).wait_check(null);
}

const app = new Adw.Application({application_id: 'io.github.HashimK.UsageStatIconTest'});
let failed = false;
const checks = [];
app.connect('activate', () => {
    app.hold();
    (async () => {
        prefs.set_string('usagestat-cli-path', fixture);
        const window = new Adw.PreferencesWindow({application: app, title: 'UsageStat Icon Picker', default_width: 860, default_height: 760});
        fillPreferencesWindow(window, prefs, {desktopPlacement: true});
        window.present();
        const page = all(window).find(w => w instanceof Adw.PreferencesPage && w.title === 'Providers');
        window.set_visible_page(page);
        await wait(() => page._manifests.size === 2);
        const choose = async (key, query, id) => {
            button(row(provider(page, key), 'Icon library')).emit('clicked');
            const picker = page._iconPicker;
            assert(picker?.visible, 'Picker did not open');
            const search = all(picker).find(w => w instanceof Gtk.SearchEntry);
            const cells = all(picker).filter(w => w instanceof Gtk.FlowBoxChild);
            equal(cells.length, 155);
            search.set_text(query);
            await wait(() => cells.find(w => w._iconId === id)?.get_child_visible() && cells.some(w => !w.get_child_visible()));
            cells.find(w => w._iconId === id).get_child().emit('clicked');
            await wait(() => !page._iconPicker);
        };
        await choose('codex', 'openrouter', 'openrouter');
        equal(savedIcons().codex.iconSource, 'openrouter');
        equal(config().find(p => p.id === 'codex' && !p.instanceId).source, undefined);
        checks.push('built-in provider selects an unrelated library icon without changing its source');

        await choose('codex:fixture-work', 'anthropic', 'anthropic');
        equal(savedIcons()['codex:fixture-work'].iconSource, 'anthropic');
        equal(savedIcons().codex.iconSource, 'openrouter');
        equal(config().find(p => p.instanceId === 'codex:fixture-work').tabParent, 'codex');
        checks.push('grouped account keeps its own icon and provider identity');

        const add = row(page, 'Add Provider Source');
        const selector = row(add, 'Provider');
        selector.selected = selector.model.get_n_items() - 1;
        entry(add, 'Name', 'Custom icon test');
        entry(add, 'CLI command', `${GLib.shell_quote(fixture)} --json usage --provider codex`);
        button(row(add, 'Create source')).emit('clicked');
        const custom = config().find(p => p.displayName === 'Custom icon test');
        assert(custom, 'Custom provider missing');
        await choose(providerKey(custom), 'claude code', 'claudecode');
        equal(savedIcons()[providerKey(custom)].iconSource, 'claudecode');
        equal(config().find(p => providerKey(p) === providerKey(custom)).customCommand, custom.customCommand);
        checks.push('custom CLI provider selects a library icon and retains its command');

        const path = `${GLib.get_user_cache_dir()}/custom.png`;
        const pixels = GdkPixbuf.Pixbuf.new(GdkPixbuf.Colorspace.RGB, true, 8, 40, 20);
        pixels.fill(0xff6600ff); pixels.savev(path, 'png', [], []);
        entry(provider(page, 'codex'), 'Custom image', path).emit('activate');
        equal(config().find(p => p.id === 'codex' && !p.instanceId).iconPath, path);
        const selected = page._providerIconFile(config().find(p => p.id === 'codex' && !p.instanceId));
        assert(selected.includes('/custom-icons/'), 'Custom image did not override the built-in provider');
        button(row(provider(page, 'codex'), 'Custom image'), 'Clear custom icon').emit('clicked');
        assert(!config().find(p => p.id === 'codex' && !p.instanceId).iconPath);
        equal(savedIcons().codex.iconSource, 'openrouter');
        checks.push('built-in provider accepts a PNG override and clearing it restores the library choice');

        entry(provider(page, 'codex'), 'Custom image', '/missing/image.svg');
        assert(row(provider(page, 'codex'), 'Custom image').subtitle.includes('Image unavailable'));
        equal(page._providerIconFile(config().find(p => p.id === 'codex' && !p.instanceId)), 'openrouter.svg');
        button(row(provider(page, 'codex'), 'Icon library'), 'Use default icon').emit('clicked');
        assert(!savedIcons().codex?.iconSource);
        assert(!config().find(p => p.id === 'codex' && !p.instanceId).iconPath);
        checks.push('missing image falls back and reset clears both overrides');

        for (const dark of [false, true]) {
            Adw.StyleManager.get_default().color_scheme = dark ? Adw.ColorScheme.FORCE_DARK : Adw.ColorScheme.FORCE_LIGHT;
            button(row(provider(page, 'codex'), 'Icon library')).emit('clicked');
            const picker = page._iconPicker;
            await screenshot(`icon-library-${dark ? 'dark' : 'light'}`);
            const search = all(picker).find(w => w instanceof Gtk.SearchEntry);
            search.set_text('no-such-provider-xyz');
            await wait(() => all(picker).some(w => w instanceof Gtk.Label && w.label === 'No matching icons' && w.visible));
            search.set_text('ChatGPT');
            await wait(() => all(picker).some(w => w instanceof Gtk.FlowBoxChild && w._iconId === 'openai' && w.get_child_visible()));
            await screenshot(`icon-search-${dark ? 'dark' : 'light'}`);
            picker.close();
        }
        checks.push('search handles aliases and empty results in light and dark themes');
        button(row(provider(page, 'codex'), 'Icon library')).emit('clicked');
        window.close();
        await wait(() => page._closed && !page._iconPicker);
        checks.push('closing preferences also closes the icon picker');
    })().catch(error => { failed = true; printerr(error.stack); }).finally(() => {
        Gio.File.new_for_path(`${out}/result.json`).replace_contents(JSON.stringify({passed: !failed, checks}, null, 2),
            null, false, Gio.FileCreateFlags.PRIVATE, null);
        for (const name of checks) print(`Passed: ${name}`);
        app.quit();
    });
});
app.run([]);
if (failed) imports.system.exit(1);
