import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
const currentName = source.match(/const CACHE_NAME = "([^"]+)"/)[1];
const scope = 'https://example.test/ku-bus/';
const shell = `${scope}index.html`;
const legacyName = 'ku-shuttle-pwa-20260913-android-1';
const oldV2Name = 'ku-shuttle-pwa-v2-previous';
const keyFor = request => typeof request === 'string' ? new URL(request, scope).href : request.url;

function harness({ seeded = {}, network, windows = [], expireTimer = false } = {}) {
  const handlers = new Map();
  const stores = new Map();
  const fetched = [];
  const added = [];
  const deleted = [];
  const timers = new Set();
  const state = { claims: 0, skips: 0, matchOptions: null };
  for (const [name, entries] of Object.entries(seeded)) {
    stores.set(name, new Map(Object.entries(entries).map(([url, body]) => [keyFor(url), new Response(body)])));
  }
  const cacheFor = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async match(request) { return store.get(keyFor(request))?.clone(); },
      async put(request, response) { store.set(keyFor(request), response.clone()); },
      async addAll(requests) {
        added.push(...requests);
        for (const request of requests) store.set(keyFor(request), new Response(`precache:${request.url}`));
      }
    };
  };
  const context = vm.createContext({
    URL, Request, Response, AbortController,
    setTimeout(fn, delay) {
      assert.equal(delay, 4000, 'navigation fallback stays bounded at 4 seconds');
      const token = expireTimer ? setTimeout(fn, 5) : Symbol('timer');
      timers.add(token);
      return token;
    },
    clearTimeout(token) {
      if (expireTimer) clearTimeout(token);
      timers.delete(token);
    },
    self: {
      registration: { scope },
      location: { origin: new URL(scope).origin },
      addEventListener(type, listener) { handlers.set(type, listener); },
      async skipWaiting() { state.skips += 1; },
      clients: {
        async claim() { state.claims += 1; },
        async matchAll(options) { state.matchOptions = options; return windows; }
      }
    },
    caches: {
      async open(name) { return cacheFor(name); },
      async keys() { return [...stores.keys()]; },
      async delete(name) { deleted.push(name); return stores.delete(name); }
    },
    async fetch(request, options) {
      fetched.push({ request, options });
      if (network) return network(request, options);
      throw new TypeError('Offline');
    }
  });
  vm.runInContext(source, context, { filename: 'service-worker.js' });
  return {
    fetched, added, deleted, state, stores, timers,
    async lifecycle(type) {
      const pending = [];
      handlers.get(type)({ waitUntil(promise) { pending.push(promise); } });
      await Promise.all(pending);
    },
    async request(url, { mode = 'navigate', method = 'GET' } = {}) {
      const pending = [];
      let response;
      let intercepted = false;
      handlers.get('fetch')({
        request: { url, mode, method },
        respondWith(promise) { intercepted = true; response = promise; },
        waitUntil(promise) { pending.push(promise); }
      });
      response = await response;
      await Promise.all(pending);
      return { intercepted, response };
    }
  };
}

const tests = [];
const test = (label, run) => tests.push({ label, run });

test('fresh network HTML replaces cached HTML and revalidates HTTP', async () => {
  const h = harness({ seeded: { [currentName]: { [shell]: 'old UI' } }, network: async () => new Response('new UI') });
  const result = await h.request(`${scope}?v=latest#download`);
  assert.equal(await result.response.text(), 'new UI');
  assert.equal(h.fetched[0].options.cache, 'no-cache');
  assert.equal(await h.stores.get(currentName).get(shell).text(), 'new UI');
  assert.equal(h.timers.size, 0);
});

test('offline query navigation falls back to the canonical cached app shell', async () => {
  const h = harness({ seeded: { [currentName]: { [shell]: 'offline timetable' } } });
  assert.equal(await (await h.request(`${scope}?v=unknown#schedule`)).response.text(), 'offline timetable');
  assert.equal(h.timers.size, 0);
});

test('a stalled network aborts and returns the offline app shell', async () => {
  let aborted = false;
  const h = harness({
    seeded: { [currentName]: { [shell]: 'cached timetable' } }, expireTimer: true,
    network: (_request, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => { aborted = true; reject(new Error('Aborted')); }, { once: true });
    })
  });
  const result = await h.request(shell);
  assert.equal(aborted, true);
  assert.equal(await result.response.text(), 'cached timetable');
  assert.equal(h.timers.size, 0);
});

