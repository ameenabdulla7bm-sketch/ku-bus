const locations = {
  main: { label: "MAIN Campus", place: "Main Campus" },
  san: { label: "SAN Campus", place: "SAN Campus" },
  masdar: { label: "Masdar Hostel", place: "Masdar Residence" },
  rawda: { label: "Al Rawda Hostel", place: "Al Rawda Residence" },
  kurh: { label: "KURH (ADNOC Schools)", place: "KURH (ADNOC Schools)" },
  lulu: { label: "Umm Lulu Dorm", place: "Umm Lulu Dorm" }
};

const locationIds = Object.keys(locations);
const boysHostels = new Set(["rawda"]);
const girlsHostels = new Set(["kurh", "lulu"]);
const row = (time, name, detail, tag = "Mon-Thu") => [time, name, detail, tag];
const rows = (times, name, detail, tag = "Mon-Thu") => times.map((time) => row(time, name, detail, tag));
const group = (title, scheduleRows) => ({ title, rows: scheduleRows });
const key = (pickup, destination) => `${pickup}->${destination}`;
const uaeOffsetMs = 4 * 60 * 60 * 1000;
const scheduleEffectiveUaeMs = Date.UTC(2026, 8, 7);
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const scheduleDays = {
  "Mon-Thu": [1, 2, 3, 4],
  "Friday": [5],
  "Mon/Wed": [1, 3],
  "Tue/Thu": [2, 4],
  "Wednesday": [3]
};

const studentResidenceToMainTimes = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "2:00 PM",
  "3:30 PM",
  "4:00 PM",
  "5:00 PM"
];

const mainToStudentResidenceTimes = [
  "10:35 AM",
  "11:00 AM",
  "11:40 AM",
  "12:00 PM",
  "1:00 PM",
  "1:35 PM",
  "2:10 PM",
  "3:00 PM",
  "3:30 PM",
  "4:05 PM",
  "4:35 PM",
  "5:05 PM",
  "5:50 PM",
  "6:05 PM",
  "7:10 PM",
  "7:35 PM",
  "8:00 PM",
  "8:45 PM"
];

function residenceToMainRows(originId, origin) {
  const sharedRows = rows(studentResidenceToMainTimes, `${origin} -> Main Campus`, "Student residence service");

  if (originId === "kurh" || originId === "lulu") {
    return [
      ...(originId === "kurh" ? [row("7:00 AM", "KURH (ADNOC Schools) -> Main Campus", "KURH only pickup")] : []),
      row("8:00 AM", `${origin} -> Main Campus`, "KURH and Umm Lulu pickup"),
      ...sharedRows
    ];
  }

  return [
    row("8:20 AM", `${origin} -> Main Campus`, "Al Rawda only pickup"),
    ...sharedRows.filter(([time]) => parseDepartureTime(time).hours < 11),
    row("10:20 AM", `${origin} -> Main Campus`, "Al Rawda only pickup"),
    ...sharedRows.filter(([time]) => parseDepartureTime(time).hours >= 11)
  ];
}

function mainToResidenceRows(destination) {
  return rows(mainToStudentResidenceTimes, `Main Campus -> ${destination}`, "Student residence service");
}

const studentResidenceToSanTimes = [
  "8:20 AM",
  "9:20 AM",
  "9:50 AM",
  "10:20 AM",
  "10:50 AM",
  "11:20 AM",
  "12:20 PM",
  "12:50 PM",
  "1:20 PM",
  "2:20 PM",
  "3:20 PM",
  "3:50 PM",
  "4:20 PM",
  "5:20 PM"
];

const sanToStudentResidenceTimes = [
  "10:05 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:40 PM",
  "3:00 PM",
  "3:30 PM",
  "4:10 PM",
  "4:30 PM",
  "5:00 PM",
  "5:45 PM",
  "6:00 PM",
  "6:55 PM",
  "8:20 PM"
];

function residenceToSanRows(originId, originPlace) {
  const routeName = `${originPlace} -> SAN Campus/Arzanah`;
  const sharedRows = rows(studentResidenceToSanTimes, routeName, "Student residence service");

  if (originId === "kurh") {
    return [row("8:00 AM", "KURH (ADNOC Schools) -> SAN Campus/Arzanah", "KURH only pickup"), ...sharedRows];
  }

  return sharedRows;
}

