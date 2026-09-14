# Sixth-update timetable notes

Source: the supplied `6th Update_Daily Shuttle Service Bus Schedule_ Fall 2026.pdf`, seven pages, bundled unchanged at `documents/fall-2026-shuttle-schedule-sixth-update.pdf`. Its accompanying announcement sets the effective date to Tuesday, 15 September 2026. The original Fall service start remains 7 September 2026 for unchanged services.

## Changes from the fifth update

- Main → SAN at 11:35 AM: Monday–Thursday, previously Monday/Wednesday.
- SAN → Main at 12:50 PM: Monday–Thursday, previously Tuesday/Thursday.
- The source page explicitly says Monday to Thursday. “Daily” in the notice does not add Friday, Saturday or Sunday services.
- All other departure times, restrictions and Friday services are unchanged.
- Each changed row retains its prior service days until 15 September 2026, 00:00 UAE time. Countdown candidates use the service days on the actual departure date; live badges and day labels update when the effective date passes.

## Route interpretation

- The six stops are Main, SAN, Masdar, Rawda, KURH, and Lulu. SAN services include Arzanah where the source names it.
- Unqualified residence departures apply to the residences in the table heading. Explicit residence names narrow that departure.
- KURH and Lulu have separate timetables. KURH alone has 07:00 to Main and 08:00 to SAN. The 08:00 to Main serves KURH and Lulu. Rawda has its separately listed 08:20 and 10:20 Main departures.
- SAN evening drop-offs follow the explicit Rawda, KURH, or Lulu destinations. KURH includes 19:10 and 20:45; Lulu includes 19:20 and 21:00. Shared times apply to both. No direct service between residences is inferred.
- Main to SAN at 12:40 remains Wednesday-only. Remaining Monday/Wednesday and Tuesday/Thursday labels follow the PDF exactly. Unqualified weekday rows run Monday through Thursday.
- Both Friday tables explicitly name the other campus. Main-to-SAN and SAN-to-Main use the union of applicable incoming/outgoing times, deduplicated. Residence Friday routes use their respective single table columns.

## Validation

The seven-page comparison found only the two operating-day changes on page 3. The complete timetable still contains 430 route/time/day rows across 18 routes (302 weekday and 128 Friday) and 11 residence restriction notes. The independent fifth fixture is retained to check dates before the sixth update.

Run `node tests/schedule-regression.mjs` and `node tests/status-regression.mjs` for full timetable, countdown, operating-day and live badge regressions. Cache checks are in `tests/sw-regression.mjs` and `tests/registration-regression.mjs`.

The announcement includes both changed services and the user-supplied Student Transportation Service Helpdesk URL. Pickup points and academic-class request guidance remain from the earlier supplied notice. Older PDFs are retained as historical files but active links and offline precaching use the sixth update.
