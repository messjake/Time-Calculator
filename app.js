function setAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
}

setAppHeight();
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () => requestAnimationFrame(setAppHeight));
window.visualViewport?.addEventListener("resize", setAppHeight);

const tabs = document.querySelectorAll(".tab");
const views = {
  convert: document.querySelector("#convert-view"),
  clockout: document.querySelector("#clockout-view"),
  between: document.querySelector("#between-view"),
  addtime: document.querySelector("#addtime-view"),
  total: document.querySelector("#total-view")
};

const convertSegments = document.querySelectorAll("[data-convert-mode]");
const timeMathSegments = document.querySelectorAll("[data-time-math-mode]");
const decimalForm = document.querySelector("#decimal-form");
const partsForm = document.querySelector("#parts-form");
const decimalHoursInput = document.querySelector("#decimal-hours");
const wholeHoursInput = document.querySelector("#whole-hours");
const wholeMinutesInput = document.querySelector("#whole-minutes");
const convertPrimary = document.querySelector("#convert-primary");
const convertSecondary = document.querySelector("#convert-secondary");

const clockInInput = document.querySelector("#clock-in");
const hoursLeftInput = document.querySelector("#hours-left");
const breakMinutesInput = document.querySelector("#break-minutes");
const clockoutPrimary = document.querySelector("#clockout-primary");
const clockoutSecondary = document.querySelector("#clockout-secondary");

const betweenStartInput = document.querySelector("#between-start");
const betweenEndInput = document.querySelector("#between-end");
const betweenBreakInput = document.querySelector("#between-break");
const betweenPrimary = document.querySelector("#between-primary");
const betweenSecondary = document.querySelector("#between-secondary");

const mathStartInput = document.querySelector("#math-start");
const mathHoursInput = document.querySelector("#math-hours");
const mathMinutesInput = document.querySelector("#math-minutes");
const timeMathPrimary = document.querySelector("#time-math-primary");
const timeMathSecondary = document.querySelector("#time-math-secondary");

const totalDurationInputs = document.querySelectorAll(".total-duration");
const goalHoursInput = document.querySelector("#goal-hours");
const totalPrimary = document.querySelector("#total-primary");
const totalSecondary = document.querySelector("#total-secondary");

const state = {
  activeTab: "convert",
  convertMode: "decimal",
  timeMathMode: "add"
};

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", (event) => event.preventDefault());
});

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function plural(value, singular, pluralForm = `${singular}s`) {
  return value === 1 ? singular : pluralForm;
}

function trimNumber(value, places) {
  return value.toFixed(places).replace(/\.?0+$/, "");
}

function durationPartsFromSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return { hours, minutes, seconds };
}

function roundedDurationParts(decimalHours) {
  const roundedMinutes = Math.max(0, Math.round(decimalHours * 60));
  return {
    hours: Math.floor(roundedMinutes / 60),
    minutes: roundedMinutes % 60,
    totalMinutes: roundedMinutes
  };
}

function formatDuration({ hours, minutes, seconds = 0 }) {
  const pieces = [];

  if (hours > 0) {
    pieces.push(`${hours} ${plural(hours, "hour")}`);
  }

  if (minutes > 0 || hours === 0 || seconds === 0) {
    pieces.push(`${minutes} ${plural(minutes, "min")}`);
  }

  if (seconds > 0) {
    pieces.push(`${seconds} ${plural(seconds, "sec")}`);
  }

  return pieces.join(" ");
}

