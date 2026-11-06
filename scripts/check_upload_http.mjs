// Synthetic HTTP regression only. Never reads or writes a configured/live dataset.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { once } from 'node:events';
import { fork } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as h3 from 'h3';
import ts from 'typescript';
import { CONTENT_CATEGORIES } from '@inteyvat-wiki/wiki-contracts/registry';
import { DATA_UPLOAD_MAGIC, DATA_UPLOAD_CONTENT_TYPE, DEFAULT_UPLOAD_LIMITS, isUploadResult, isUploadStatus } from '@inteyvat-wiki/wiki-contracts/upload';

const project = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const json = value => Buffer.from(JSON.stringify(value));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function sourceLoader(options = {}) {
    const cache = new Map();
    const simulatedProcess = Object.create(process);
    if (options.trace) Object.defineProperty(simulatedProcess, 'platform', { value: 'linux' });
    const io = require('node:fs/promises');
    const wrappedIO = { ...io,
        async open(file, ...args) {
            // Exercise POSIX durability ordering on Windows too, without pretending
            // Windows can fsync a real directory handle. Real file I/O remains native.
            const directory = options.trace && args[0] === 'r' && fs.statSync(file).isDirectory();
            const handle = directory ? {
                async sync() { options.trace.push(['sync', file]); if (options.failSync?.(file)) throw new Error('Injected fsync failure'); },
                async close() {},
            } : await io.open(file, ...args);
            const state = options.fileIO;
            if (!state || !file.includes(`${path.sep}staging${path.sep}upload-`)) return handle;
            const kind = directory ? 'directory' : 'file';
            state.handles.set(file, kind);
            state.peak[kind] = Math.max(state.peak[kind], [...state.handles.values()].filter(value => value === kind).length);
            state.events.push(['open', kind, file]);
            return new Proxy(handle, { get(target, property) {
                if (property === 'sync') return async () => {
                    state.events.push(['sync-start', kind, file]);
                    await options.beforeSync?.(kind, file);
                    await target.sync();
                    state.events.push(['sync-done', kind, file]);
                };
                if (property === 'close') return async () => {
                    await target.close();
                    state.handles.delete(file); state.events.push(['close', kind, file]);
                    await options.afterClose?.(kind, file);
                };
                const value = Reflect.get(target, property, target);
                return typeof value === 'function' ? value.bind(target) : value;
            } });
        },
        async rename(from, to) {
            options.trace?.push(['rename', from, to]);
            options.fileIO?.events.push(['rename', from, to]);
            if (options.failRename?.(to)) throw new Error('Injected rename failure');
            if (options.transientRename?.(to)) throw Object.assign(new Error('Injected sharing violation'), { code: 'EPERM' });
            return io.rename(from, to);
        },
        async rm(file, ...args) {
            if (options.fileIO) {
                options.fileIO.cleanup.push(options.fileIO.handles.size);
                options.fileIO.events.push(['cleanup', file]);
            }
            return io.rm(file, ...args);
        },
    };
    function load(file) {
        file = path.resolve(file);
        if (cache.has(file)) return cache.get(file);
        const exports = {}; cache.set(file, exports);
        const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        });
        vm.runInNewContext(outputText, { exports, process: simulatedProcess, console, Buffer, setTimeout, clearTimeout, ...h3,
            require(name) {
                if (name === 'node:fs/promises') return wrappedIO;
                if (name === 'nitropack/runtime') return { useRuntimeConfig: () => ({ wikiDataProjectRoot: project }), defineNitroPlugin: plugin => plugin };
                if (name.startsWith('.')) return load(path.resolve(path.dirname(file), `${name}.ts`));
                if (name.startsWith('#server/')) return load(path.join(project, name.replace('#server/', 'server/') + '.ts'));
                if (name.startsWith('~~/')) return load(path.join(project, name.slice(3) + '.ts'));
                return require(name);
            },
        }, { filename: file });
        if (options.trace && exports.publish_upload) {
            const publish = exports.publish_upload;
            exports.publish_upload = async (...args) => {
                try { return await publish(...args); }
                catch (error) { options.trace.push(['error', error.code || error.statusCode, error.message]); throw error; }
            };
        }
        return exports;
    }
    return relative => load(path.join(project, relative));
}

