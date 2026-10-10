// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Composable athlete MCP Apps — one surface per bundle (ADR 0034 / 12).
 * Build injects __SURFACE__ (overview | statistics | calendar | workouts | measurements | blind-spot).
 */
import { App } from "./app-with-deps.js";

// Replaced by build.mjs (SURFACE key + full attribute literal for minify-safe stamps).
const SURFACE: string = "__SURFACE__";
const SURFACE_ATTR: string = "__SURFACE_ATTR__";

const titleEl = document.getElementById("title")!;
const metaEl = document.getElementById("meta")!;
const bodyEl = document.getElementById("body")!;
const chromeActions = document.getElementById("chrome-actions")!;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type TToolResult = {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

function fromResult(result: TToolResult): unknown | null {
  if (result.isError) return null;
  if (result.structuredContent != null) return result.structuredContent;
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function showError(message: string) {
  titleEl.textContent = surfaceTitle();
  metaEl.textContent = "";
  bodyEl.innerHTML = `<p class="err">${escapeHtml(message)}</p>`;
}

function surfaceTitle(): string {
  switch (SURFACE) {
    case "overview":
      return "Program overview";
    case "statistics":
      return "Profile statistics";
    case "calendar":
      return "Profile calendar";
    case "workouts":
      return "Workout history";
    case "measurements":
      return "Body measurements";
    case "blind-spot":
      return "Blind spot analysis";
    default:
      return "Proxima";
  }
}

/** Surface-unique marker for composability tests (literal baked at build time). */
function surfaceMarker(): string {
  return SURFACE_ATTR;
}

// —— overview ——
type TOverviewRoutine = {
  title: string;
  folder_id: number;
  order: string;
  exercises: unknown[];
};

type TOverviewProgram = {
  id: number;
  title: string;
  program_length: number | null;
  routines: TOverviewRoutine[];
};

function renderOverview(program: TOverviewProgram) {
  titleEl.textContent = program.title || `Program ${program.id}`;
  const weeks = new Map<number, TOverviewRoutine[]>();
  for (const day of program.routines ?? []) {
    const list = weeks.get(day.folder_id) ?? [];
    list.push(day);
    weeks.set(day.folder_id, list);
  }
  const weekCount =
    program.program_length ??
    (weeks.size > 0 ? Math.max(...weeks.keys()) + 1 : 0);
  metaEl.textContent =
    weekCount === 0
      ? "No weeks in this Program prescription"
      : `${weekCount} week${weekCount === 1 ? "" : "s"} · look-first overview`;

  chromeActions.innerHTML = `<button type="button" class="primary" id="open-builder">Open week builder</button>`;
  document.getElementById("open-builder")?.addEventListener("click", () => {
    void app.callServerTool({
      name: "show_program_week",
      arguments: { program_id: program.id, week_index: 0 },
    });
  });

  const sortedWeeks = [...weeks.entries()].sort((a, b) => a[0] - b[0]);
  if (sortedWeeks.length === 0) {
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>Empty prescription.</p>`;
    return;
  }
  bodyEl.innerHTML = sortedWeeks
    .map(([weekIndex, days]) => {
      const ordered = days
        .slice()
        .sort((a, b) => Number(a.order) - Number(b.order));
      const dayLines = ordered
        .map(
          (day) =>
            `<div class="row"><span>${escapeHtml(day.title)}</span><span class="muted">${day.exercises?.length ?? 0} exercises</span></div>`,
        )
        .join("");
      return `<section class="card" ${surfaceMarker()}><h2>Week ${weekIndex + 1}</h2>${dayLines}</section>`;
    })
    .join("");
}

// —— statistics ——
type TStatsBucket = {
  weekStart: string;
  durationSeconds: number;
  reps: number;
  volumeKg: number;
};

type TStats = {
  weeks: number;
  buckets: TStatsBucket[];
  weekStreak?: number;
  avgWorkoutsPerWeek?: number | null;
  thisWeek?: { durationSeconds: number; reps: number; volumeKg: number };
};

function maxOf(nums: number[]): number {
  let m = 0;
  for (const n of nums) if (n > m) m = n;
  return m;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function renderBars(values: number[], labels: string[]): string {
  const peak = maxOf(values) || 1;
  const bars = values
    .map((v, i) => {
      const pct = Math.max(2, Math.round((v / peak) * 100));
      return `<div class="bar" style="height:${pct}%" title="${escapeHtml(labels[i] ?? "")}: ${v}"></div>`;
    })
    .join("");
  return `<div class="bars">${bars}</div>`;
}

function renderStatistics(stats: TStats) {
  titleEl.textContent = "Profile statistics";
  const buckets = stats.buckets ?? [];
  const labels = buckets.map((b) => b.weekStart.slice(5));
  metaEl.textContent = [
    `${stats.weeks ?? buckets.length}-week window (US ET)`,
    stats.weekStreak != null ? `streak ${stats.weekStreak}` : null,
    stats.avgWorkoutsPerWeek != null
      ? `avg ${stats.avgWorkoutsPerWeek.toFixed(1)}/wk`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  chromeActions.innerHTML = "";
  const duration = buckets.map((b) => b.durationSeconds);
  const reps = buckets.map((b) => b.reps);
  const volume = buckets.map((b) => b.volumeKg);
  const thisWeek = stats.thisWeek;
  bodyEl.innerHTML = `
    <section class="card" ${surfaceMarker()}>
      <h2>Duration</h2>
      ${renderBars(duration, labels)}
      <p class="meta">This week: ${formatDuration(thisWeek?.durationSeconds ?? 0)}</p>
    </section>
    <section class="card" ${surfaceMarker()}>
      <h2>Reps</h2>
      ${renderBars(reps, labels)}
      <p class="meta">This week: ${thisWeek?.reps ?? 0}</p>
    </section>
    <section class="card" ${surfaceMarker()}>
      <h2>Volume (kg)</h2>
      ${renderBars(volume, labels)}
      <p class="meta">This week: ${Math.round(thisWeek?.volumeKg ?? 0)}</p>
    </section>`;
}

// —— calendar ——
type TCalWorkout = { id: string; title: string; started_at: string };
type TCalendar = {
  year: number;
  month: number;
  workouts: TCalWorkout[];
  days: Record<string, TCalWorkout[]>;
};

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildGrid(year: number, month: number): { key: string; day: number; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startDow = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: { key: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ key: `pad-${i}`, day: 0, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key, day: d, inMonth: true });
  }
  return cells;
}

function renderCalendar(cal: TCalendar) {
  titleEl.textContent = "Profile calendar";
  metaEl.textContent = `${monthLabel(cal.year, cal.month)} · ${(cal.workouts ?? []).length} workouts`;
  chromeActions.innerHTML = `
    <button type="button" id="cal-prev" aria-label="Previous month">←</button>
    <button type="button" id="cal-next" aria-label="Next month">→</button>`;

  const hit = new Set(Object.keys(cal.days ?? {}));
  const dow = ["S", "M", "T", "W", "T", "F", "S"]
    .map((d) => `<div class="dow">${d}</div>`)
    .join("");
  const cells = buildGrid(cal.year, cal.month)
    .map((cell) => {
      if (!cell.inMonth) return `<div class="cell out"></div>`;
      const cls = hit.has(cell.key) ? "cell hit" : "cell";
      return `<div class="${cls}">${cell.day}</div>`;
    })
    .join("");

  const dayList = Object.entries(cal.days ?? {})
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([key, workouts]) => {
      const titles = workouts
        .map((w) => escapeHtml(w.title || "Workout"))
        .join(", ");
      return `<div class="row"><span>${escapeHtml(key)}</span><span class="muted">${titles}</span></div>`;
    })
    .join("");

  bodyEl.innerHTML = `
    <div class="cal" ${surfaceMarker()}>${dow}${cells}</div>
    <section class="card" ${surfaceMarker()}><h2>Days</h2>${dayList || '<p class="empty">No workouts this month.</p>'}</section>`;

  const offset = new Date().getTimezoneOffset();
  document.getElementById("cal-prev")?.addEventListener("click", () => {
    let y = cal.year;
    let m = cal.month - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    void refreshCalendar(y, m, offset);
  });
  document.getElementById("cal-next")?.addEventListener("click", () => {
    let y = cal.year;
    let m = cal.month + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    void refreshCalendar(y, m, offset);
  });
}

async function refreshCalendar(
  year: number,
  month: number,
  timezone_offset_minutes: number,
) {
  const result = await app.callServerTool({
    name: "get_profile_calendar",
    arguments: { year, month, timezone_offset_minutes },
  });
  const payload = fromResult(result);
  if (!payload) {
    showError("Could not load calendar");
    return;
  }
  renderCalendar(payload as TCalendar);
}

// —— workouts ——
type TBrowseWorkout = {
  id?: string;
  title: string;
  started_at?: string;
  ended_at?: string;
  exercises?: { title: string }[];
};

function renderWorkouts(data: {
  workouts: TBrowseWorkout[];
  next_cursor: { started_at: string; id: string } | null;
}) {
  titleEl.textContent = "Workout history";
  const workouts = data.workouts ?? [];
  metaEl.textContent = `${workouts.length} session${workouts.length === 1 ? "" : "s"} · backup (not live Hevy)`;
  chromeActions.innerHTML = data.next_cursor
    ? `<button type="button" id="load-more">Load more</button>`
    : "";

  if (workouts.length === 0) {
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>No backed-up workouts.</p>`;
    return;
  }

  bodyEl.innerHTML = workouts
    .map((w) => {
      const ex = (w.exercises ?? [])
        .slice(0, 5)
        .map((e) => escapeHtml(e.title))
        .join(" · ");
      const when = w.started_at
        ? new Date(w.started_at).toLocaleString()
        : "";
      return `<section class="card" ${surfaceMarker()}>
        <h2>${escapeHtml(w.title || "Workout")}</h2>
        <p class="meta">${escapeHtml(when)}</p>
        <p class="muted">${ex || "No exercises"}</p>
      </section>`;
    })
    .join("");

  document.getElementById("load-more")?.addEventListener("click", () => {
    if (!data.next_cursor) return;
    void (async () => {
      const result = await app.callServerTool({
        name: "list_workouts",
        arguments: {
          cursor_started_at: data.next_cursor!.started_at,
          cursor_id: data.next_cursor!.id,
          preview: true,
        },
      });
      const more = fromResult(result) as typeof data | null;
      if (!more) return;
      renderWorkouts({
        workouts: [...workouts, ...(more.workouts ?? [])],
        next_cursor: more.next_cursor,
      });
    })();
  });
}

// —— measurements ——
type TMeasurement = {
  measured_on: string;
  weight_kg: number | null;
  lean_mass_kg: number | null;
  fat_percent: number | null;
};

function renderMeasurements(data: { measurements: TMeasurement[] }) {
  titleEl.textContent = "Body measurements";
  const rows = data.measurements ?? [];
  metaEl.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"} · metric`;
  chromeActions.innerHTML = "";
  if (rows.length === 0) {
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>No measurements in this window.</p>`;
    return;
  }
  bodyEl.innerHTML = rows
    .map((m) => {
      const bits = [
        m.weight_kg != null ? `${m.weight_kg} kg` : null,
        m.lean_mass_kg != null ? `lean ${m.lean_mass_kg}` : null,
        m.fat_percent != null ? `${m.fat_percent}% fat` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `<section class="card" ${surfaceMarker()}>
        <h2>${escapeHtml(m.measured_on)}</h2>
        <p class="muted">${escapeHtml(bits || "—")}</p>
      </section>`;
    })
    .join("");
}

// —— blind spot ——
type TBlindSpotExercise = {
  name: string;
  hasStall?: boolean;
  color?: string;
  weight?: number;
  trend?: number[];
};

function renderBlindSpot(data: { exercises: TBlindSpotExercise[] }) {
  titleEl.textContent = "Blind spot analysis";
  const exercises = data.exercises ?? [];
  const stalls = exercises.filter((e) => e.hasStall).length;
  metaEl.textContent = `${exercises.length} exercises with history · ${stalls} stalling`;
  chromeActions.innerHTML = "";
  if (exercises.length === 0) {
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>No exercise history yet.</p>`;
    return;
  }
  bodyEl.innerHTML = exercises
    .slice(0, 40)
    .map((ex) => {
      const stalling = Boolean(ex.hasStall);
      const pill = stalling
        ? `<span class="pill warn">stall</span>`
        : `<span class="pill ok">${escapeHtml(ex.color ?? "ok")}</span>`;
      const detail =
        ex.weight != null ? `Peak ${ex.weight} lb` : "";
      return `<section class="card" ${surfaceMarker()}>
        <h2>${escapeHtml(ex.name)}${pill}</h2>
        ${detail ? `<p class="muted">${escapeHtml(detail)}</p>` : ""}
      </section>`;
    })
    .join("");
}

function dispatch(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    showError("No data");
    return;
  }
  const obj = payload as Record<string, unknown>;
  switch (SURFACE) {
    case "overview":
      if (!("routines" in obj) || !("id" in obj)) {
        showError("Expected Program overview payload from read_program");
        return;
      }
      renderOverview(obj as TOverviewProgram);
      return;
    case "statistics":
      if (!("buckets" in obj) && !("weeks" in obj)) {
        showError("Expected statistics payload");
        return;
      }
      renderStatistics(obj as TStats);
      return;
    case "calendar":
      if (!("year" in obj) || !("month" in obj)) {
        showError("Expected calendar payload");
        return;
      }
      renderCalendar(obj as TCalendar);
      return;
    case "workouts":
      if (!("workouts" in obj)) {
        showError("Expected workout browse payload");
        return;
      }
      renderWorkouts(obj as { workouts: TBrowseWorkout[]; next_cursor: null });
      return;
    case "measurements":
      if (!("measurements" in obj)) {
        showError("Expected measurements payload");
        return;
      }
      renderMeasurements(obj as { measurements: TMeasurement[] });
      return;
    case "blind-spot":
      if (!("exercises" in obj)) {
        showError("Expected blind spot payload");
        return;
      }
      renderBlindSpot(obj as { exercises: TBlindSpotExercise[] });
      return;
    default:
      showError(`Unknown surface: ${SURFACE}`);
  }
}

const app = new App({ name: `Proxima ${surfaceTitle()}`, version: "0.1.0" });

app.ontoolresult = (result: TToolResult) => {
  const payload = fromResult(result);
  if (!payload) {
    showError("No data");
    return;
  }
  dispatch(payload);
};

app.onerror = console.error;
void app.connect();