function sanToResidenceRows(destinationId, destination) {
  const sharedRows = rows(sanToStudentResidenceTimes, `SAN Campus/Arzanah -> ${destination}`, "Student residence service");
  const restrictedRowsByResidence = {
    kurh: [
      row("7:10 PM", "SAN Campus/Arzanah -> KURH (ADNOC Schools)", "KURH only drop-off; no Umm Lulu"),
      row("8:45 PM", "SAN Campus/Arzanah -> KURH (ADNOC Schools)", "KURH only drop-off; no Umm Lulu")
    ],
    lulu: [
      row("7:20 PM", "SAN Campus/Arzanah -> Umm Lulu Dorm", "Umm Lulu only drop-off; no KURH"),
      row("9:00 PM", "SAN Campus/Arzanah -> Umm Lulu Dorm", "Umm Lulu only drop-off; no KURH")
    ],
    rawda: [
      row("7:10 PM", `SAN Campus/Arzanah -> ${destination}`, "Al Rawda and KURH only drop-off"),
      row("7:40 PM", `SAN Campus/Arzanah -> ${destination}`, "Al Rawda only drop-off"),
      row("8:45 PM", `SAN Campus/Arzanah -> ${destination}`, "Al Rawda and KURH only drop-off")
    ]
  };
  const restrictedRows = restrictedRowsByResidence[destinationId] || [];

  return [...sharedRows, ...restrictedRows].sort((a, b) => {
    const aTime = parseDepartureTime(a[0]);
    const bTime = parseDepartureTime(b[0]);
    return (aTime.hours * 60 + aTime.minutes) - (bTime.hours * 60 + bTime.minutes);
  });
}

const mainToSanRouteName = "Main Campus -> SAN Campus/Arzanah";
const sanToMainRouteName = "SAN Campus/Arzanah -> Main Campus";

const mainToSanRows = [
  row("8:00 AM", mainToSanRouteName, "Direct service"),
  row("8:30 AM", mainToSanRouteName, "Direct service"),
  row("9:00 AM", mainToSanRouteName, "Direct service"),
  row("9:30 AM", mainToSanRouteName, "Direct service"),
  row("10:00 AM", mainToSanRouteName, "Direct service"),
  row("10:20 AM", mainToSanRouteName, "Direct service"),
  row("10:30 AM", mainToSanRouteName, "Direct service", "Mon/Wed"),
  row("11:00 AM", mainToSanRouteName, "Direct service"),
  row("11:35 AM", mainToSanRouteName, "Direct service", "Mon/Wed"),
  row("11:50 AM", mainToSanRouteName, "Direct service", "Mon/Wed"),
  row("12:00 PM", mainToSanRouteName, "Direct service"),
  row("12:30 PM", mainToSanRouteName, "Direct service"),
  row("12:40 PM", mainToSanRouteName, "Direct service", "Wednesday"),
  row("12:50 PM", mainToSanRouteName, "Direct service"),
  row("1:00 PM", mainToSanRouteName, "Direct service"),
  row("1:15 PM", mainToSanRouteName, "Direct service", "Tue/Thu"),
  row("1:20 PM", mainToSanRouteName, "Direct service", "Mon/Wed"),
  row("1:35 PM", mainToSanRouteName, "Direct service"),
  row("2:00 PM", mainToSanRouteName, "Direct service"),
  row("2:35 PM", mainToSanRouteName, "Direct service"),
  row("2:45 PM", mainToSanRouteName, "Direct service"),
  row("2:55 PM", mainToSanRouteName, "Direct service"),
  row("3:30 PM", mainToSanRouteName, "Direct service"),
  row("4:25 PM", mainToSanRouteName, "Direct service", "Mon/Wed"),
  row("5:00 PM", mainToSanRouteName, "Direct service"),
  row("5:45 PM", mainToSanRouteName, "Direct service", "Wednesday"),
  row("5:55 PM", mainToSanRouteName, "Direct service", "Tue/Thu"),
  row("6:30 PM", mainToSanRouteName, "Direct service"),
  row("7:15 PM", mainToSanRouteName, "Direct service"),
  row("8:20 PM", mainToSanRouteName, "Direct service")
];