async function fixtureServer(options) {
    const load = sourceLoader(options);
    const get = load('server/api/admin/data.get.ts').default;
    const post = load('server/api/admin/data.post.ts').default;
    const menu = load('server/api/menu.ts').default;
    const scenes = load('server/api/map/scenes/index.ts').default;
    const images = load('server/routes/images/[...path].ts').default;
    const reader = load('server/utils/read.ts');
    let pinStarted, pinContinue;
    const pinReady = new Promise(resolve => { pinStarted = resolve; });
    const pinGate = new Promise(resolve => { pinContinue = resolve; });
    const app = h3.createApp().use(h3.defineEventHandler(async event => {
        if (event.path.split('?')[0] === '/api/admin/data') return (event.method === 'GET' ? get : post)(event);
        if (event.path === '/api/menu') return menu(event);
        if (event.path.startsWith('/api/map/scenes')) return scenes(event);
        if (event.path.startsWith('/images/')) return images(event);
        if (event.path === '/pin') {
            const before = await reader.read_common('menu'); pinStarted(); await pinGate;
            return { before, after: await reader.read_common('menu') };
        }
        throw h3.createError({ statusCode: 404 });
    }));
    // Create the listener BEFORE plugins, just like Nitro's localCall. h3 must read app.handler dynamically.
    const server = http.createServer(h3.toNodeListener(app));
    load('server/plugins/data_snapshot.ts').default({ h3App: app });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    return { server, port: server.address().port, pinReady, pinContinue, load };
}

