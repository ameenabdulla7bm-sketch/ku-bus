# KU Shuttle

A responsive Khalifa University shuttle app inspired by the supplied airline-app reference, using the supplied fourth-update Fall 2026 timetable, effective 7 September 2026.

## Run

Open `index.html`, or serve this directory for installation and offline support:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Visit <http://127.0.0.1:4173>. There is no build step or package installation. Deploy this directory to a static HTTPS host for installable-app support.

## Screens

- **Home:** The supplied KU bus logo and UAE clock, followed by the selected route above a white boarding pass. A vertical perforation separates the departure time from a plain day/hour/minute timer. The cropped KU bus sits below the pass, followed by six From and To buttons and a swap control.
- **Schedule:** The selected route's timetable, with Mon–Thu and Friday filters and special pickup notes preserved. Choose Change route to return to Home.
- **Announcements:** The supplied Fall 2026 notice, its effective date, all seven pickup/drop-off points, the academic-class request policy, a link to the fourth-update PDF, and an expandable original notice image. The Helpdesk name is plain text because no target URL was supplied.

The floating dark navigation pill keeps all three labels—Home, Schedule, and Announcements—with a bright destination-coloured sliding highlight. It stays in the page flow on Home to reserve space below the ticket, and remains fixed with content clearance on the other screens. Navigation preserves the route and timetable filter. Hash links support direct navigation and browser history: `#home`, `#schedule`, and `#announcements`. The older `#trip-panel` shortcut still opens Schedule.

## Design and behaviour

The app uses a deep campus-tinted background with white boarding passes and detail cards. Main’s default background is `#241018`. On phones, the departure pass sits above the bus, with the From/To controls below. A flexible spacer around the bus takes the remaining space while Home fills the visible screen. The countdown's day caption and Days/Hrs/Mins labels remain visible on short phones, along with residence restriction notes. The Departure label hides when a restriction needs the space. Desktop places the departure pass and bus on the left, with From/To controls on the right. Bright campus colours distinguish the route controls: Main red, SAN blue, Masdar green, Rawda yellow, KURH pink, and Lulu purple. Selected controls use dark text on their bright fill. The header logo, KU BUS wordmark and route heading follow the destination accent. View schedule opens the selected route’s timetable.

Eighteen direct routes are included, with 429 timetable rows. Wednesday-only departures and residence-specific trips follow the fourth update. Unavailable destinations are disabled, and the selected destination is normalized when changing pickup location. The next bus always follows the actual upcoming timetable departure; timetable filtering does not change the live countdown. KURH and Umm Lulu have separate buttons and timetables; residence-specific departures appear only for the relevant location. Generic schedule details give way to the residence restriction beside the next departure. The route title, departure time and day/hour/minute countdown update with the selected route.

The dark background tint and faint campus illustration follow the pickup location, independently of destination accents. All six locations—Main, SAN, Masdar, Rawda, KURH, and Umm Lulu—use their user-supplied building illustrations, blended as pale architectural detail behind the bus. Tint and illustrations crossfade; campus buttons transition smoothly, the swap icon rotates on valid swaps, and the bus slides in once per page load. Reduced motion skips the bus and swap animations and removes CSS transitions.

The interface uses self-hosted Etihad Altis: Book for normal text and lighter headings, and Bold for time values and selected controls. `font-synthesis: none` prevents simulated weights and styles, and tabular numerals keep time values aligned. Both WOFF files are cached for offline use. Font sources and copyright details are preserved in `assets/fonts/Etihad-Altis-notice.txt`.

The supplied KU bus logo is preserved unchanged in `assets/ku-bus-logo.png`. The header and Home navigation icon use an inline SVG alpha mask to remove its white background and tint the original shape with `currentColor`. The supplied KU BUS wordmark is preserved in `assets/ku-bus-wordmark.png` and uses the same SVG masking approach beside the header logo, inheriting its destination colour. The original 1254×1254 bus-logo PNG also serves as the favicon, Apple touch icon and installable-app icon.

The existing large bus cutout remains below the boarding pass, cropped in CSS to show its front half, with the rear continuing off the right edge. The artwork is sized from the viewport inside a flexible spacer, so changes to route text or restriction notes cannot zoom it. The original proportions and lettering are preserved; see `bus-image-notes.md` for its creation details.

`fonts.css` loads Etihad Altis. `mobile.css` provides the responsive layout, with `airline.css` adding the dark campus theme, typography and white ticket treatment. `script.js` contains timetable and route logic, and `navigation.js` controls the three views. The older `styles.css` is retained as a reference file and is not loaded by the app.

The dark boarding-pass layout was checked at 320×568, 375×667, 390×844, 1024×600 and 1440×900. Text colours were checked for contrast across all six campus themes. The fourth update was independently checked against all seven PDF pages. The six-stop matrix contains 429 rows, with KURH and Lulu restrictions applied separately. Focused UI/data checks and 12,600 next-departure scenarios covered the effective date, weekday restrictions, Friday unions, and weekend rollover. PDF and original-notice links were verified; the PDF copy is byte-for-byte identical to the supplied file. Six-button rows fit at 320px wide, with targets at least 44px wide and 48px high; navigation targets are at least 52px high. Dynamic viewport units and safe-area insets accommodate mobile browser chrome. Very short landscape windows and enlarged text can scroll instead of clipping controls. Reduced-motion, reduced-transparency, and forced-colour preferences are supported.

The timetable is the supplied Fall 2026 fourth update, not a live transport feed. The source PDF is in `documents/fall-2026-shuttle-schedule-fourth-update.pdf`; interpretation notes are in `schedule-notes.md`. Both the PDF and original notice image are cached for offline use. Offline caching is limited to this app's own caches.