const sanToMainRows = [
  row("8:00 AM", sanToMainRouteName, "Direct service"),
  row("9:00 AM", sanToMainRouteName, "Direct service"),
  row("9:30 AM", sanToMainRouteName, "Direct service"),
  row("10:00 AM", sanToMainRouteName, "Direct service"),
  row("10:20 AM", sanToMainRouteName, "Direct service"),
  row("10:40 AM", sanToMainRouteName, "Direct service"),
  row("11:00 AM", sanToMainRouteName, "Direct service"),
  row("11:35 AM", sanToMainRouteName, "Direct service"),
  row("11:45 AM", sanToMainRouteName, "Direct service", "Tue/Thu"),
  row("11:50 AM", sanToMainRouteName, "Direct service", "Mon/Wed"),
  row("12:00 PM", sanToMainRouteName, "Direct service"),
  row("12:30 PM", sanToMainRouteName, "Direct service"),
  row("12:45 PM", sanToMainRouteName, "Direct service"),
  row("12:50 PM", sanToMainRouteName, "Direct service", "Tue/Thu"),
  row("1:00 PM", sanToMainRouteName, "Direct service"),
  row("1:15 PM", sanToMainRouteName, "Direct service", "Tue/Thu"),
  row("1:20 PM", sanToMainRouteName, "Direct service", "Mon/Wed"),
  row("2:00 PM", sanToMainRouteName, "Direct service"),
  row("2:35 PM", sanToMainRouteName, "Direct service"),
  row("2:45 PM", sanToMainRouteName, "Direct service"),
  row("3:00 PM", sanToMainRouteName, "Direct service"),
  row("3:30 PM", sanToMainRouteName, "Direct service"),
  row("4:20 PM", sanToMainRouteName, "Direct service"),
  row("5:00 PM", sanToMainRouteName, "Direct service"),
  row("5:45 PM", sanToMainRouteName, "Direct service"),
  row("6:00 PM", sanToMainRouteName, "Direct service"),
  row("6:30 PM", sanToMainRouteName, "Direct service"),
  row("7:00 PM", sanToMainRouteName, "Direct service"),
  row("8:20 PM", sanToMainRouteName, "Direct service"),
  row("9:00 PM", sanToMainRouteName, "Direct service")
];

const masdarToMainRows = rows(
  ["7:45 AM", "8:30 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:15 PM", "2:00 PM", "3:30 PM", "4:00 PM", "5:00 PM", "6:30 PM"],
  "Masdar Residence -> Main Campus",
  "Masdar Residences / Main Campus"
);

const mainToMasdarRows = rows(
  ["10:35 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "3:05 PM", "3:50 PM", "4:35 PM", "5:30 PM", "6:05 PM", "7:25 PM", "7:50 PM", "8:40 PM"],
  "Main Campus -> Masdar Residence",
  "Masdar Residences / Main Campus"
);

const masdarToSanRows = rows(
  ["7:00 AM", "8:00 AM", "9:30 AM", "11:00 AM", "12:30 PM", "2:00 PM", "3:30 PM", "4:15 PM", "5:00 PM", "6:45 PM"],
  "Masdar Residence -> SAN Campus",
  "Masdar Residences / SAN Campus"
);

const sanToMasdarRows = [
  ...rows(["11:00 AM", "12:25 PM", "1:30 PM", "3:00 PM", "4:40 PM", "6:10 PM", "6:40 PM", "7:35 PM", "8:20 PM", "9:00 PM"], "SAN Campus -> Masdar Residence", "Masdar Residences / SAN Campus")
];

const fridayToMainTimes = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:15 PM", "2:00 PM"];
const fridayFromMainTimes = ["11:30 AM", "1:15 PM", "2:30 PM", "4:30 PM", "5:30 PM", "6:30 PM", "8:20 PM"];
const fridayToSanTimes = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:15 PM", "2:00 PM"];
const fridayFromSanTimes = ["11:30 AM", "1:15 PM", "2:30 PM", "4:40 PM", "5:30 PM", "6:30 PM", "8:20 PM"];
const fridayMainToSanTimes = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "11:30 AM", "1:15 PM", "2:00 PM", "2:30 PM", "4:30 PM", "5:30 PM", "6:30 PM", "8:20 PM"];
const fridaySanToMainTimes = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "11:30 AM", "1:15 PM", "2:00 PM", "2:30 PM", "4:40 PM", "5:30 PM", "6:30 PM", "8:20 PM"];

