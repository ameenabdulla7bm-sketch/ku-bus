# Fifth-update timetable notes

Source: the supplied `5th Update_Daily Shuttle Service Bus Schedule_ Fall 2026.pdf`, seven pages. The original bytes are bundled at `documents/fall-2026-shuttle-schedule-fifth-update.pdf`. The fifth PDF has no printed effective date. The original Fall service start (7 September 2026) remains the lower bound for countdown calculations; the website says this revision was added on 13 September, without claiming that is its service-effective date.

## Changes from the fourth update

- Main to SAN at 16:25 now runs Monday through Thursday, replacing the earlier Monday/Wednesday restriction.
- Main to SAN at 17:45 now runs Monday through Thursday, replacing the earlier Wednesday-only restriction.
- SAN to Masdar adds a 16:20 departure Monday through Thursday.
- All other times and restrictions match the supplied fifth PDF. Masdar to SAN at 18:45 remains present.

## Route interpretation

- The six stops are Main, SAN, Masdar, Rawda, KURH, and Lulu. SAN services include Arzanah where the source names it.
- Unqualified residence departures apply to the residences in the table heading. Explicit residence names narrow that departure.
- KURH and Lulu have separate timetables. KURH alone has 07:00 to Main and 08:00 to SAN. The 08:00 to Main serves KURH and Lulu. Rawda has its separately listed 08:20 and 10:20 Main departures.
- SAN evening drop-offs follow the explicit Rawda, KURH, or Lulu destinations. KURH includes 19:10 and 20:45; Lulu includes 19:20 and 21:00. Shared times apply to both. No direct service between residences is inferred.
- Main to SAN at 12:40 remains Wednesday-only. Other Monday/Wednesday and Tuesday/Thursday labels follow the PDF exactly. Unqualified weekday rows run Monday through Thursday.
- Both Friday tables explicitly name the other campus. Main-to-SAN and SAN-to-Main use the union of applicable incoming/outgoing times, deduplicated. Residence Friday routes use their respective single table columns.

## Validation

All seven rendered PDF pages were visually checked. An independent transcription matches all 430 route/time/day entries across 18 direct routes: 302 weekday and 128 Friday entries. All 11 residence restriction notes match. Independent countdown checks covered 12,630 scenarios; the shipped regression suite covers 4,024 departure/countdown boundaries, 126 daily timetables and all 36 location pairs.

Run `node tests/schedule-regression.mjs` to compare production data with the independently transcribed fixture, including the three changed services, exact departure boundaries, weekday exceptions, Friday and weekend rollover, and separate KURH/Lulu rules.

Announcements summarize the fifth-update changes and link to the current PDF. Pickup points and transport-request guidance remain from the earlier supplied notice, explicitly labelled as an earlier notice. No new policy or effective date is inferred. The Helpdesk remains plain text because no target URL was supplied.
