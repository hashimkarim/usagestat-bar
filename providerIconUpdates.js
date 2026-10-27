import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Soup from 'gi://Soup?version=3.0';
import {activateProviderCatalog, bundledProviderIconVersion, providerIconVersion} from './providerMetadata.js';
import {compareIconVersions, iconRelease, iconArchiveData, validateIconCatalog} from './iconUpdateData.js';

const API = 'https://api.github.com/repos/agenticdriver/provider-icons/releases/latest';
const DAY = 24 * 60 * 60;
const decoder = new TextDecoder('utf-8', {fatal: true});
const encode = value => new TextEncoder().encode(JSON.stringify(value));
const file = path => Gio.File.new_for_path(path);
const now = () => Math.floor(Date.now() / 1000);
const read = path => JSON.parse(decoder.decode(file(path).load_contents(null)[1]));
const write = (path, data) => file(path).replace_contents(data, null, false, Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION, null);
const sha = bytes => GLib.compute_checksum_for_bytes(GLib.ChecksumType.SHA256, new GLib.Bytes(bytes));

async function streamBytes(stream, limit, cancellable) {
    const chunks = [];
    let size = 0;
    try {
        while (true) {
            const bytes = await new Promise((resolve, reject) => stream.read_bytes_async(65536, GLib.PRIORITY_DEFAULT, cancellable,
                (source, result) => { try { resolve(source.read_bytes_finish(result)); } catch (error) { reject(error); } }));
            const chunk = bytes.get_data();
            if (!chunk.length) break;
            size += chunk.length;
            if (size > limit) throw new Error('Icon download exceeds its size limit');
            chunks.push(chunk);
        }
    } finally { stream.close(null); }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
}

export class ProviderIconUpdater {
    constructor({root, fetch, clock = now, automatic = true} = {}) {
        this.root = root || `${GLib.get_user_cache_dir()}/usagestat-bar/provider-icon-catalog`;
        this.clock = clock;
        this.automatic = automatic;
        this.fetch = fetch || ((url, limit) => this._download(url, limit));
        this.listeners = new Set();
        this.status = {bundled: bundledProviderIconVersion, active: providerIconVersion};
        this.generation = null;
    }