function formatClockDuration(hours, minutes) {
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function setInvalid(primary, secondary, message = "Enter a positive time value.") {
  primary.textContent = "Needs time";
  secondary.textContent = message;
}

function updateConvert() {
  if (state.convertMode === "decimal") {
    const decimalHours = toNumber(decimalHoursInput.value);

    if (decimalHours === null || decimalHours < 0) {
      setInvalid(convertPrimary, convertSecondary, "Use decimal hours like 1.166 or 5.37.");
      return;
    }

    const rounded = roundedDurationParts(decimalHours);
    const exact = durationPartsFromSeconds(decimalHours * 3600);
    const exactText = formatDuration(exact);
    const roundedText = formatDuration(rounded);
    const detail = exact.seconds > 0
      ? `Clock style: ${formatClockDuration(rounded.hours, rounded.minutes)}. Exact: ${exactText}.`
      : `Clock style: ${formatClockDuration(rounded.hours, rounded.minutes)}`;

    convertPrimary.textContent = roundedText;
    convertSecondary.textContent = detail;
    return;
  }

  const hours = toNumber(wholeHoursInput.value);
  const minutes = toNumber(wholeMinutesInput.value);

  if (hours === null || minutes === null || hours < 0 || minutes < 0) {
    setInvalid(convertPrimary, convertSecondary, "Use whole hours and minutes.");
    return;
  }

  const totalMinutes = Math.round(hours * 60 + minutes);
  const decimal = totalMinutes / 60;
  const displayHours = Math.floor(totalMinutes / 60);
  const displayMinutes = totalMinutes % 60;

  convertPrimary.textContent = `${trimNumber(decimal, 3)} hours`;
  convertSecondary.textContent = `${formatDuration({ hours: displayHours, minutes: displayMinutes })} = ${trimNumber(decimal, 2)} payroll hours`;
}

function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

function minutesFromTime(time) {
  return time.hours * 60 + time.minutes;
}

function formatTimeOfDay(minutesFromMidnight) {
  const totalMinutes = ((minutesFromMidnight % 1440) + 1440) % 1440;
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDayShift(minutesFromMidnight) {
  const dayOffset = Math.floor(minutesFromMidnight / 1440);

  if (dayOffset === 0) {
    return "";
  }

  if (dayOffset === 1) {
    return " next day";
  }

  if (dayOffset === -1) {
    return " previous day";
  }

  return dayOffset > 1 ? ` +${dayOffset} days` : ` ${dayOffset} days`;
}

function updateClockout() {
  const clockIn = parseTime(clockInInput.value);
  const hoursLeft = toNumber(hoursLeftInput.value);
  const breakMinutes = toNumber(breakMinutesInput.value) ?? 0;

  if (!clockIn || hoursLeft === null || hoursLeft < 0 || breakMinutes < 0) {
    setInvalid(clockoutPrimary, clockoutSecondary, "Use a clock-in time and positive hours.");
    return;
  }

  const workMinutes = Math.round(hoursLeft * 60);
  const roundedBreakMinutes = Math.round(breakMinutes);
  const exact = durationPartsFromSeconds(hoursLeft * 3600);
  const startMinutes = minutesFromTime(clockIn);
  const endMinutes = startMinutes + workMinutes + roundedBreakMinutes;
  const breakText = roundedBreakMinutes > 0 ? `, plus ${roundedBreakMinutes} ${plural(roundedBreakMinutes, "minute")} unpaid break` : "";
  const exactText = exact.seconds > 0 ? ` Exact work time: ${formatDuration(exact)}.` : "";

  clockoutPrimary.textContent = `${formatTimeOfDay(endMinutes)}${formatDayShift(endMinutes)}`;
  clockoutSecondary.textContent = `Work time: ${formatDuration({
    hours: Math.floor(workMinutes / 60),
    minutes: workMinutes % 60
  })}${breakText}.${exactText}`;
}

function updateBetween() {
  const start = parseTime(betweenStartInput.value);
  const end = parseTime(betweenEndInput.value);
  const breakMinutes = toNumber(betweenBreakInput.value) ?? 0;

  if (!start || !end || breakMinutes < 0) {
    setInvalid(betweenPrimary, betweenSecondary, "Use start/end times and a positive break.");
    return;
  }

  const startMinutes = minutesFromTime(start);
  let endMinutes = minutesFromTime(end);
  const overnight = endMinutes < startMinutes;

  if (overnight) {
    endMinutes += 1440;
  }

  const elapsedMinutes = endMinutes - startMinutes;
  const roundedBreakMinutes = Math.round(breakMinutes);
  const workedMinutes = Math.max(0, elapsedMinutes - roundedBreakMinutes);
  const breakText = roundedBreakMinutes > 0 ? ` after ${roundedBreakMinutes} ${plural(roundedBreakMinutes, "minute")} unpaid break` : "";
  const overnightText = overnight ? " End counted as next day." : "";

  betweenPrimary.textContent = formatDuration({
    hours: Math.floor(workedMinutes / 60),
    minutes: workedMinutes % 60
  });
  betweenSecondary.textContent = `${trimNumber(workedMinutes / 60, 2)} decimal hours${breakText}.${overnightText}`;
}

function updateTimeMath() {
  const start = parseTime(mathStartInput.value);
  const decimalHours = toNumber(mathHoursInput.value);
  const extraMinutes = toNumber(mathMinutesInput.value) ?? 0;

  if (!start || decimalHours === null || decimalHours < 0 || extraMinutes < 0) {
    setInvalid(timeMathPrimary, timeMathSecondary, "Use a starting time and a positive duration.");
    return;
  }

  const durationMinutes = Math.round(decimalHours * 60 + extraMinutes);
  const startMinutes = minutesFromTime(start);
  const sign = state.timeMathMode === "add" ? 1 : -1;
  const resultMinutes = startMinutes + sign * durationMinutes;
  const action = state.timeMathMode === "add" ? "Added" : "Subtracted";

  timeMathPrimary.textContent = `${formatTimeOfDay(resultMinutes)}${formatDayShift(resultMinutes)}`;
  timeMathSecondary.textContent = `${action} ${formatDuration({
    hours: Math.floor(durationMinutes / 60),
    minutes: durationMinutes % 60
  })} from ${formatTimeOfDay(startMinutes)}.`;
}

function updateTotal() {
  const goalHours = toNumber(goalHoursInput.value);
  let totalHours = 0;

  for (const input of totalDurationInputs) {
    const value = toNumber(input.value);

    if (value === null || value < 0 || goalHours === null || goalHours < 0) {
      setInvalid(totalPrimary, totalSecondary, "Use positive decimal hours; blank rows count as zero.");
      return;
    }

    totalHours += value;
  }

  const totalMinutes = Math.round(totalHours * 60);
  const goalMinutes = Math.round(goalHours * 60);
  const remainingMinutes = goalMinutes - totalMinutes;
  let goalText = "Goal met exactly.";

  if (remainingMinutes > 0) {
    goalText = `${formatDuration({
      hours: Math.floor(remainingMinutes / 60),
      minutes: remainingMinutes % 60
    })} left to ${trimNumber(goalHours, 2)} hours.`;
  } else if (remainingMinutes < 0) {
    const overMinutes = Math.abs(remainingMinutes);
    goalText = `${formatDuration({
      hours: Math.floor(overMinutes / 60),
      minutes: overMinutes % 60
    })} over ${trimNumber(goalHours, 2)} hours.`;
  }

  totalPrimary.textContent = formatDuration({
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60
  });
  totalSecondary.textContent = `${trimNumber(totalMinutes / 60, 2)} payroll hours. ${goalText}`;
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeTab = tab.dataset.tab;
    tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    Object.entries(views).forEach(([name, view]) => {
      view.classList.toggle("is-active", name === state.activeTab);
    });
    tab.scrollIntoView({ block: "nearest", inline: "center" });
  });
});