function fridayRouteRows(times, origin, target) {
  return rows(times, `${origin} -> ${target}`, "Friday shuttle service", "Friday");
}

const tripSchedules = {
  [key("main", "san")]: [
    group("Mon-Thu - Main Campus to SAN Campus/Arzanah", mainToSanRows),
    group("Friday - Main Campus to SAN Campus/Arzanah", fridayRouteRows(fridayMainToSanTimes, "Main Campus", "SAN Campus/Arzanah"))
  ],
  [key("san", "main")]: [
    group("Mon-Thu - SAN Campus/Arzanah to Main Campus", sanToMainRows),
    group("Friday - SAN Campus/Arzanah to Main Campus", fridayRouteRows(fridaySanToMainTimes, "SAN Campus/Arzanah", "Main Campus"))
  ],
  [key("main", "masdar")]: [
    group("Mon-Thu - Main Campus to Masdar Residence", mainToMasdarRows),
    group("Friday - Main Campus to Masdar Residence", fridayRouteRows(fridayFromMainTimes, "Main Campus", "Masdar Residence"))
  ],
  [key("masdar", "main")]: [
    group("Mon-Thu - Masdar Residence to Main Campus", masdarToMainRows),
    group("Friday - Masdar Residence to Main Campus", fridayRouteRows(fridayToMainTimes, "Masdar Residence", "Main Campus"))
  ],
  [key("san", "masdar")]: [
    group("Mon-Thu - SAN Campus to Masdar Residence", sanToMasdarRows),
    group("Friday - SAN Campus to Masdar Residence", fridayRouteRows(fridayFromSanTimes, "SAN Campus", "Masdar Residence"))
  ],
  [key("masdar", "san")]: [
    group("Mon-Thu - Masdar Residence to SAN Campus", masdarToSanRows),
    group("Friday - Masdar Residence to SAN Campus", fridayRouteRows(fridayToSanTimes, "Masdar Residence", "SAN Campus"))
  ]
};

["rawda", "kurh", "lulu"].forEach((residenceId) => {
  const residence = locations[residenceId].place;

  tripSchedules[key("main", residenceId)] = [
    group(`Mon-Thu - Main Campus to ${residence}`, mainToResidenceRows(residence)),
    group(`Friday - Main Campus to ${residence}`, fridayRouteRows(fridayFromMainTimes, "Main Campus", residence))
  ];

  tripSchedules[key(residenceId, "main")] = [
    group(`Mon-Thu - ${residence} to Main Campus`, residenceToMainRows(residenceId, residence)),
    group(`Friday - ${residence} to Main Campus`, fridayRouteRows(fridayToMainTimes, residence, "Main Campus"))
  ];

  tripSchedules[key("san", residenceId)] = [
    group(`Mon-Thu - SAN Campus/Arzanah to ${residence}`, sanToResidenceRows(residenceId, residence)),
    group(`Friday - SAN Campus/Arzanah to ${residence}`, fridayRouteRows(fridayFromSanTimes, "SAN Campus/Arzanah", residence))
  ];

  tripSchedules[key(residenceId, "san")] = [
    group(`Mon-Thu - ${residence} to SAN Campus/Arzanah`, residenceToSanRows(residenceId, residence)),
    group(`Friday - ${residence} to SAN Campus/Arzanah`, fridayRouteRows(fridayToSanTimes, residence, "SAN Campus/Arzanah"))
  ];
});