    start() {
        // A previous host lifecycle may have left live bindings pointing at a
        // cache generation that has since been removed or damaged.
        activateProviderCatalog();
        this.cancel = new Gio.Cancellable();
        this.session = new Soup.Session({timeout: 45, user_agent: 'UsageStat-Bar-provider-icons'});
        try {
            if (GLib.mkdir_with_parents(this.root, 0o700) !== 0) throw new Error('Cannot create the provider icon cache');
            this.reload();
            this.monitor = file(this.root).monitor_directory(Gio.FileMonitorFlags.NONE, this.cancel);
            this.monitorId = this.monitor.connect('changed', (_monitor, changed) => {
                if (['active.json', 'status.json'].includes(changed.get_basename())) this.reload();
            });
        } catch (error) { this.status.error = error.message; }
        this._notify();
        if (this.automatic) {
            this.timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3600, () => {
                this.update(false); return GLib.SOURCE_CONTINUE;
            });
            this.update(false);
        }
    }

    stop() {
        this.cancel?.cancel();
        this.session?.abort();
        if (this.timer) GLib.source_remove(this.timer);
        this.timer = 0;
        if (this.monitorId) this.monitor.disconnect(this.monitorId);
        this.monitor?.cancel();
        this.monitor = null;
        this.listeners.clear();
    }

    subscribe(callback) {
        this.listeners.add(callback);
        callback(this.status, true);
        return () => this.listeners.delete(callback);
    }

    _notify(changed = false) {
        this.status = {...this.status, bundled: bundledProviderIconVersion, active: providerIconVersion, busy: Boolean(this.pending)};
        for (const callback of this.listeners) callback(this.status, changed);
    }

    reload() {
        let changed = false, cacheError = null;
        try {
            const active = read(`${this.root}/active.json`);
            if (!/^[0-9]+\.[0-9]+\.[0-9]+-[a-f0-9]{64}$/.test(active.generation)) throw new Error('Invalid cached icon generation');
            if (compareIconVersions(active.version, bundledProviderIconVersion) <= 0) {
                if (this.generation) { activateProviderCatalog(); this.generation = null; changed = true; }
            } else {
                const directory = `${this.root}/${active.generation}`;
                const bytes = file(`${directory}/manifest.json`).load_contents(null)[1];
                if (sha(bytes) !== active.manifestSha256) throw new Error('Cached icon manifest is damaged');
                const catalog = JSON.parse(decoder.decode(bytes));
                for (const name of validateIconCatalog(catalog, active.version))
                    if (!file(`${directory}/${name}`).query_exists(null)) throw new Error('Cached icon artwork is missing');
                if (active.generation !== this.generation) {
                    this._activateFont(directory);
                    activateProviderCatalog(catalog, directory);
                    this.generation = active.generation;
                    changed = true;
                }
            }
        } catch (error) {
            if (this.generation) { activateProviderCatalog(); this.generation = null; changed = true; }
            if (!error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) cacheError = error.message;
        }
        try { this.status = {...this.status, ...read(`${this.root}/status.json`)}; } catch { /* First launch or incomplete status write. */ }
        if (cacheError) this.status.error = cacheError;
        this._notify(changed);
    }

    _activateFont(directory) {
        const font = `${directory}/fonts/UsageStatProviderIcons.ttf`;
        if (!file(font).query_exists(null)) return;
        const durable = `${GLib.get_user_data_dir()}/usagestat-bar-icons/fonts/${GLib.path_get_basename(directory)}`;
        const folder = `${GLib.get_user_data_dir()}/fonts`;
        GLib.mkdir_with_parents(folder, 0o700);
        const destination = file(`${folder}/UsageStatProviderIcons.ttf`);
        if (destination.query_exists(null) && destination.query_info('standard::symlink-target',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null).get_symlink_target() === `${durable}/UsageStatProviderIcons.ttf`) return;
        GLib.mkdir_with_parents(durable, 0o700);
        // Fontconfig must keep working if the disposable catalog cache is cleared.
        for (const name of ['UsageStatProviderIcons.ttf', 'glyphs.json'])
            write(`${durable}/${name}`, file(`${directory}/fonts/${name}`).load_contents(null)[1]);
        for (const name of ['LICENSE', 'NOTICE']) write(`${durable}/${name}`, file(`${directory}/${name}`).load_contents(null)[1]);
        if (file(`${directory}/licenses`).query_exists(null)) {
            GLib.mkdir_with_parents(`${durable}/licenses`, 0o700);
            const entries = file(`${directory}/licenses`).enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
            try {
                for (let entry = entries.next_file(null); entry; entry = entries.next_file(null))
                    write(`${durable}/licenses/${entry.get_name()}`, file(`${directory}/licenses/${entry.get_name()}`).load_contents(null)[1]);
            } finally { entries.close(null); }
        }
        const temporary = file(`${folder}/.usagestat-font-${GLib.uuid_string_random()}`);
        try {
            temporary.make_symbolic_link(`${durable}/UsageStatProviderIcons.ttf`, null);
            temporary.move(destination, Gio.FileCopyFlags.OVERWRITE, null, null);
        } finally {
            try { temporary.delete(null); } catch { /* Already moved. */ }
        }
        if (GLib.find_program_in_path('fc-cache'))
            Gio.Subprocess.new(['fc-cache', folder], Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE);
    }

    async _download(url, limit) {
        const message = Soup.Message.new('GET', url);
        if (url === API) message.request_headers.append('Accept', 'application/vnd.github+json');
        const stream = await new Promise((resolve, reject) => this.session.send_async(message, GLib.PRIORITY_DEFAULT, this.cancel,
            (session, result) => { try { resolve(session.send_finish(result)); } catch (error) { reject(error); } }));
        if (message.status_code !== 200) { stream.close(null); throw new Error(`GitHub returned HTTP ${message.status_code}`); }
        return streamBytes(stream, limit, this.cancel);
    }

    _claim() {
        const lock = file(`${this.root}/lease.json`), stamp = this.clock();
        let previous, etag;
        try {
            const [, bytes, current] = lock.load_contents(null);
            etag = current;
            try { previous = JSON.parse(decoder.decode(bytes)); } catch {
                const info = lock.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null);
                previous = {expires: info.get_attribute_uint64('time::modified') + 300};
            }
            if (previous.expires > stamp) return null;
        } catch (error) {
            if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) throw error;
            try { lock.create(Gio.FileCreateFlags.PRIVATE, null).close(null); }
            catch (error) { if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS)) return null; throw error; }
            etag = lock.load_contents(null)[2];
        }
        const lease = {expires: stamp + 300, token: GLib.uuid_string_random()};
        try {
            const [, next] = lock.replace_contents(encode(lease), etag, false, Gio.FileCreateFlags.PRIVATE, null);
            return {file: lock, etag: next, expires: lease.expires};
        } catch (error) { if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.WRONG_ETAG)) return null; throw error; }
    }

    update(force = true) {
        if (this.pending) return this.pending;
        if (!force && this.status.checkedAt && this.clock() - this.status.checkedAt < DAY) return Promise.resolve();
        this.pending = this._update().finally(() => { this.pending = null; if (!this.cancel.is_cancelled()) this.reload(); });
        this._notify();
        return this.pending;
    }

    async _update() {
        let lease;
        try {
            if (GLib.mkdir_with_parents(this.root, 0o700) !== 0) throw new Error('Cannot create the provider icon cache');
            lease = this._claim();
            if (!lease) { this.status = {...this.status, message: 'Another window is updating provider icons'}; return; }
            const checkedAt = this.clock();
            write(`${this.root}/status.json`, encode({checkedAt, error: null}));
            const release = iconRelease(JSON.parse(decoder.decode(await this.fetch(API, 1000000))));
            let updated = false;
            if (compareIconVersions(release.version, providerIconVersion) > 0) {
                const compressed = await this.fetch(release.url, 16 * 1024 * 1024);
                if (sha(compressed) !== release.sha256) throw new Error('Provider icons checksum mismatch');
                const converter = new Gio.ZlibDecompressor({format: Gio.ZlibCompressorFormat.GZIP});
                const input = Gio.MemoryInputStream.new_from_bytes(new GLib.Bytes(compressed));
                const stream = new Gio.ConverterInputStream({base_stream: input, converter});
                const data = iconArchiveData(await streamBytes(stream, 64 * 1024 * 1024, this.cancel), release.version);
                let validated = 0;
                for (const [name, bytes] of data.files) {
                    if (!name.endsWith('.svg')) continue;
                    this.cancel.set_error_if_cancelled();
                    const loader = GdkPixbuf.PixbufLoader.new_with_type('svg');
                    try {
                        loader.set_size(1, 1);
                        loader.write(bytes);
                        loader.close();
                    } catch (error) {
                        try { loader.close(); } catch { /* Preserve the original parser error. */ }
                        throw new Error(`Invalid provider icon SVG ${name}: ${error.message}`);
                    }
                    // Do not monopolize GNOME Shell while validating a whole catalog.
                    if (++validated % 16 === 0) await new Promise(resolve => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE,
                        () => { resolve(); return GLib.SOURCE_REMOVE; }));
                }
                const generation = `${release.version}-${release.sha256}`;
                const directory = `${this.root}/${generation}`;
                GLib.mkdir_with_parents(directory, 0o700);
                for (const [name, bytes] of data.files) {
                    this.cancel.set_error_if_cancelled();
                    GLib.mkdir_with_parents(GLib.path_get_dirname(`${directory}/${name}`), 0o700);
                    await new Promise((resolve, reject) => file(`${directory}/${name}`).replace_contents_bytes_async(new GLib.Bytes(bytes),
                        null, false, Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION, this.cancel,
                        (target, result) => { try { target.replace_contents_finish(result); resolve(); } catch (error) { reject(error); } }));
                }
                this.cancel.set_error_if_cancelled();
                if (lease.expires <= this.clock() || lease.file.load_contents(null)[2] !== lease.etag) throw new Error('Icon update lease expired; retry');
                write(`${this.root}/active.json`, encode({generation, version: release.version, manifestSha256: sha(data.files.get('manifest.json'))}));
                updated = true;
            }
            write(`${this.root}/status.json`, encode({checkedAt, latest: release.version, updatedAt: updated ? this.clock() : this.status.updatedAt || null, error: null}));
        } catch (error) {
            if (!this.cancel.is_cancelled()) {
                const failed = {checkedAt: this.clock(), error: error.message};
                this.status = {...this.status, ...failed};
                try { write(`${this.root}/status.json`, encode(failed)); } catch { /* A full or read-only cache must not break the bar. */ }
            }
        } finally {
            if (lease) {
                try { lease.file.replace_contents(encode({expires: 0}), lease.etag, false, Gio.FileCreateFlags.PRIVATE, null); }
                catch { /* An expired lease may already belong to another updater. */ }
            }
        }
    }
}

let shared, users = 0;
export function watchProviderIcons(callback) {
    if (!shared) {
        shared = new ProviderIconUpdater({automatic: GLib.getenv('USAGESTAT_ICON_UPDATES') !== '0'});
        shared.start();
    }
    users++;
    const unsubscribe = shared.subscribe(callback);
    return () => { unsubscribe(); if (--users === 0) { shared.stop(); shared = null; } };
}
export function updateProviderIcons() { return shared?.update(true); }
