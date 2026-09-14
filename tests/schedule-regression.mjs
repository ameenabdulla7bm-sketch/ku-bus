// Run with Node: node tests/schedule-regression.mjs
// Expected times were independently transcribed and visually checked against
// all seven pages of the fifth-update PDF, not generated from script.js.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const fixture = JSON.parse(await readFile(new URL('./expected-fifth-schedule.json', import.meta.url), 'utf8'));
const dataEnd = source.indexOf('\nconst elements = {');
const helpersStart = source.indexOf('\nfunction getTrip() {');
const helpersEnd = source.indexOf('\nfunction resetCountdownDisplay() {');
const noteStart = source.indexOf('\nfunction getDepartureNote(');
const noteEnd = source.indexOf('\nfunction renderButtons()', noteStart);
assert.ok(dataEnd > 0 && helpersStart > dataEnd && helpersEnd > helpersStart && noteEnd > noteStart);

// Execute production data and pure schedule functions without a fake UI, so
// tests remain independent of the number or appearance of campus buttons.
const context = vm.createContext({ Date, Set });
vm.runInContext([
  source.slice(0, dataEnd),
  source.slice(helpersStart, helpersEnd),
  source.slice(noteStart, noteEnd),
  'globalThis.api = { locations, tripSchedules, getAllRows, getNextDeparture, getDaysForTag, getDepartureNote, getRouteStatus, isUnavailableRoute, getCountdownParts };'
].join('\n'), context, { filename: 'script-schedule-data.js' });
const app = context.api;

const DAY_TAGS = {
  'Mon-Thu': [1, 2, 3, 4],
  'Mon/Wed': [1, 3],
  'Tue/Thu': [2, 4],
  Wednesday: [3],
  Friday: [5]
};
const CAMPUS_IDS = ['main', 'san', 'masdar', 'rawda', 'kurh', 'lulu'];
const plain = value => JSON.parse(JSON.stringify(value));
function twentyFourHour(time) {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(time);
  assert.ok(match, `valid departure time: ${time}`);
  const hour = Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}
function rowsFor(route) { return app.getAllRows(app.tripSchedules[route] || []); }

assert.deepEqual(Object.keys(app.locations), CAMPUS_IDS);
assert.equal(Object.keys(fixture.routes).length, 18);
assert.deepEqual(Object.keys(app.tripSchedules).sort(), Object.keys(fixture.routes).sort());
for (const [tag, days] of Object.entries(DAY_TAGS)) {
  assert.deepEqual(plain(app.getDaysForTag(tag)), days, `${tag} operating days`);
}

let checkedRows = 0;
let checkedRestrictions = 0;
let dailyMatrices = 0;
for (const [route, services] of Object.entries(fixture.routes)) {
  const actualRows = rowsFor(route);
  for (const [service, expectedRows] of Object.entries(services)) {
    const actual = actualRows.filter(row => (row[3] === 'Friday') === (service === 'friday'));
    assert.deepEqual(plain(actual.map(row => ({ time: twentyFourHour(row[0]), day: row[3] }))), expectedRows.map(({ time, day }) => ({ time, day })), `${route}: complete ${service} timetable`);
    actual.forEach((row, index) => {
      const expectedRestriction = expectedRows[index].restriction;
      const note = app.getDepartureNote(row);
      if (expectedRestriction) {
        assert.ok(note.startsWith(expectedRestriction), `${route} ${row[0]} retains restriction: ${expectedRestriction}`);
        checkedRestrictions += 1;
      } else {
        assert.equal(note, '', `${route} ${row[0]} has no invented restriction`);
      }
    });
    checkedRows += actual.length;
  }
  const expectedRows = Object.values(services).flat();
  for (let day = 0; day <= 6; day += 1) {
    const actualDay = plain(actualRows.filter(row => app.getDaysForTag(row[3]).includes(day)).map(row => twentyFourHour(row[0])).sort());
    const expectedDay = expectedRows.filter(row => DAY_TAGS[row.day].includes(day)).map(row => row.time).sort();
    assert.deepEqual(actualDay, expectedDay, `${route}: actual departures on weekday ${day}`);
    dailyMatrices += 1;
  }
}
assert.equal(checkedRows, 430, 'fifth-update total across all 18 routes');
assert.equal(checkedRestrictions, 11, 'all source restrictions remain represented');

for (const from of CAMPUS_IDS) {
  for (const to of CAMPUS_IDS) {
    assert.equal(app.isUnavailableRoute(from, to), !Object.hasOwn(fixture.routes, `${from}->${to}`), `${from}→${to} availability`);
  }
}