const elements = {
  label: document.querySelector("#route-label"),
  title: document.querySelector("#route-title"),
  next: document.querySelector("#next-departure"),
  nextDetail: document.querySelector("#next-detail"),
  nextNote: document.querySelector("#next-note"),
  ticketRoute: document.querySelector("#ticket-route"),
  desktopRouteCaption: document.querySelector("#desktop-route-caption"),
  countdownDay: document.querySelector("#countdown-day"),
  countdownDays: document.querySelector("#countdown-days"),
  countdownHours: document.querySelector("#countdown-hours"),
  countdownMinutes: document.querySelector("#countdown-minutes"),
  countdownDisplay: document.querySelector(".countdown-display"),
  serviceWindow: document.querySelector("#service-window"),
  scheduleList: document.querySelector("#schedule-list"),
  uaeDay: document.querySelector("#uae-day"),
  uaeTime: document.querySelector("#uae-time"),
  mobilePickup: document.querySelector("#mobile-pickup"),
  mobileDestination: document.querySelector("#mobile-destination"),
  mobileSwap: document.querySelector("#mobile-swap"),
  mobileRouteSummary: document.querySelector("#mobile-route-summary")
};

let pickup = "main";
let destination = "san";
let mobileService = getUaeNowParts().day === 5 ? "friday" : "weekday";

const mobileLocationLabels = { main: "Main", san: "SAN", masdar: "Masdar", rawda: "Rawda", kurh: "KURH", lulu: "LULU" };
const mobileLocationDetails = { main: "Campus", san: "Campus", masdar: "Residence", rawda: "Residence", kurh: "ADNOC Schools", lulu: "Residence" };
const ticketLocationLabels = { main: "MAIN", san: "SAN", masdar: "MASDAR", rawda: "RAWDA", kurh: "KURH", lulu: "LULU" };

for (const container of [elements.mobilePickup, elements.mobileDestination]) {
  const isPickup = container === elements.mobilePickup;
  for (const locationId of locationIds) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mobileLocation = locationId;
    const nameSpan = document.createElement("span");
    nameSpan.className = "stop-name";
    nameSpan.textContent = mobileLocationLabels[locationId];
    const detailSpan = document.createElement("span");
    detailSpan.className = "stop-detail";
    detailSpan.textContent = mobileLocationDetails[locationId];
    detailSpan.setAttribute("aria-hidden", "true");
    button.append(nameSpan, detailSpan);
    button.setAttribute("aria-label", locations[locationId].label.replace("MAIN", "Main"));
    button.addEventListener("click", () => {
      if (isPickup) {
        pickup = locationId;
      } else {
        if (isUnavailableRoute(pickup, locationId)) return;
        destination = locationId;
      }
      renderTrip();
    });
    container.append(button);
  }
}

function renderMobileControls() {
  elements.mobilePickup.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mobileLocation === pickup));
  });
  elements.mobileDestination.querySelectorAll("button").forEach((button) => {
    const locationId = button.dataset.mobileLocation;
    button.disabled = isUnavailableRoute(pickup, locationId);
    button.setAttribute("aria-pressed", String(locationId === destination));
    button.title = getUnavailableReason(pickup, locationId);
  });
  elements.mobileSwap.disabled = isUnavailableRoute(destination, pickup);
  document.body.dataset.mobileService = mobileService;
  document.querySelectorAll("button[data-mobile-service]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mobileService === mobileService));
  });
}

function getTrip() {
  return tripSchedules[key(pickup, destination)] || [];
}

function getAllRows(groups) {
  return groups.flatMap((scheduleGroup) => scheduleGroup.rows);
}

function getServiceWindowLabel(groups) {
  const dayTags = new Set(getAllRows(groups).map((scheduleRow) => scheduleRow[3]));

  if (dayTags.has("Mon-Thu") && dayTags.has("Friday")) {
    return "Mon-Thu + Friday";
  }

  if (dayTags.has("Friday")) {
    return "Friday only";
  }

  return groups.length ? "Mon-Thu only" : "No direct route";
}

function isBoysGirlsHostelRoute(nextPickup, nextDestination) {
  return (
    (boysHostels.has(nextPickup) && girlsHostels.has(nextDestination)) ||
    (girlsHostels.has(nextPickup) && boysHostels.has(nextDestination))
  );
}

function getUnavailableReason(nextPickup, nextDestination) {
  if (nextPickup === nextDestination) {
    return "Pickup and destination cannot be the same";
  }

  if (isBoysGirlsHostelRoute(nextPickup, nextDestination)) {
    return "No direct boys-to-girls hostel shuttle";
  }

  if (!tripSchedules[key(nextPickup, nextDestination)]) {
    return "No direct shuttle listed";
  }

  return "";
}

