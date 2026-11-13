const config = require("../../../config");

const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: config.animeTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const LOCAL_FORMATTER = new Intl.DateTimeFormat("es-NI", {
  timeZone: config.animeTimezone,
  dateStyle: "medium",
  timeStyle: "short",
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: config.animeTimezone,
  weekday: "short",
});

const CLOCK_FORMATTER = new Intl.DateTimeFormat("es-NI", {
  timeZone: config.animeTimezone,
  hour: "2-digit",
  minute: "2-digit",
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat("es-NI", {
  timeZone: config.animeTimezone,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const WEEKDAY_TO_NUMBER = {
  Sun: 7,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function dateKey(date = new Date()) {
  return DATE_FORMATTER.format(date);
}

function localTime(date = new Date()) {
  return LOCAL_FORMATTER.format(date);
}

function weekdayNumber(date = new Date()) {
  return WEEKDAY_TO_NUMBER[WEEKDAY_FORMATTER.format(date)] || 7;
}

function clockTime(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return CLOCK_FORMATTER.format(date);
}

function longDate(date = new Date()) {
  const text = LONG_DATE_FORMATTER.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1).replace(",", "");
}

function isDateOnlyUtc(value) {
  return /T00:00:00(?:\.000)?Z$/.test(String(value));
}

function timestampDateKey(value) {
  if (!value) return null;

  const raw = String(value);
  if (isDateOnlyUtc(raw)) return raw.slice(0, 10);

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return dateKey(date);
}

module.exports = {
  clockTime,
  dateKey,
  localTime,
  longDate,
  isDateOnlyUtc,
  timestampDateKey,
  weekdayNumber,
};