test('HTTP error responses use the last successful page without caching the error', async () => {
  const h = harness({ seeded: { [currentName]: { [shell]: 'working timetable' } }, network: async () => new Response('Bad gateway', { status: 502 }) });
  assert.equal(await (await h.request(scope)).response.text(), 'working timetable');
  assert.equal(await h.stores.get(currentName).get(shell).text(), 'working timetable');
});

test('without an offline shell, HTTP errors remain real and network failure gets 503', async () => {
  const http = harness({ network: async () => new Response('Missing', { status: 404 }) });
  assert.equal((await http.request(scope)).response.status, 404);
  const offline = harness();
  assert.equal((await offline.request(scope)).response.status, 503);
});

test('installation bypasses the HTTP cache for every precached request', async () => {
  const h = harness();
  await h.lifecycle('install');
  assert.ok(h.added.length > 5, 'a real offline app is precached');
  assert.ok(h.added.some(request => request.url === shell));
  assert.ok(h.added.every(request => request.cache === 'reload'));
  assert.ok(h.added.every(request => !request.url.endsWith('.apk')));
  assert.equal(h.state.skips, 1);
});

test('APK, checksum, cross-origin, non-GET, and PDF navigations are not intercepted', async () => {
  const h = harness();
  for (const [url, options] of [
    [`${scope}downloads/ku-bus.apk`, {}],
    [`${scope}downloads/ku-bus.apk.sha256`, { mode: 'cors' }],
    ['https://other.test/resource.js', { mode: 'cors' }],
    [scope, { method: 'POST' }],
    [`${scope}documents/schedule.pdf`, {}]
  ]) assert.equal((await h.request(url, options)).intercepted, false, url);
  assert.equal(h.fetched.length, 0);
});

test('static assets use only current-generation cache and cache a successful miss', async () => {
  const css = `${scope}airline.css?v=current`;
  const image = `${scope}assets/hero.png`;
  const h = harness({
    seeded: { [legacyName]: { [css]: 'obsolete CSS', [image]: 'obsolete image' }, [currentName]: { [css]: 'current CSS' } },
    network: async () => new Response('new image')
  });
  assert.equal(await (await h.request(css, { mode: 'cors' })).response.text(), 'current CSS');
  assert.equal(h.fetched.length, 0);
  assert.equal(await (await h.request(image, { mode: 'cors' })).response.text(), 'new image');
  assert.equal(h.fetched.length, 1);
  assert.equal(await h.stores.get(currentName).get(image).text(), 'new image');
});

test('clean install claims clients without forcing a reload', async () => {
  let navigations = 0;
  const h = harness({ seeded: { [currentName]: {} }, windows: [{ url: scope, navigate() { navigations += 1; return Promise.resolve(); } }] });
  await h.lifecycle('activate');
  assert.equal(h.state.claims, 1);
  assert.equal(navigations, 0);
  assert.equal(h.state.matchOptions, null);
});

test('v2 updates clean their old generation without triggering legacy migration', async () => {
  let navigations = 0;
  const h = harness({ seeded: { [currentName]: {}, [oldV2Name]: {} }, windows: [{ url: scope, navigate() { navigations += 1; return Promise.resolve(); } }] });
  await h.lifecycle('activate');
  assert.equal(navigations, 0);
  assert.deepEqual(h.deleted, [oldV2Name]);
});

test('legacy upgrade refreshes only app pages once, preserving query/hash and never blocking activation', async () => {
  const navigated = [];
  const urls = [scope + '?v=old#download', shell + '?preview=old#home', `${scope}documents/schedule.pdf`, 'https://example.test/other/', 'https://other.test/ku-bus/', 'https://example.test/ku-bus-extra/'];
  const h = harness({
    seeded: { [legacyName]: {}, [oldV2Name]: {}, [currentName]: {}, 'other-project-cache': { '/other/': 'untouched' } },
    windows: urls.map(url => ({ url, navigate(target) { navigated.push(target); return new Promise(() => {}); } }))
  });
  let timeout;
  try {
    await Promise.race([h.lifecycle('activate'), new Promise((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('Activation waited for unfinished navigation')), 250); })]);
  } finally { clearTimeout(timeout); }
  assert.deepEqual(navigated, urls.slice(0, 2));
  assert.ok(h.stores.has('other-project-cache'));
  assert.ok(h.stores.has(currentName));
  assert.ok(!h.stores.has(legacyName));
  assert.ok(!h.stores.has(oldV2Name));
  await h.lifecycle('activate');
  assert.equal(navigated.length, 2, 'legacy migration only runs once');
});

for (const { label, run } of tests) {
  await run();
  process.stdout.write(`PASS ${label}\n`);
}
process.stdout.write(`\n${tests.length} service-worker regression checks passed.\n`);