convertSegments.forEach((segment) => {
  segment.addEventListener("click", () => {
    state.convertMode = segment.dataset.convertMode;
    convertSegments.forEach((item) => item.classList.toggle("is-active", item === segment));
    decimalForm.classList.toggle("is-hidden", state.convertMode !== "decimal");
    partsForm.classList.toggle("is-hidden", state.convertMode !== "parts");
    updateConvert();
  });
});

timeMathSegments.forEach((segment) => {
  segment.addEventListener("click", () => {
    state.timeMathMode = segment.dataset.timeMathMode;
    timeMathSegments.forEach((item) => item.classList.toggle("is-active", item === segment));
    updateTimeMath();
  });
});

[decimalHoursInput, wholeHoursInput, wholeMinutesInput].forEach((input) => {
  input.addEventListener("input", updateConvert);
});

[clockInInput, hoursLeftInput, breakMinutesInput].forEach((input) => {
  input.addEventListener("input", updateClockout);
});

[betweenStartInput, betweenEndInput, betweenBreakInput].forEach((input) => {
  input.addEventListener("input", updateBetween);
});

[mathStartInput, mathHoursInput, mathMinutesInput].forEach((input) => {
  input.addEventListener("input", updateTimeMath);
});

[...totalDurationInputs, goalHoursInput].forEach((input) => {
  input.addEventListener("input", updateTotal);
});

updateConvert();
updateClockout();
updateBetween();
updateTimeMath();
updateTotal();