// Build an independent calendar of actual instants from the audited PDF rows.
// The production algorithm searches row-by-row; this oracle instead expands
// two explicit weeks, sorts appointments, and chooses the first remaining one.
function expectedCalendar(route) {
  const result = [];
  const expectedRows = Object.values(fixture.routes[route]).flat();
  for (let date = 14; date <= 28; date += 1) {
    const dateText = `2026-09-${String(date).padStart(2, '0')}`;
    const day = new Date(`${dateText}T12:00:00+04:00`).getUTCDay();
    for (const row of expectedRows) {
      if (DAY_TAGS[row.day].includes(day)) {
        result.push({ ...row, instant: Date.parse(`${dateText}T${row.time}:00+04:00`), date: dateText });
      }
    }
  }
  return result.sort((a, b) => a.instant - b.instant);
}
const calendars = Object.fromEntries(Object.keys(fixture.routes).map(route => [route, expectedCalendar(route)]));
let boundaryChecks = 0;
function assertNext(route, now, explicitExpected) {
  const instant = typeof now === 'number' ? now : Date.parse(`${now}+04:00`);
  const expected = calendars[route].find(departure => departure.instant >= instant);
  assert.ok(expected, `${route}: expected fixture covers ${new Date(instant).toISOString()}`);
  const result = app.getNextDeparture(rowsFor(route), new Date(instant));
  assert.ok(result, `${route}: next departure exists`);
  assert.equal(result.departureMs - 4 * 60 * 60 * 1000, expected.instant, `${route} at ${new Date(instant).toISOString()}: next departure`);
  assert.equal(result.countdownMs, expected.instant - instant, `${route}: countdown duration`);
  assert.equal(twentyFourHour(result.row[0]), expected.time);
  assert.equal(result.row[3], expected.day);
  const note = app.getDepartureNote(result.row);
  if (expected.restriction) assert.ok(note.startsWith(expected.restriction));
  else assert.equal(note, '');
  if (explicitExpected) assert.equal(expected.instant, Date.parse(`${explicitExpected}+04:00`), `${route}: explicit audited boundary`);
  boundaryChecks += 1;
}

for (const route of Object.keys(fixture.routes)) {
  for (const departure of calendars[route].filter(item => item.date < '2026-09-21')) {
    for (const delta of [-1000, 0, 1000]) assertNext(route, departure.instant + delta);
  }
  assertNext(route, '2026-09-19T12:00:00');
  assertNext(route, '2026-09-20T23:59:59');
}

// Explicit fifth-update additions and changed operating days.
for (const date of ['14', '15', '16', '17']) {
  assertNext('main->san', `2026-09-${date}T16:24:59`, `2026-09-${date}T16:25:00`);
  assertNext('main->san', `2026-09-${date}T16:25:00`, `2026-09-${date}T16:25:00`);
  assertNext('main->san', `2026-09-${date}T16:25:01`, `2026-09-${date}T17:00:00`);
  assertNext('main->san', `2026-09-${date}T17:44:59`, `2026-09-${date}T17:45:00`);
  assertNext('main->san', `2026-09-${date}T17:45:00`, `2026-09-${date}T17:45:00`);
  assertNext('main->san', `2026-09-${date}T17:45:01`, `2026-09-${date}T${['15', '17'].includes(date) ? '17:55' : '18:30'}:00`);
  assertNext('san->masdar', `2026-09-${date}T16:19:59`, `2026-09-${date}T16:20:00`);
  assertNext('san->masdar', `2026-09-${date}T16:20:00`, `2026-09-${date}T16:20:00`);
  assertNext('san->masdar', `2026-09-${date}T16:20:01`, `2026-09-${date}T16:40:00`);
}

for (const [route, now, expected] of [
  ['main->san', '2026-09-14T10:21:00', '2026-09-14T10:30:00'],
  ['main->san', '2026-09-15T10:21:00', '2026-09-15T11:00:00'],
  ['main->san', '2026-09-16T12:31:00', '2026-09-16T12:40:00'],
  ['main->san', '2026-09-17T12:31:00', '2026-09-17T12:50:00'],
  ['main->san', '2026-09-15T13:01:00', '2026-09-15T13:15:00'],
  ['main->san', '2026-09-14T13:01:00', '2026-09-14T13:20:00'],
  ['main->san', '2026-09-18T16:20:00', '2026-09-18T16:30:00'],
  ['san->masdar', '2026-09-18T16:00:00', '2026-09-18T16:40:00'],
  ['kurh->main', '2026-09-14T06:00:00', '2026-09-14T07:00:00'],
  ['lulu->main', '2026-09-14T06:00:00', '2026-09-14T08:00:00'],
  ['kurh->san', '2026-09-14T07:00:00', '2026-09-14T08:00:00'],
  ['lulu->san', '2026-09-14T07:00:00', '2026-09-14T08:20:00'],
  ['san->kurh', '2026-09-14T18:56:00', '2026-09-14T19:10:00'],
  ['san->lulu', '2026-09-14T18:56:00', '2026-09-14T19:20:00'],
  ['san->kurh', '2026-09-14T20:21:00', '2026-09-14T20:45:00'],
  ['san->lulu', '2026-09-14T20:21:00', '2026-09-14T21:00:00'],
  ['san->rawda', '2026-09-14T19:11:00', '2026-09-14T19:40:00'],
  ['kurh->main', '2026-09-19T12:00:00', '2026-09-21T07:00:00'],
  ['lulu->main', '2026-09-19T12:00:00', '2026-09-21T08:00:00']
]) assertNext(route, now, expected);

assert.equal(app.getNextDeparture([], new Date('2026-09-14T06:00:00+04:00')), null);
assert.equal(app.getRouteStatus('4:25 PM', 'Mon-Thu', new Date('2026-09-15T16:25:01+04:00')), 'departed');
assert.equal(app.getRouteStatus('12:40 PM', 'Wednesday', new Date('2026-09-17T12:41:00+04:00')), 'not-today');
assert.deepEqual(plain(app.getCountdownParts(25 * 60 * 60 * 1000 + 2 * 60 * 1000)), { days: 1, hours: 1, minutes: 2, seconds: 0 });

console.log(`PASS: ${checkedRows} independently audited rows across 18 routes, ${checkedRestrictions} restrictions, ${dailyMatrices} daily timetables, and ${boundaryChecks} next-departure/countdown boundary checks.`);