function isUnavailableRoute(nextPickup, nextDestination) {
  return Boolean(getUnavailableReason(nextPickup, nextDestination));
}

function getFallbackDestination(nextPickup) {
  return locationIds.find((locationId) => !isUnavailableRoute(nextPickup, locationId)) || nextPickup;
}

function normalizeDestination() {
  if (isUnavailableRoute(pickup, destination)) {
    destination = getFallbackDestination(pickup);
  }
}

function parseDepartureTime(timeText) {
  const match = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);

  if (match[3].toUpperCase() === "PM") {
    hours += 12;
  }

  return { hours, minutes };
}

function getDaysForTag(tag) {
  return scheduleDays[tag] || scheduleDays["Mon-Thu"];
}

function getUaeNowParts(now = new Date()) {
  const nowUaeMs = now.getTime() + uaeOffsetMs;
  const uaeDate = new Date(nowUaeMs);

  return {
    nowUaeMs,
    year: uaeDate.getUTCFullYear(),
    month: uaeDate.getUTCMonth(),
    date: uaeDate.getUTCDate(),
    day: uaeDate.getUTCDay()
  };
}

function getNextDeparture(rows, now = new Date()) {
  const uaeNow = getUaeNowParts(now);
  const { nowUaeMs } = uaeNow;
  const todayStartMs = Date.UTC(uaeNow.year, uaeNow.month, uaeNow.date);
  const searchStartMs = Math.max(nowUaeMs, scheduleEffectiveUaeMs);
  const searchStartDate = new Date(searchStartMs);
  const baseYear = searchStartDate.getUTCFullYear();
  const baseMonth = searchStartDate.getUTCMonth();
  const baseDate = searchStartDate.getUTCDate();
  let nextDeparture = null;

  rows.forEach((scheduleRow) => {
    const departure = parseDepartureTime(scheduleRow[0]);

    if (!departure) {
      return;
    }

    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      const dayStartMs = Date.UTC(baseYear, baseMonth, baseDate + dayOffset);
      const dayNumber = new Date(dayStartMs).getUTCDay();

      if (!getDaysForTag(scheduleRow[3]).includes(dayNumber)) {
        continue;
      }

      const departureMs = Date.UTC(
        baseYear,
        baseMonth,
        baseDate + dayOffset,
        departure.hours,
        departure.minutes
      );

      if (departureMs >= searchStartMs && (!nextDeparture || departureMs < nextDeparture.departureMs)) {
        nextDeparture = {
          row: scheduleRow,
          departureMs,
          countdownMs: departureMs - nowUaeMs,
          dayOffset: Math.round((dayStartMs - todayStartMs) / 86400000),
          dayName: dayNames[dayNumber]
        };
      }
    }
  });

  return nextDeparture;
}

function getRouteStatus(timeText, dayTag, now = new Date()) {
  const departure = parseDepartureTime(timeText);

  if (!departure) {
    return "scheduled";
  }

  const uaeNow = getUaeNowParts(now);

  if (uaeNow.nowUaeMs < scheduleEffectiveUaeMs) {
    return "scheduled";
  }

  if (!getDaysForTag(dayTag).includes(uaeNow.day)) {
    return "scheduled";
  }

  const departureMs = Date.UTC(
    uaeNow.year,
    uaeNow.month,
    uaeNow.date,
    departure.hours,
    departure.minutes
  );

  return departureMs <= uaeNow.nowUaeMs ? "departed" : "scheduled";
}