function snapshot(label, mutate = () => {}) {
    const files = new Map();
    files.set('common/menu.json', json({ fixture: { icon: `/images/${label}.png` } }));
    files.set('common/maps.json', json({}));
    files.set('common/map/task_dependencies.json', json({ schema: 1, sameTaskOrder: 'ascending', edges: [] }));
    for (const category of CONTENT_CATEGORIES) {
        files.set(`common/${category}/ids.json`, json([]));
        for (const lang of ['en', 'zh_hans']) files.set(`${lang}/${category}/pages.json`, json([]));
    }
    for (const lang of ['en', 'zh_hans']) {
        files.set(`${lang}/map/catalogue.json`, json({ schema: 1, items: [] }));
        files.set(`${lang}/map/scenes.json`, json({ schema: 1, scenes: [] }));
    }
    files.set(`images/${label}.png`, png);
    mutate(files);
    return bundle(files);
}
function bundle(files, change = () => {}, rawManifest) {
    const entries = [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const manifest = { schema: 1, files: entries.map(([name, bytes]) => ({ path: name, size: bytes.length, sha256: hash(bytes) })),
        totalBytes: entries.reduce((sum, [, bytes]) => sum + bytes.length, 0) };
    change(manifest);
    const metadata = rawManifest || json(manifest), size = Buffer.alloc(4); size.writeUInt32BE(metadata.length);
    const releaseId = hash(metadata);
    return { files, manifest, metadata, releaseId,
        bytes: Buffer.concat([Buffer.from(DATA_UPLOAD_MAGIC), size, metadata, ...entries.map(([, bytes]) => bytes), Buffer.from(releaseId, 'hex')]) };
}

function request(port, url, { method = 'GET', headers = {}, body, hold = false } = {}) {
    let req;
    const response = new Promise((resolve, reject) => {
        req = http.request({ hostname: '127.0.0.1', port, path: url, method, headers, agent: false }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(15000, () => req.destroy(new Error('Synthetic HTTP timeout')));
        if (hold) { req.flushHeaders(); if (body) req.write(body); }
        else req.end(body);
    });
    return { req, response };
}
async function waitFor(test) {
    for (let i = 0; i < 500; i++) { if (test()) return; await sleep(10); }
    throw new Error('Synthetic state timeout');
}
async function close(server) { await new Promise(resolve => server.close(resolve)); }

function gate() {
    let release;
    const promise = new Promise(resolve => { release = resolve; });
    return { promise, release };
}

async function batchDurabilityChecks(temp, auth) {
    const value = snapshot('batch', files => {
        // Several batches, long shallow names and a short deep path exercise REAL
        // depth barriers, not accidental descending character-length ordering.
        for (let i = 0; i < 80; i++) files.set(`images/long-shallow-directory-${i}/icon.png`, png);
        files.set('images/z/a/b/deep.png', png);
    });
    async function scenario(label, hooks, run) {
        const base = path.join(temp, `batch-${label}`), storage = `${base}.publish`;
        process.env.WIKI_DATA_ROOT = base;
        const state = { handles: new Map(), peak: { file: 0, directory: 0 }, events: [], cleanup: [] };
        const instance = await fixtureServer({ trace: [], fileIO: state, ...hooks });
        const send = (data = value, options = {}) => request(instance.port, '/api/admin/data', {
            method: 'POST', body: data.bytes, headers: { ...auth, 'content-type': DATA_UPLOAD_CONTENT_TYPE, 'x-wiki-base-release': 'none' }, ...options,
        });
        const uncommitted = () => {
            assert(!fs.existsSync(path.join(storage, 'current.json')), label);
            assert.deepEqual(fs.readdirSync(path.join(storage, 'releases')), [], label);
        };
        const cleaned = () => {
            uncommitted(); assert.equal(state.handles.size, 0, label);
            assert.deepEqual(fs.readdirSync(path.join(storage, 'staging')), [], label);
            assert(!fs.existsSync(path.join(storage, 'upload.lock')), label);
            assert.deepEqual(state.cleanup, [0], 'cleanup waits for every outstanding handle');
        };
        try { await run({ state, send, storage, uncommitted, cleaned }); }
        finally { await close(instance.server); }
    }

    // Even with the complete request already sent, the last file and directory
    // syncs are publication barriers. Gate them instead of relying on disk speed.
    const firstBatch = gate(), lastFile = gate(), lastDirectory = gate();
    const finalFile = value.manifest.files.at(-1).path.split('/').join(path.sep);
    let fileSyncStarts = 0, finalFileWaiting = false, finalDirectoryWaiting = false;
    try {
        await scenario('success', { beforeSync: async (kind, file) => {
            if (kind === 'file' && ++fileSyncStarts <= 32) await firstBatch.promise;
            if (kind === 'file' && file.endsWith(path.sep + finalFile)) {
                finalFileWaiting = true; await lastFile.promise;
            }
            if (kind === 'directory' && path.basename(file).startsWith('upload-')) {
                finalDirectoryWaiting = true; await lastDirectory.promise;
            }
            await sleep(2);
        } }, async ({ state, send, storage, uncommitted }) => {
            const upload = send(); upload.response.catch(() => {});
            try {
                await waitFor(() => fileSyncStarts === 32);
                assert.equal(state.peak.file, 32); uncommitted(); firstBatch.release();
                await waitFor(() => finalFileWaiting);
                assert.equal(fileSyncStarts, value.manifest.files.length, 'every file is individually fsynced');
                uncommitted(); lastFile.release();
                await waitFor(() => finalDirectoryWaiting);
                uncommitted(); lastDirectory.release();
                const response = await upload.response;
                assert.equal(response.status, 200, response.body.toString());
                assert.equal(state.handles.size, 0);
                assert.equal(state.peak.file, 32);
                assert.equal(state.peak.directory, 32);
                assert.equal(JSON.parse(fs.readFileSync(path.join(storage, 'current.json'))).releaseId, value.releaseId);
                const published = state.events.findIndex(([action, , to]) => action === 'rename' && to.includes(`${path.sep}releases${path.sep}`));
                const completed = state.events.slice(0, published);
                assert.equal(completed.filter(([action, kind, file]) => action === 'sync-done' && kind === 'file' && !file.endsWith('.manifest.json')).length,
                    value.manifest.files.length);
                assert.equal(completed.filter(([action, kind]) => action === 'open' && kind === 'file').length,
                    completed.filter(([action, kind]) => action === 'close' && kind === 'file').length);
                const directories = completed.filter(([action, kind]) => action === 'open' && kind === 'directory').map(([, , file]) => file);
                for (const file of directories) {
                    const started = completed.findIndex(([action, kind, name]) => action === 'sync-start' && kind === 'directory' && name === file);
                    for (const child of directories.filter(child => child.split(path.sep).length > file.split(path.sep).length)) {
                        const closed = completed.findIndex(([action, kind, name]) => action === 'close' && kind === 'directory' && name === child);
                        assert(closed >= 0 && closed < started, 'all deeper directories close before any parent-level sync');
                    }
                    assert(completed.some(([action, kind, name]) => action === 'sync-done' && kind === 'directory' && name === file));
                }
            } finally { firstBatch.release(); lastFile.release(); lastDirectory.release(); upload.req.destroy(); }
        });
    } finally { firstBatch.release(); lastFile.release(); lastDirectory.release(); }

    for (const kind of ['file', 'directory']) {
        const pending = gate(); let started = 0;
        try {
            await scenario(`${kind}-sync-failure`, { beforeSync: async (actual, file) => {
                if (actual !== kind) return;
                if (kind === 'directory' && !path.basename(file).startsWith('long-shallow-directory-')) return;
                if (++started === 1) throw new Error('Injected file/directory fsync failure');
                await pending.promise;
            } }, async ({ state, send, storage, uncommitted, cleaned }) => {
                const upload = send(); upload.response.catch(() => {});
                try {
                    await waitFor(() => started > 1);
                    await sleep(25); uncommitted();
                    assert.equal(state.cleanup.length, 0, 'failure must wait for other pending syncs');
                    assert(state.handles.size > 0); assert(fs.existsSync(path.join(storage, 'upload.lock')));
                    pending.release(); assert.equal((await upload.response).status, 503); cleaned();
                } finally { pending.release(); upload.req.destroy(); }
            });
        } finally { pending.release(); }
    }

    // A close error is also fatal, even when the native descriptor was closed.
    let closeFailed = false;
    await scenario('close-failure', { afterClose: kind => {
        if (kind === 'file' && !closeFailed) { closeFailed = true; throw new Error('Injected close failure'); }
    } }, async ({ send, cleaned }) => { assert.equal((await send().response).status, 503); cleaned(); });

    const interrupted = gate(); let syncStarts = 0;
    try {
        await scenario('aborted', { beforeSync: async kind => {
            if (kind === 'file') { syncStarts++; await interrupted.promise; }
        } }, async ({ state, send, storage, cleaned }) => {
            const upload = send(value, { hold: true }); upload.response.catch(() => {});
            try {
                await waitFor(() => syncStarts === 32); upload.req.destroy(); await sleep(25);
                assert.equal(state.cleanup.length, 0); assert.equal(state.handles.size, 32);
                interrupted.release(); await waitFor(() => !fs.existsSync(path.join(storage, 'upload.lock'))); cleaned();
            } finally { interrupted.release(); upload.req.destroy(); }
        });
    } finally { interrupted.release(); }
    await scenario('validation-failure', {}, async ({ send, cleaned }) => {
        const invalid = snapshot('invalid-batch', files => files.set('common/maps.json', Buffer.from('{')));
        assert.equal((await send(invalid).response).status, 400); cleaned();
    });
    console.log('Upload batches: file sync/close failure, bounded 32 handles, complete-file/directory persistence barriers, depth ordering and pending-I/O abort cleanup passed.');
}

if (process.argv.includes('--worker')) {
    const instance = await fixtureServer();
    process.send({ port: instance.port });
    process.on('message', async message => { if (message === 'stop') { await close(instance.server); process.exit(0); } });
} else {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-upload-test-'));
    const base = path.join(temp, 'legacy');
    const storage = `${base}.publish`;
    const token = randomBytes(32).toString('hex');
    const original = new Map(Object.keys(process.env).filter(key => key.startsWith('WIKI_')).map(key => [key, process.env[key]]));
    for (const key of original.keys()) delete process.env[key];
    process.env.WIKI_DATA_ROOT = base;
    process.env.WIKI_UPLOAD_TOKEN = token;
    fs.mkdirSync(path.join(base, 'common'), { recursive: true });
    fs.writeFileSync(path.join(base, 'common/menu.json'), json({ legacy: { icon: '/images/legacy.png' } }));
    const originalMenu = fs.readFileSync(path.join(base, 'common/menu.json'));
    let instance, child;
    try {
        instance = await fixtureServer();
        const { port } = instance;
        const auth = { authorization: `Bearer ${token}` };
        const getStatus = () => request(port, '/api/admin/data', { headers: auth }).response;
        const post = (value, expected = 'none', headers = {}, options = {}) => request(port, '/api/admin/data', {
            method: 'POST', body: value.bytes, headers: { ...auth, 'content-type': DATA_UPLOAD_CONTENT_TYPE,
                'x-wiki-base-release': expected, ...headers }, ...options,
        }).response;
        const first = snapshot('first');
        // No bytes are sent: authentication must complete without reading the body or acquiring the lock.
        const denied = request(port, '/api/admin/data', { method: 'POST', hold: true,
            headers: { authorization: `Bearer ${'f'.repeat(64)}`, 'content-length': '999999999' } });
        assert.equal((await denied.response).status, 401); denied.req.destroy();
        assert(!fs.existsSync(storage));
        delete process.env.WIKI_UPLOAD_TOKEN;
        assert.equal((await getStatus()).status, 503);
        process.env.WIKI_UPLOAD_TOKEN = token.toUpperCase();
        assert.equal((await getStatus()).status, 503);
        process.env.WIKI_UPLOAD_TOKEN = token;
        assert.equal((await request(port, '/api/admin/data', { headers: { ...auth, origin: 'https://example.test' } }).response).status, 403);
        assert.equal((await request(port, '/api/admin/data?token=ignored', { headers: auth }).response).status, 400);
        assert.equal((await request(port, '/api/admin/data', { headers: { ...auth, cookie: 'token=ignored' } }).response).status, 400);
        const initial = await getStatus();
        assert.equal(initial.status, 200); assert(isUploadStatus(JSON.parse(initial.body)));
        assert.equal(JSON.parse(initial.body).releaseId, null);
        assert.deepEqual(JSON.parse(initial.body).limits, DEFAULT_UPLOAD_LIMITS);
        const missingBase = request(port, '/api/admin/data', { method: 'POST', hold: true, headers: auth });
        assert.equal((await missingBase.response).status, 428); missingBase.req.destroy();
        assert.equal((await post(first, 'a'.repeat(64))).status, 409);
        assert.equal((await post(first, 'none', { 'content-encoding': 'gzip' })).status, 415);
        assert.equal((await post(first, 'none', { 'content-type': 'application/json' })).status, 415);

        // The server cannot commit merely because all file bytes arrived; it must wait for the trailer AND EOF.
        const waiting = request(port, '/api/admin/data', { method: 'POST', hold: true,
            headers: { ...auth, 'content-type': DATA_UPLOAD_CONTENT_TYPE, 'x-wiki-base-release': 'none' }, body: first.bytes.subarray(0, -32) });
        await waitFor(() => fs.existsSync(path.join(storage, 'upload.lock')));
        assert.equal(JSON.parse((await getStatus()).body).releaseId, null);
        assert.equal((await post(first)).status, 409);
        child = fork(fileURLToPath(import.meta.url), ['--worker'], { env: { ...process.env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
        let childLogs = ''; child.stderr.on('data', data => { childLogs += data; });
        const [message] = await once(child, 'message');
        assert.equal((await request(message.port, '/api/admin/data', { method: 'POST', body: first.bytes,
            headers: { ...auth, 'content-type': DATA_UPLOAD_CONTENT_TYPE, 'x-wiki-base-release': 'none' } }).response).status, 409, childLogs);
        waiting.req.write(first.bytes.subarray(-32));
        await sleep(50); assert.equal(JSON.parse((await getStatus()).body).releaseId, null);
        waiting.req.end();
        const success = await waiting.response;
        assert.equal(success.status, 200, success.body.toString()); assert(isUploadResult(JSON.parse(success.body)));
        assert.equal(JSON.parse(success.body).releaseId, first.releaseId);
        assert.equal(instance.server.requestTimeout, 300_000, 'default uploads must not widen other routes request timeouts');
        assert.equal((await post(first, first.releaseId)).status, 200, 'idempotent immutable release reuse');
        assert.equal((await post(first, 'none')).status, 409);
        assert.equal(JSON.parse((await request(port, '/api/menu').response).body).fixture.icon, '/images/first.png');
        assert.deepEqual((await request(port, '/images/first.png').response).body, png);
        assert.equal((await request(port, '/api/map/scenes?lang=en').response).status, 200);
        assert.deepEqual(fs.readFileSync(path.join(base, 'common/menu.json')), originalMenu);

        const unchanged = () => {
            assert.equal(JSON.parse(fs.readFileSync(path.join(storage, 'current.json'))).releaseId, first.releaseId);
            assert.deepEqual(fs.readdirSync(path.join(storage, 'staging')), []);
            assert(!fs.existsSync(path.join(storage, 'upload.lock')));
        };
        async function reject(value, expectedStatus = 400, headers = {}) {
            const response = await post(value, first.releaseId, headers);
            assert([expectedStatus].flat().includes(response.status), `${response.status}: ${response.body}`); unchanged();
        }
        await reject(bundle(first.files, value => { value.files[0].path = '../escape.json'; }));
        await reject(bundle(first.files, value => { value.files[1].path = value.files[0].path; }));
        await reject(bundle(first.files, value => { value.files[1].path = value.files[0].path.toUpperCase(); }));
        await reject(bundle(first.files, value => { value.files[0].sha256 = '0'.repeat(64); }));
        await reject(bundle(first.files, value => { value.files.pop(); }));
        await reject({ bytes: first.bytes.subarray(0, -1) });
        await reject({ bytes: Buffer.concat([first.bytes.subarray(0, -32), Buffer.alloc(32)]) });
        await reject({ bytes: Buffer.concat([first.bytes, Buffer.from('extra')]) }, [400, 413]);
        await reject(snapshot('bad-json', files => files.set('common/maps.json', Buffer.from('{'))));
        await reject(snapshot('bad-utf8', files => files.set('common/maps.json', Buffer.from([0x22, 0xff, 0x22]))));
        await reject(snapshot('bad-png', files => files.set('images/bad-png.png', Buffer.alloc(68))));
        await reject(snapshot('missing-image', files => files.set('common/menu.json', json({ fixture: { icon: '/images/absent.png' } }))));
        await reject(snapshot('bad-pages', files => files.set('en/book/pages.json', json([{}]))));
        await reject(snapshot('bad-maps', files => files.set('en/map/catalogue.json', json({ schema: 1, items: [{}] }))));
        await reject(snapshot('missing-dependencies', files => files.delete('common/map/task_dependencies.json')));
        await reject(snapshot('invalid-dependencies', files => files.set('common/map/task_dependencies.json', json({ schema: 1, edges: [] }))));
        await reject(snapshot('missing-item', files => files.set('common/book/ids.json', json(['one']))));
        process.env.WIKI_UPLOAD_MAX_BYTES = '100';
        await reject(first, 413, { 'content-length': String(first.bytes.length + DEFAULT_UPLOAD_LIMITS.maxManifestBytes) });
        await reject(first, 400);
        delete process.env.WIKI_UPLOAD_MAX_BYTES;
        process.env.WIKI_UPLOAD_MAX_MANIFEST_BYTES = '10'; await reject(first, 413); delete process.env.WIKI_UPLOAD_MAX_MANIFEST_BYTES;
        process.env.WIKI_UPLOAD_MAX_FILES = '0'; assert.equal((await getStatus()).status, 503); delete process.env.WIKI_UPLOAD_MAX_FILES;
        const huge = Buffer.alloc(4); huge.writeUInt32BE(0xffffffff);
        await reject({ bytes: Buffer.concat([Buffer.from(DATA_UPLOAD_MAGIC), huge]) }, 413);

        const aborted = request(port, '/api/admin/data', { method: 'POST', hold: true, body: first.bytes.subarray(0, -40),
            headers: { ...auth, 'content-type': DATA_UPLOAD_CONTENT_TYPE, 'x-wiki-base-release': first.releaseId } });
        aborted.response.catch(() => {});
        await waitFor(() => fs.existsSync(path.join(storage, 'upload.lock'))); aborted.req.destroy();
        await waitFor(() => !fs.existsSync(path.join(storage, 'upload.lock'))); unchanged();
        process.env.WIKI_UPLOAD_IDLE_TIMEOUT_MS = '100';
        const idle = request(port, '/api/admin/data', { method: 'POST', hold: true, body: Buffer.from(DATA_UPLOAD_MAGIC),
            headers: { ...auth, 'content-type': DATA_UPLOAD_CONTENT_TYPE, 'x-wiki-base-release': first.releaseId } });
        assert.equal((await idle.response).status, 408); idle.req.destroy(); delete process.env.WIKI_UPLOAD_IDLE_TIMEOUT_MS; unchanged();

        const pin = request(port, '/pin').response; await instance.pinReady;
        const second = snapshot('second', files => {
            files.set('common/book/ids.json', json(['one']));
            for (const lang of ['en', 'zh_hans']) {
                files.set(`${lang}/book/pages.json`, json([{ id: 'one', name: lang, icon: '/images/second.png', star: null,
                    show: lang === 'en', items: ['one'], related_items: [], set: lang }]));
                files.set(`${lang}/book/items/one.json`, json({ name: lang, icon: '/images/second.png', star: null, type: null, info: [] }));
            }
        });
        process.env.WIKI_UPLOAD_EXTEND_NODE_TIMEOUT = '1';
        assert.equal((await post(second, first.releaseId, { 'content-length': String(second.bytes.length) })).status, 200);
        delete process.env.WIKI_UPLOAD_EXTEND_NODE_TIMEOUT;
        assert.equal(instance.server.requestTimeout, 30 * 60_000, 'explicit operator opt-in raises server-wide ceiling');
        instance.pinContinue(); const pinned = JSON.parse((await pin).body);
        assert.deepEqual(pinned.before, pinned.after); assert.equal(pinned.before.fixture.icon, '/images/first.png');
        assert.equal(JSON.parse((await request(port, '/api/menu').response).body).fixture.icon, '/images/second.png');
        assert(fs.existsSync(path.join(storage, 'releases', first.releaseId, 'images/first.png')));
        assert.equal((await request(port, '/images/../current.json').response).status, 404);

        // A fresh production install need not have a legacy data directory at all.
        const fresh = path.join(temp, 'missing'); process.env.WIKI_DATA_ROOT = fresh;
        assert.equal(JSON.parse((await getStatus()).body).releaseId, null); assert(!fs.existsSync(fresh));
        assert.equal((await post(first)).status, 200); assert(!fs.existsSync(fresh));
        assert.deepEqual((await request(port, '/images/first.png').response).body, png);
        const unsafe = path.join(temp, 'unsafe'); fs.mkdirSync(unsafe);
        fs.symlinkSync(`${fresh}.publish`, `${unsafe}.publish`, process.platform === 'win32' ? 'junction' : 'dir');
        process.env.WIKI_DATA_ROOT = unsafe;
        assert.equal((await getStatus()).status, 503); assert.equal((await post(first)).status, 503);
        const alias = path.join(temp, 'linked-base'); fs.symlinkSync(base, alias, process.platform === 'win32' ? 'junction' : 'dir');
        process.env.WIKI_DATA_ROOT = alias;
        assert.equal((await getStatus()).status, 503); assert.equal((await post(first)).status, 503);
        // Fault injection is confined to a separate synthetic server and fresh store.
        const durable = path.join(temp, 'durability'); process.env.WIKI_DATA_ROOT = durable;
        const trace = []; let failDirectories = false, failPointer = false, transientFailures = 0;
        const faults = await fixtureServer({ trace,
            failSync: file => failDirectories && file.endsWith(`${path.sep}common${path.sep}map`),
            failRename: file => failPointer && file.endsWith(`${path.sep}current.json`),
            transientRename: () => transientFailures > 0 && Boolean(transientFailures--),
        });
        const faultPost = value => request(faults.port, '/api/admin/data', { method: 'POST', body: value.bytes,
            headers: { ...auth, 'content-type': DATA_UPLOAD_CONTENT_TYPE, 'x-wiki-base-release': 'none' } }).response;
        try {
            failDirectories = true;
            assert.equal((await faultPost(first)).status, 503);
            assert(!fs.existsSync(`${durable}.publish/current.json`));
            assert.deepEqual(fs.readdirSync(`${durable}.publish/staging`), []);
            assert(trace.some(([action, file]) => action === 'sync' && file === temp), 'publisher creation syncs its parent');
            failDirectories = false; failPointer = true;
            trace.length = 0;
            assert.equal((await faultPost(first)).status, 503);
            assert(trace.some(([action, , to]) => action === 'rename' && to.endsWith(`${path.sep}current.json`)), JSON.stringify(trace));
            assert(!fs.existsSync(`${durable}.publish/current.json`));
            assert(fs.existsSync(`${durable}.publish/releases/${first.releaseId}`), 'complete release is retained after pointer failure');
            assert.deepEqual(fs.readdirSync(`${durable}.publish/staging`), []);
            failPointer = false; trace.length = 0; transientFailures = 2;
            assert.equal((await faultPost(second)).status, 200, JSON.stringify(trace));
            assert.equal(transientFailures, 0, 'transient atomic rename failures were retried');
            const releaseRename = trace.findIndex(([action, , to]) => action === 'rename' && to.includes(`${path.sep}releases${path.sep}`));
            const pointerRename = trace.findIndex(([action, , to]) => action === 'rename' && to.endsWith(`${path.sep}current.json`));
            const nested = trace.findIndex(([action, file]) => action === 'sync' && file.endsWith(`${path.sep}common${path.sep}map`));
            const common = trace.findIndex(([action, file]) => action === 'sync' && file.endsWith(`${path.sep}common`));
            assert(nested >= 0 && nested < common && common < releaseRename && releaseRename < pointerRename);
            assert(trace.slice(releaseRename + 1, pointerRename).some(([action, file]) => action === 'sync' && file.endsWith(`${path.sep}releases`)));
            assert(trace.slice(pointerRename + 1).some(([action, file]) => action === 'sync' && file === `${durable}.publish`));
        } finally { await close(faults.server); }
        await batchDurabilityChecks(temp, auth);
        console.log('Upload HTTP: auth-before-body, limits, framing/trailer/EOF, hashes, JSON/PNG, full structure, cross-process lock, abort/timeout cleanup, immutable releases, request pinning, symlinks and fresh deployment passed.');
        console.log('Upload durability: bottom-up directory sync ordering and pre-commit fsync/pointer rename failures passed (POSIX calls simulated on Windows).');
    } finally {
        instance?.pinContinue();
        if (child) { const exited = once(child, 'exit'); child.send('stop'); await exited; }
        if (instance) await close(instance.server);
        for (const key of Object.keys(process.env)) if (key.startsWith('WIKI_')) delete process.env[key];
        for (const [key, value] of original) process.env[key] = value;
        assert(path.dirname(temp) === os.tmpdir() && path.basename(temp).startsWith('wiki-upload-test-'));
        fs.rmSync(temp, { recursive: true, force: true });
    }
}
