import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const start = source.indexOf('function registerServiceWorker() {');
const end = source.indexOf('\nfunction playBusIntro()', start);
assert.ok(start >= 0 && end > start, 'registration function exists');
const registrationSource = source.slice(start, end);
const flush = () => new Promise(resolve => setImmediate(resolve));

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn, options) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ fn, once: options?.once });
    },
    emit(type) {
      for (const entry of [...(listeners.get(type) || [])]) {
        entry.fn({ type });
        if (entry.once) listeners.set(type, listeners.get(type).filter(item => item !== entry));
      }
    },
    listeners
  };
}

async function harness({ controlled = false, visibility = 'visible', readyState = 'complete', protocol = 'https:', hostname = 'example.test', supported = true, registrationFails = false, updateFails = false } = {}) {
  let now = 1_000_000;
  const state = { reloads: 0, registrations: [], updates: 0, intervals: [] };
  const document = { ...eventTarget(), readyState, visibilityState: visibility };
  const window = {
    ...eventTarget(),
    location: { protocol, hostname, reload() { state.reloads += 1; } },
    setInterval(fn, delay) { state.intervals.push({ fn, delay }); }
  };
  const serviceWorker = {
    ...eventTarget(),
    controller: controlled ? {} : null,
    async register(url, options) {
      state.registrations.push({ url, options });
      if (registrationFails) throw new Error('Service workers blocked');
      return { async update() { state.updates += 1; if (updateFails) throw new Error('Offline update'); } };
    }
  };
  const context = vm.createContext({
    document, window,
    navigator: supported ? { serviceWorker } : {},
    Date: class extends Date { static now() { return now; } }
  });
  vm.runInContext(`${registrationSource}\nregisterServiceWorker();`, context, { filename: 'script-registration.js' });
  await flush();
  return { state, document, window, serviceWorker, advance(ms) { now += ms; } };
}

const tests = [];
const test = (label, run) => tests.push({ label, run });

test('fresh installs ignore their initial claim but reload once on a later update', async () => {
  const h = await harness();
  h.serviceWorker.emit('controllerchange');
  assert.equal(h.state.reloads, 0);
  h.serviceWorker.emit('controllerchange');
  assert.equal(h.state.reloads, 1);
  h.serviceWorker.emit('controllerchange');
  assert.equal(h.state.reloads, 1);
});

test('already-controlled pages reload exactly once when their worker changes', async () => {
  const h = await harness({ controlled: true });
  h.serviceWorker.emit('controllerchange');
  h.serviceWorker.emit('controllerchange');
  assert.equal(h.state.reloads, 1);
});

test('registration bypasses the worker HTTP cache and checks updates without waiting to render', async () => {
  const h = await harness();
  assert.equal(h.state.registrations.length, 1);
  assert.equal(h.state.registrations[0].url, './service-worker.js');
  assert.equal(h.state.registrations[0].options.updateViaCache, 'none');
  assert.equal(h.state.updates, 1);
  assert.equal(h.state.intervals.length, 1);
  assert.equal(h.state.intervals[0].delay, 5 * 60 * 1000);
});

test('hidden pages skip resume/online/timer requests and visible checks are throttled', async () => {
  const h = await harness({ visibility: 'hidden' });
  assert.equal(h.state.updates, 0);
  h.advance(120_000);
  h.window.emit('online');
  h.document.emit('visibilitychange');
  h.state.intervals[0].fn();
  assert.equal(h.state.updates, 0);
  h.document.visibilityState = 'visible';
  h.document.emit('visibilitychange');
  assert.equal(h.state.updates, 1);
  h.window.emit('online');
  h.state.intervals[0].fn();
  assert.equal(h.state.updates, 1);
  h.advance(60_000);
  h.window.emit('online');
  assert.equal(h.state.updates, 2);
  await flush();
});

test('registration waits for load when the document is still loading', async () => {
  const h = await harness({ readyState: 'loading' });
  assert.equal(h.state.registrations.length, 0);
  h.document.readyState = 'complete';
  h.window.emit('load');
  await flush();
  assert.equal(h.state.registrations.length, 1);
  h.window.emit('load');
  await flush();
  assert.equal(h.state.registrations.length, 1);
});

test('native Android offline assets, file URLs, and unsupported browsers skip registration', async () => {
  for (const options of [{ hostname: 'appassets.androidplatform.net' }, { protocol: 'file:' }, { supported: false }]) {
    const h = await harness(options);
    assert.equal(h.state.registrations.length, 0);
    assert.equal(h.state.updates, 0);
    assert.equal(h.state.intervals.length, 0);
    assert.equal(h.serviceWorker.listeners.size, 0);
  }
});

test('blocked registration and offline update failures remain nonfatal', async () => {
  const blocked = await harness({ registrationFails: true });
  assert.equal(blocked.state.registrations.length, 1);
  assert.equal(blocked.state.updates, 0);
  const offline = await harness({ updateFails: true });
  assert.equal(offline.state.updates, 1);
  offline.advance(60_000);
  offline.window.emit('online');
  await flush();
  assert.equal(offline.state.updates, 2);
});

for (const { label, run } of tests) {
  await run();
  process.stdout.write(`PASS ${label}\n`);
}
process.stdout.write(`\n${tests.length} page-registration regression checks passed.\n`);