function getCountdownParts(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

function formatCountdownUnit(value) {
  return String(value).padStart(2, "0");
}

function formatDepartureDetail(departure) {
  const dayLabel = departure.dayOffset === 0
    ? `Today (${departure.dayName})`
    : departure.dayOffset === 1
      ? `Tomorrow (${departure.dayName})`
      : departure.dayName;

  return `${dayLabel} - ${departure.row[3]} schedule`;
}

function getCountdownDayLabel(departure) {
  if (departure.dayOffset === 0) {
    return "Today";
  }

  if (departure.dayOffset === 1) {
    return "Tomorrow";
  }

  return departure.dayName;
}

function resetCountdownDisplay() {
  elements.countdownDay.textContent = "No route";
  elements.countdownDays.textContent = "--";
  elements.countdownHours.textContent = "--";
  elements.countdownMinutes.textContent = "--";
  elements.countdownDisplay.setAttribute("aria-label", "No direct route in PDF");
}

function updateCountdownDisplay(departure) {
  const countdown = getCountdownParts(departure.countdownMs);

  elements.countdownDay.textContent = getCountdownDayLabel(departure);
  elements.countdownDays.textContent = formatCountdownUnit(countdown.days);
  elements.countdownHours.textContent = formatCountdownUnit(countdown.hours);
  elements.countdownMinutes.textContent = formatCountdownUnit(countdown.minutes);
  elements.countdownDisplay.setAttribute(
    "aria-label",
    `Countdown to next departure: ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds`
  );
}

function updateNextDeparture() {
  const nextDeparture = getNextDeparture(getAllRows(getTrip()));

  const departureNote = nextDeparture ? getDepartureNote(nextDeparture.row) : "";
  elements.nextNote.textContent = departureNote;
  elements.nextNote.hidden = !departureNote;

  if (!nextDeparture) {
    elements.next.textContent = "--";
    elements.nextDetail.textContent = "No direct route in PDF";
    resetCountdownDisplay();
    return;
  }

  elements.next.textContent = nextDeparture.row[0];
  elements.nextDetail.textContent = formatDepartureDetail(nextDeparture);
  updateCountdownDisplay(nextDeparture);
}

function getDepartureNote(scheduleRow) {
  const detail = scheduleRow[2] || "";
  return /\bonly\b|\brestricted\b/i.test(detail) ? detail : "";
}

function renderButtons() {
  document.querySelectorAll("button[data-pickup]").forEach((button) => {
    const isActive = button.dataset.pickup === pickup;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  document.querySelectorAll("button[data-destination]").forEach((button) => {
    const isActive = button.dataset.destination === destination;
    const unavailableReason = getUnavailableReason(pickup, button.dataset.destination);
    const isUnavailable = Boolean(unavailableReason);
    button.classList.toggle("is-active", isActive);
    button.classList.toggle("is-unavailable", isUnavailable);
    button.disabled = isUnavailable;
    button.setAttribute("aria-pressed", String(isActive));
    button.setAttribute("aria-disabled", String(isUnavailable));
    button.title = unavailableReason;
  });
}

function renderSchedule(groups) {
  if (!groups.length) {
    const message = document.createElement("div");
    message.className = "empty-state";
    message.innerHTML = `
      <strong>No direct timetable listed</strong>
      <span>The Fall 2026 PDF does not list a direct shuttle from ${locations[pickup].label} to ${locations[destination].label}. Choose Main Campus or SAN Campus as a transfer point.</span>
    `;
    elements.scheduleList.replaceChildren(message);
    return;
  }

  const tableHead = document.createElement("div");
  tableHead.className = "schedule-table-head";
  tableHead.innerHTML = `
    <span>Departure</span>
    <span>Route</span>
    <span>Day</span>
    <span>Status</span>
  `;

  elements.scheduleList.replaceChildren(
    tableHead,
    ...groups.flatMap((scheduleGroup) => {
      const header = document.createElement("div");
      header.className = "schedule-group";
      header.textContent = scheduleGroup.title;

      const scheduleRows = scheduleGroup.rows.map((scheduleRow) => {
        const [time, name, detail, state] = scheduleRow;
        const isRestricted = Boolean(getDepartureNote(scheduleRow));
        const item = document.createElement("article");
        item.className = "schedule-row";
        item.dataset.time = time;
        item.dataset.dayTag = state;
        item.dataset.restricted = String(isRestricted);
        item.dataset.specialPickup = String(isRestricted);
        item.innerHTML = `
          <span class="schedule-time" data-label="Scheduled">${time}</span>
          <span class="schedule-route" data-label="Route">
            <strong>${name}</strong>
            <span class="schedule-note">${detail}</span>
          </span>
          <span class="schedule-day" data-label="Day">
            <span class="schedule-pill">${state}</span>
          </span>
          <span class="schedule-status" data-label="Status">
            <span class="status-pill is-scheduled">Scheduled</span>
          </span>
        `;
        return item;
      });

      return [header, ...scheduleRows];
    })
  );

  updateScheduleStatuses();
}

function updateScheduleStatuses() {
  document.querySelectorAll(".schedule-row").forEach((scheduleRow) => {
    const status = getRouteStatus(scheduleRow.dataset.time, scheduleRow.dataset.dayTag);
    const statusPill = scheduleRow.querySelector(".status-pill");

    if (!statusPill) {
      return;
    }

    const isDeparted = status === "departed";
    statusPill.textContent = isDeparted ? "Departed" : "Scheduled";
    statusPill.classList.toggle("is-departed", isDeparted);
    statusPill.classList.toggle("is-scheduled", !isDeparted);
    statusPill.setAttribute("aria-label", isDeparted ? "Bus already departed" : "Bus scheduled");
  });
}

function renderTrip() {
  normalizeDestination();

  const groups = getTrip();
  const pickupLabel = locations[pickup].label;
  const destinationLabel = locations[destination].label;

  document.body.dataset.pickup = pickup;
  document.body.dataset.route = destination;
  elements.label.textContent = `${pickupLabel} to ${destinationLabel}`.toUpperCase();
  elements.title.textContent = `${pickupLabel} to ${destinationLabel}`;
  elements.ticketRoute.textContent = `${ticketLocationLabels[pickup]} → ${ticketLocationLabels[destination]}`;
  if (elements.desktopRouteCaption) {
    elements.desktopRouteCaption.textContent = `${pickupLabel} to ${destinationLabel}`;
  }
  elements.serviceWindow.textContent = getServiceWindowLabel(groups);
  elements.mobileRouteSummary.textContent = getAllRows(groups).find((scheduleRow) => !getDepartureNote(scheduleRow))?.[1].replace(" -> ", " → ") || `${pickupLabel} → ${destinationLabel}`;

  renderButtons();
  renderMobileControls();
  renderSchedule(groups);
  updateNextDeparture();
}

document.querySelectorAll("button[data-pickup]").forEach((button) => {
  button.addEventListener("click", () => {
    pickup = button.dataset.pickup;
    normalizeDestination();
    renderTrip();
  });
});

document.querySelectorAll("button[data-destination]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled || isUnavailableRoute(pickup, button.dataset.destination)) {
      return;
    }

    destination = button.dataset.destination;
    renderTrip();
  });
});

