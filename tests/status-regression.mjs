// Run with Node: node tests/status-regression.mjs
// Status is relative to today's UAE service, not the next occurrence of a row.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const dataEnd = source.indexOf('\nconst elements = {');
const helpersStart = source.indexOf('\nfunction getTrip() {');
const helpersEnd = source.indexOf('\nfunction resetCountdownDisplay() {');
const badgesStart = source.indexOf('\nfunction updateScheduleStatuses() {');
const badgesEnd = source.indexOf('\nfunction renderTrip()', badgesStart);
assert.ok(dataEnd > 0 && helpersEnd > helpersStart && badgesEnd > badgesStart);

let clock = Date.parse('2026-09-14T13:56:00+04:00');
class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : [clock])); }
  static now() { return clock; }
}

// Only the badge's DOM contract is mocked. Date/day classification and the
// update function both execute production code, including repeated updates.
const renderedRows = [];
const context = vm.createContext({
  Date: TestDate,
  Set,
  document: {
    querySelectorAll(selector) {
      assert.equal(selector, '.schedule-row');
      return renderedRows;
    }
  }
});
vm.runInContext([
  source.slice(0, dataEnd),
  source.slice(helpersStart, helpersEnd),
  source.slice(badgesStart, badgesEnd),
  'globalThis.api = { tripSchedules, getAllRows, getRouteStatus, getNextDeparture, updateScheduleStatuses };'
].join('\n'), context, { filename: 'script-status-under-test.js' });
const app = context.api;
const at = date => new Date(date);
let statusChecks = 0;
function expectStatus(time, tag, now, expected) {
  assert.equal(app.getRouteStatus(time, tag, at(now)), expected, `${time} ${tag} at ${now}`);
  statusChecks += 1;
}

// Regression from the reported SAN → MAIN screen on Monday at 13:56 UAE.
const sanMainRows = app.getAllRows(app.tripSchedules['san->main']);
for (const [time, tag, expected] of [
  ['11:35 AM', 'Mon-Thu', 'departed'],
  ['11:45 AM', 'Tue/Thu', 'not-today'],
  ['11:50 AM', 'Mon/Wed', 'departed'],
  ['12:45 PM', 'Mon-Thu', 'departed'],
  ['12:50 PM', 'Tue/Thu', 'not-today'],
  ['1:15 PM', 'Tue/Thu', 'not-today'],
  ['1:20 PM', 'Mon/Wed', 'departed'],
  ['2:00 PM', 'Mon-Thu', 'scheduled'],
  ['1:15 PM', 'Friday', 'not-today']
]) {
  assert.ok(sanMainRows.some(row => row[0] === time && row[3] === tag), `${time} ${tag} exists in SAN → MAIN`);
  expectStatus(time, tag, '2026-09-14T13:56:00+04:00', expected);
}

// Explicit calendar independent of production getDaysForTag, covering every
// supported day tag, Friday and both weekend days at the same clock time.
const days = {
  'Mon-Thu': [14, 15, 16, 17],
  'Mon/Wed': [14, 16],
  'Tue/Thu': [15, 17],
  Wednesday: [16],
  Friday: [18]
};
for (let date = 14; date <= 20; date += 1) {
  for (const [tag, activeDates] of Object.entries(days)) {
    const operating = activeDates.includes(date);
    for (const [time, activeStatus] of [
      ['11:59:59', 'scheduled'], ['12:00:00', 'scheduled'], ['12:00:01', 'departed']
    ]) {
      expectStatus('12:00 PM', tag, `2026-09-${date}T${time}+04:00`, operating ? activeStatus : 'not-today');
    }
  }
}

// UAE midnight occurs at 20:00 UTC, regardless of the host machine timezone.
expectStatus('8:00 AM', 'Mon-Thu', '2026-09-13T19:59:59Z', 'not-today');
expectStatus('8:00 AM', 'Mon-Thu', '2026-09-13T20:00:00Z', 'scheduled');
expectStatus('8:00 AM', 'Mon/Wed', '2026-09-14T19:59:59Z', 'departed');
expectStatus('8:00 AM', 'Mon/Wed', '2026-09-14T20:00:00Z', 'not-today');
expectStatus('8:00 AM', 'Tue/Thu', '2026-09-14T20:00:00Z', 'scheduled');
expectStatus('12:00 AM', 'Tue/Thu', '2026-09-14T20:00:00Z', 'scheduled');
expectStatus('12:00 AM', 'Tue/Thu', '2026-09-14T20:00:01Z', 'departed');

// An operating weekday before the Fall service start is still not today.
expectStatus('8:00 AM', 'Mon-Thu', '2026-08-31T09:00:00+04:00', 'not-today');
expectStatus('8:00 AM', 'Mon-Thu', '2026-09-07T00:00:00+04:00', 'scheduled');

// The next-departure clock and status agree at the exact scheduled instant.
const oneTrip = [['11:45 AM', 'SAN → MAIN', '', 'Tue/Thu']];
const exact = at('2026-09-15T11:45:00+04:00');
assert.equal(app.getNextDeparture(oneTrip, exact).countdownMs, 0);
expectStatus('11:45 AM', 'Tue/Thu', exact.toISOString(), 'scheduled');
const nextSecond = new Date(exact.getTime() + 1000);
assert.ok(app.getNextDeparture(oneTrip, nextSecond).countdownMs > 0);
expectStatus('11:45 AM', 'Tue/Thu', nextSecond.toISOString(), 'departed');

function makeBadgeRow(time, dayTag) {
  const classes = new Set(['status-pill', 'is-scheduled']);
  const attributes = new Map();
  const badge = {
    textContent: 'Scheduled',
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } },
    setAttribute(name, value) { attributes.set(name, value); }
  };
  const row = {
    dataset: { time, dayTag },
    querySelector(selector) { assert.equal(selector, '.status-pill'); return badge; }
  };
  return { row, badge, classes, attributes };
}
const rendered = makeBadgeRow('11:45 AM', 'Tue/Thu');
renderedRows.push(rendered.row, { dataset: { time: '8:00 AM', dayTag: 'Mon-Thu' }, querySelector: () => null });
for (const [now, state, label] of [
  ['2026-09-14T13:56:00+04:00', 'not-today', 'Not today'],
  ['2026-09-15T11:44:59+04:00', 'scheduled', 'Scheduled'],
  ['2026-09-15T11:45:00+04:00', 'scheduled', 'Scheduled'],
  ['2026-09-15T11:45:01+04:00', 'departed', 'Departed'],
  ['2026-09-16T13:56:00+04:00', 'not-today', 'Not today'],
  ['2026-09-17T10:00:00+04:00', 'scheduled', 'Scheduled'],
  ['2026-09-18T10:00:00+04:00', 'not-today', 'Not today']
]) {
  clock = Date.parse(now);
  app.updateScheduleStatuses();
  assert.equal(rendered.badge.textContent, label, `visible badge at ${now}`);
  assert.deepEqual([...rendered.classes].sort(), ['status-pill', `is-${state}`].sort(), `exactly one status class at ${now}`);
  const accessible = rendered.attributes.get('aria-label');
  assert.ok(accessible && accessible.trim().length > 0, 'each status has accessible text');
  if (state === 'not-today') assert.match(accessible, /not.*today|no.*today|does not/i);
  if (state === 'departed') assert.match(accessible, /departed|departure time has passed/i);
  if (state === 'scheduled') assert.match(accessible, /scheduled/i);
}

console.log(`PASS: ${statusChecks} status checks, the Monday SAN → MAIN regression, UAE midnight/service boundaries, and 7 live badge transitions.`);
