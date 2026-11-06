// Synthetic published files only. Never read, copy, or mutate the real Wiki dataset.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createApp, toNodeListener } from 'h3';
import ts from 'typescript';

const project = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
    const source = fs.readFileSync(path.join(project, file), 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const exports = {};
    vm.runInNewContext(outputText, { exports, process, console, Buffer,
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), ...globals }, { filename: file });
    return exports;
}
function write(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
}
function fixture(root, label) {
    const menu = { fixture: { icon: `/images/${label}.png` } };
    const scenes = { schema: 1, scenes: [{ id: 'fixture', label,
        counts: { overlays: 0, markers: 0, regions: 0, layers: 0 } }] };
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    write(path.join(root, 'common/menu.json'), menu);
    write(path.join(root, 'common/maps.json'), { fixture: ['one'] });
    write(path.join(root, 'en/map/scenes.json'), scenes);
    write(path.join(root, 'zh_hans/map/scenes.json'), { ...scenes, scenes: [{ ...scenes.scenes[0], label: `${label}-zh` }] });
    write(path.join(root, 'images', `${label}.png`), png);
    write(path.join(root, 'images', 'nested', 'with space.png'), png);
    write(path.join(root, 'common/secret.png'), 'not public');
    return { root, menu, scenes, png, label };
}
function request(port, url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: url, ...options }, res => {
            const bytes = [];
            res.on('data', chunk => bytes.push(chunk));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(bytes) }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => req.destroy(new Error('Fixture HTTP request timed out')));
        req.end();
    });
}
async function listen(server) {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return server.address().port;
}
async function close(server) {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
async function checkImages(port, value) {
    const url = `/images/${value.label}.png`;
    const response = await request(port, url);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, value.png);
    assert.equal(response.headers['content-type'], 'image/png');
    assert.equal(response.headers['cache-control'], 'no-cache');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    const head = await request(port, url, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal(head.headers['content-length'], String(value.png.length));
    const cached = await request(port, url, { headers: { 'if-none-match': response.headers.etag } });
    assert.equal(cached.status, 304);
    assert.equal(cached.body.length, 0);
    assert.equal((await request(port, '/images/nested/with%20space.png')).status, 200);
    for (const bad of ['/images/missing.png', '/images/nested/', '/images/anything.json',
        '/images/%2e%2e%2fcommon/secret.png', '/images/%2e%2e%5ccommon%5csecret.png',
        '/images/C%3a/secret.png', '/images/%00.png', '/images/%zz.png', '/images/escape/secret.png']) {
        assert.equal((await request(port, bad)).status, 404, bad);
    }
    assert.equal((await request(port, url, { method: 'POST' })).status, 405);
    write(path.join(value.root, 'images/added-after-start.png'), value.png);
    assert.deepEqual((await request(port, '/images/added-after-start.png')).body, value.png);
}

const temporaryParent = path.join(project, 'tmp');
fs.mkdirSync(temporaryParent, { recursive: true });
const temporary = fs.mkdtempSync(path.join(temporaryParent, 'data-root-test-'));
const originalRoot = process.env.WIKI_DATA_ROOT;
let server;
try {
    const config = load('nuxt.config.ts', { './shared/i18n': { DEFAULT_LOCALE: 'en', LOCALES: [] } },
        { __dirname: project, defineNuxtConfig: value => value }).default;
    assert.equal(config.runtimeConfig.wikiDataProjectRoot, path.resolve(project));
    assert.equal(config.runtimeConfig.public, undefined, 'No filesystem root may enter the client config');
    assert(!config.nitro.publicAssets.some(asset => asset.baseURL === '/images'), 'Dataset images must not be copied at build time');
    const fakeProject = path.join(temporary, 'wiki');
    const defaults = fixture(path.join(fakeProject, 'data'), 'default');
    const absolute = fixture(path.join(temporary, 'absolute output'), 'absolute');
    const relative = fixture(path.join(temporary, 'relative output'), 'relative');
    const outsideCwd = path.join(temporary, 'unrelated-cwd');
    fs.mkdirSync(outsideCwd);
    // Junctions work without Windows symlink privileges; all targets are synthetic.
    for (const value of [defaults, absolute, relative]) {
        fs.symlinkSync(path.join(value.root, 'common'), path.join(value.root, 'images/escape'), process.platform === 'win32' ? 'junction' : 'dir');
    }
    const roots = load('server/utils/data_root.ts', {
        'nitropack/runtime': { useRuntimeConfig: () => ({ wikiDataProjectRoot: fakeProject }) },
    });
    delete process.env.WIKI_DATA_ROOT;
    assert.equal(roots.get_wiki_data_root(), defaults.root);
    assert.equal(roots.resolve_wiki_data_root(fakeProject, ''), defaults.root);
    assert.throws(() => roots.resolve_wiki_data_root('relative-project'), /absolute Wiki project root/);
    assert.throws(() => roots.resolve_data_path(defaults.root, '../outside'), /outside/);
    const reader = load('server/utils/read.ts', { './data_root': roots });
    const imageHandler = load('server/routes/images/[...path].ts', { '../../utils/data_root': roots }).default;
    server = http.createServer(toNodeListener(createApp().use(imageHandler)));
    const port = await listen(server);
    for (const [env, value] of [[undefined, defaults], [absolute.root, absolute], ['../relative output', relative]]) {
        if (env === undefined) delete process.env.WIKI_DATA_ROOT;
        else process.env.WIKI_DATA_ROOT = env;
        assert.deepEqual(JSON.parse(JSON.stringify(await reader.read_common('menu'))), value.menu);
        assert.deepEqual(JSON.parse(JSON.stringify(await reader.read_common('maps'))), { fixture: ['one'] });
        assert.deepEqual(JSON.parse(JSON.stringify(await reader.read_lang('map/scenes', 'en'))), value.scenes);
        assert.equal((await reader.read_lang('map/scenes', 'zh_hans')).scenes[0].label, `${value.label}-zh`);
        await checkImages(port, value);
    }
    await close(server); server = undefined;
    console.log('Data root: default/absolute/relative JSON + images, live files, GET/HEAD/304, traversal and symlink rejection passed.');

    const productionIndex = process.argv.indexOf('--production');
    if (productionIndex !== -1) {
        assert(process.argv[productionIndex + 1], '--production requires a compiled Node entry');
        const entry = path.resolve(process.argv[productionIndex + 1]);
        assert(fs.existsSync(entry), `Missing build: ${entry}`);
        for (const [configured, value] of [[absolute.root, absolute], [path.relative(project, relative.root), relative]]) {
            // Reserve an ephemeral port, then release it for Nitro (PORT=0 is treated as 3000).
            const probe = http.createServer();
            const productionPort = await listen(probe); await close(probe);
            const env = { ...process.env, WIKI_DATA_ROOT: configured, NITRO_HOST: '127.0.0.1', NITRO_PORT: String(productionPort) };
            delete env.NUXT_WIKI_DATA_PROJECT_ROOT;
            delete env.NITRO_WIKI_DATA_PROJECT_ROOT;
            const child = spawn(process.execPath, [entry], { cwd: outsideCwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
            let logs = '';
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error(`Production startup timeout: ${logs}`)), 45000);
                    child.once('error', error => { clearTimeout(timeout); reject(error); });
                    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Production exited ${code}: ${logs}`)); });
                    child.stderr.on('data', chunk => { logs += chunk; });
                    child.stdout.on('data', chunk => {
                        logs += chunk;
                        if (logs.includes(`127.0.0.1:${productionPort}`)) { clearTimeout(timeout); resolve(); }
                    });
                });
                const menu = await request(productionPort, '/api/menu');
                assert.equal(menu.status, 200, logs);
                assert.deepEqual(JSON.parse(menu.body), value.menu);
                const scenes = await request(productionPort, '/api/map/scenes?lang=en');
                assert.equal(scenes.status, 200, logs);
                assert.deepEqual(JSON.parse(scenes.body), value.scenes);
                await checkImages(productionPort, value);
            } finally {
                if (child.exitCode === null && child.signalCode === null) {
                    const exited = once(child, 'exit'); child.kill(); await exited;
                }
            }
        }
        console.log('Compiled production: absolute + relative runtime roots override build environment from an unrelated cwd; JSON and images agree.');
    }
} finally {
    if (server) await close(server);
    if (originalRoot === undefined) delete process.env.WIKI_DATA_ROOT;
    else process.env.WIKI_DATA_ROOT = originalRoot;
    // Only this mkdtemp-created fixture tree is removed, never a configured data root.
    assert(path.dirname(temporary) === temporaryParent && path.basename(temporary).startsWith('data-root-test-'));
    fs.rmSync(temporary, { recursive: true, force: true });
}