const swapIcon = elements.mobileSwap.querySelector("svg");

swapIcon?.addEventListener("animationend", (event) => {
  if (event.target === swapIcon) {
    elements.mobileSwap.classList.remove("is-swapping");
  }
});

elements.mobileSwap.addEventListener("click", () => {
  if (isUnavailableRoute(destination, pickup)) return;
  [pickup, destination] = [destination, pickup];
  renderTrip();

  elements.mobileSwap.classList.remove("is-swapping");
  if (swapIcon && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Restart only the swap icon when it is clicked again during its animation.
    swapIcon.getBoundingClientRect();
    elements.mobileSwap.classList.add("is-swapping");
  }
});

document.querySelectorAll("button[data-mobile-service]").forEach((button) => {
  button.addEventListener("click", () => {
    mobileService = button.dataset.mobileService;
    renderMobileControls();
  });
});

function updateUaeTime() {
  elements.uaeDay.textContent = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "long"
  }).format(new Date());

  elements.uaeTime.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:" || window.location.hostname === "appassets.androidplatform.net") {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The app still works online if the browser blocks service worker setup.
    });
  });
}

function playBusIntro() {
  const busImage = document.querySelector(".hero-bus > img");
  if (!busImage || typeof busImage.animate !== "function") return;

  const animateBus = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    busImage.animate([
      { transform: "translateX(-10%)", opacity: 0 },
      { transform: "translateX(-52%)", opacity: 1 }
    ], { duration: 700, easing: "ease-out" });
  };

  if (busImage.complete) {
    animateBus();
  } else {
    busImage.addEventListener("load", animateBus, { once: true });
  }
}

try {
  localStorage.removeItem("ku-shuttle-theme");
} catch {
  // Theme persistence cleanup is optional.
}

registerServiceWorker();
updateUaeTime();
renderTrip();
playBusIntro();
setInterval(() => {
  updateUaeTime();
  updateNextDeparture();
  updateScheduleStatuses();
}, 1000);
