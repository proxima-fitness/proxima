// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Composable athlete MCP Apps — one surface per bundle (ADR 0034 / 12).
 * Build injects __SURFACE__ (overview | statistics | calendar | workouts | measurements | blind-spot).
 * Markup/CSS clones glanceable profile chrome from apps/landing.
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
  chromeActions.innerHTML = "";
  bodyEl.innerHTML = `<p class="err">${escapeHtml(message)}</p>`;
}

function surfaceTitle(): string {
  switch (SURFACE) {
    case "overview":
      return "Program overview";
    case "statistics":
      return "Statistics";
    case "calendar":
      return "Calendar";
    case "workouts":
      return "Recent workouts";
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

let overviewState: {
  program: TOverviewProgram;
  weeks: Map<number, TOverviewRoutine[]>;
  selected: number;
} | null = null;

function renderOverviewWeekBody(weekIndex: number, days: TOverviewRoutine[]) {
  const ordered = days.slice().sort((a, b) => Number(a.order) - Number(b.order));
  if (ordered.length === 0) {
    return `<p class="empty" ${surfaceMarker()}>No days this week.</p>`;
  }
  return ordered
    .map((day) => {
      const exCount = day.exercises?.length ?? 0;
      const exLines = (day.exercises ?? [])
        .slice(0, 4)
        .map((ex) => {
          const title =
            ex && typeof ex === "object" && "title" in ex
              ? String((ex as { title?: string }).title ?? "Exercise")
              : "Exercise";
          return `<div class="ex-row"><div><div class="title">${escapeHtml(title)}</div></div></div>`;
        })
        .join("");
      const more =
        exCount > 4
          ? `<p class="empty">+${exCount - 4} more exercise${exCount - 4 === 1 ? "" : "s"}</p>`
          : "";
      return `<div class="day-block" ${surfaceMarker()}>
        <h2 class="day-title">${escapeHtml(day.title)}</h2>
        <p class="sub muted" style="margin:0 0 4px;font-size:12px">${exCount} exercise${exCount === 1 ? "" : "s"}</p>
        ${exLines}${more}
      </div>`;
    })
    .join("");
}

function paintOverview() {
  if (!overviewState) return;
  const { program, weeks, selected } = overviewState;
  const sorted = [...weeks.keys()].sort((a, b) => a - b);
  const chips = sorted
    .map((weekIndex) => {
      const selectedAttr = weekIndex === selected ? ' aria-selected="true"' : "";
      return `<button type="button" class="week-chip" data-week="${weekIndex}"${selectedAttr}>Week ${weekIndex + 1}</button>`;
    })
    .join("");
  const days = weeks.get(selected) ?? [];
  bodyEl.innerHTML = `
    <div class="week-chip-row" ${surfaceMarker()}>${chips}</div>
    ${renderOverviewWeekBody(selected, days)}`;
  bodyEl.querySelectorAll<HTMLButtonElement>(".week-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      overviewState = {
        ...overviewState!,
        selected: Number(btn.dataset.week),
      };
      paintOverview();
    });
  });
}

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

  if (weeks.size === 0) {
    overviewState = null;
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>Empty prescription.</p>`;
    return;
  }
  overviewState = {
    program,
    weeks,
    selected: [...weeks.keys()].sort((a, b) => a - b)[0]!,
  };
  paintOverview();
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

type TMetric = "duration" | "reps" | "volume";

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

function weekBucketLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return weekStart.slice(5);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function metricValue(bucket: TStatsBucket, metric: TMetric): number {
  if (metric === "duration") return bucket.durationSeconds;
  if (metric === "volume") return bucket.volumeKg;
  return bucket.reps;
}

function formatMetric(value: number, metric: TMetric): string {
  if (metric === "duration") return formatDuration(value);
  if (metric === "volume") return `${Math.round(value)} kg`;
  return value === 1 ? "1" : String(value);
}

function renderBars(buckets: TStatsBucket[], metric: TMetric): string {
  const values = buckets.map((b) => metricValue(b, metric));
  const peak = maxOf(values) || 1;
  const cols = buckets
    .map((bucket, i) => {
      const v = values[i] ?? 0;
      const pct = v > 0 ? Math.max(4, Math.round((v / peak) * 100)) : 0;
      const current = i === buckets.length - 1 ? " current" : "";
      const label = weekBucketLabel(bucket.weekStart);
      return `<div class="bar-col" title="${escapeHtml(label)}: ${escapeHtml(formatMetric(v, metric))}">
        <div class="bar-track"><div class="bar${current}" style="height:${pct}%"></div></div>
        <span class="bar-label">${escapeHtml(label)}</span>
      </div>`;
    })
    .join("");
  return `<div class="bars" role="img" aria-label="Weekly ${metric} bar chart">${cols}</div>`;
}

let statsState: { stats: TStats; metric: TMetric } | null = null;

function paintStatistics() {
  if (!statsState) return;
  const { stats, metric } = statsState;
  const buckets = stats.buckets ?? [];
  const thisWeek = stats.thisWeek;
  const headline =
    metric === "duration"
      ? formatDuration(thisWeek?.durationSeconds ?? 0)
      : metric === "volume"
        ? `${Math.round(thisWeek?.volumeKg ?? 0)} kg`
        : String(thisWeek?.reps ?? 0);

  const tabs: TMetric[] = ["duration", "reps", "volume"];
  const tabHtml = tabs
    .map((m) => {
      const label = m === "duration" ? "Duration" : m === "reps" ? "Reps" : "Volume";
      return `<button type="button" class="tab" role="tab" data-metric="${m}" aria-selected="${m === metric}">${label}</button>`;
    })
    .join("");

  bodyEl.innerHTML = `
    <div ${surfaceMarker()}>
      <div class="stat-head">
        <div>
          <p class="stat-label">This week</p>
          <p class="stat-value">${escapeHtml(headline)}</p>
        </div>
        <div class="tablist" role="tablist" aria-label="Statistics metric">${tabHtml}</div>
      </div>
      ${renderBars(buckets, metric)}
    </div>`;

  bodyEl.querySelectorAll<HTMLButtonElement>("[data-metric]").forEach((btn) => {
    btn.addEventListener("click", () => {
      statsState = { stats, metric: btn.dataset.metric as TMetric };
      paintStatistics();
    });
  });
}

function renderStatistics(stats: TStats) {
  titleEl.textContent = "Statistics";
  const buckets = stats.buckets ?? [];
  metaEl.textContent = [
    `Weekly totals from your backed-up workouts · ${stats.weeks ?? buckets.length}-week window`,
    stats.weekStreak != null ? `streak ${stats.weekStreak}` : null,
    stats.avgWorkoutsPerWeek != null
      ? `avg ${stats.avgWorkoutsPerWeek.toFixed(1)}/wk`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  chromeActions.innerHTML = "";
  statsState = { stats, metric: "duration" };
  paintStatistics();
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
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
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

function todayKeyUtc(): string {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
}

function renderCalendar(cal: TCalendar) {
  titleEl.textContent = "Calendar";
  metaEl.textContent = `${(cal.workouts ?? []).length} workout${(cal.workouts ?? []).length === 1 ? "" : "s"} this month`;
  chromeActions.innerHTML = `
    <div class="cal-nav">
      <button type="button" class="ghost" id="cal-prev" aria-label="Previous month">‹</button>
      <span class="cal-month">${escapeHtml(monthLabel(cal.year, cal.month))}</span>
      <button type="button" class="ghost" id="cal-next" aria-label="Next month">›</button>
    </div>`;

  const hit = new Set(Object.keys(cal.days ?? {}));
  const today = todayKeyUtc();
  const dow = ["S", "M", "T", "W", "T", "F", "S"]
    .map((d) => `<span>${d}</span>`)
    .join("");
  const cells = buildGrid(cal.year, cal.month)
    .map((cell) => {
      if (!cell.inMonth) return `<div class="cell out"></div>`;
      const classes = ["cell"];
      if (hit.has(cell.key)) classes.push("hit");
      if (cell.key === today) classes.push("today");
      return `<div class="${classes.join(" ")}">${cell.day}</div>`;
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
    <div ${surfaceMarker()}>
      <div class="cal-dow">${dow}</div>
      <div class="cal">${cells}</div>
      <div class="day-list">${dayList || '<p class="empty">No workouts this month.</p>'}</div>
    </div>`;

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
  exercises?: { title: string; sets?: unknown[] }[];
};

function renderWorkouts(data: {
  workouts: TBrowseWorkout[];
  next_cursor: { started_at: string; id: string } | null;
}) {
  titleEl.textContent = "Recent workouts";
  const workouts = data.workouts ?? [];
  metaEl.textContent = "Your backed-up workouts.";
  chromeActions.innerHTML = data.next_cursor
    ? `<button type="button" id="load-more">Load more</button>`
    : "";

  if (workouts.length === 0) {
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>No backed-up workouts yet.</p>`;
    return;
  }

  bodyEl.innerHTML = workouts
    .map((w) => {
      const when = w.started_at
        ? new Date(w.started_at).toLocaleString()
        : "";
      const exercises = w.exercises ?? [];
      const lines = exercises
        .slice(0, 8)
        .map((e) => {
          const setCount = Array.isArray(e.sets) ? e.sets.length : 0;
          return `<div class="ex-line">
            <span class="name">${escapeHtml(e.title)}</span>
            <span class="muted">${setCount > 0 ? `${setCount} sets` : ""}</span>
          </div>`;
        })
        .join("");
      const more =
        exercises.length > 8
          ? `<p class="empty" style="padding:6px">+${exercises.length - 8} more</p>`
          : "";
      return `<section class="day-card" ${surfaceMarker()}>
        <h2>${escapeHtml(w.title || "Workout")}</h2>
        <p class="when">${escapeHtml(when)}</p>
        <div class="colhead"><span>Exercise</span><div class="metrics"><span>Sets</span></div></div>
        ${lines || '<p class="empty" style="padding:8px 6px">No exercises</p>'}${more}
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

function measurementRows(m: TMeasurement): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (m.weight_kg != null) rows.push({ label: "Weight", value: `${m.weight_kg} kg` });
  if (m.lean_mass_kg != null) rows.push({ label: "Lean mass", value: `${m.lean_mass_kg} kg` });
  if (m.fat_percent != null) rows.push({ label: "Body fat", value: `${m.fat_percent}%` });
  return rows;
}

function renderMeasurements(data: { measurements: TMeasurement[] }) {
  titleEl.textContent = "Body measurements";
  const rows = data.measurements ?? [];
  metaEl.textContent = "From your backup (metric storage).";
  chromeActions.innerHTML = "";
  if (rows.length === 0) {
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>No body measurements yet.</p>`;
    return;
  }
  const [latest, ...rest] = rows;
  const latestRows = measurementRows(latest!);
  const latestHtml = `
    <p class="inset-caption">Latest · ${escapeHtml(latest!.measured_on)}</p>
    <div class="inset" ${surfaceMarker()}>
      ${
        latestRows.length === 0
          ? `<div class="inset-row"><span class="label">No metrics</span><span class="value">—</span></div>`
          : latestRows
              .map(
                (r) =>
                  `<div class="inset-row"><span class="label">${escapeHtml(r.label)}</span><span class="value">${escapeHtml(r.value)}</span></div>`,
              )
              .join("")
      }
    </div>`;
  const historyHtml =
    rest.length === 0
      ? ""
      : `<p class="inset-caption">Recent history</p>
        <div class="inset" ${surfaceMarker()}>
          ${rest
            .map((m) => {
              const bits = measurementRows(m)
                .map((r) => r.value)
                .join(" · ");
              return `<div class="inset-row"><span class="label">${escapeHtml(m.measured_on)}</span><span class="value">${escapeHtml(bits || "—")}</span></div>`;
            })
            .join("")}
        </div>`;
  bodyEl.innerHTML = latestHtml + historyHtml;
}

// —— blind spot ——
type TBlindSpotExercise = {
  name: string;
  hasStall?: boolean;
  color?: string;
  weight?: number;
  trend?: number[];
};

const STATUS_INK: Record<string, string> = {
  green: "#5B8F6E",
  yellow: "#C4A35A",
  red: "#C47A74",
};

function statusInk(color: string | undefined): string {
  return STATUS_INK[color ?? ""] ?? "var(--muted-foreground)";
}

function miniTrend(trend: number[] | undefined, color: string): string {
  if (!trend || trend.length < 2) return "";
  const maxValue = Math.max(...trend);
  const minValue = Math.min(...trend);
  const range = maxValue - minValue || 1;
  const width = 60;
  const height = 30;
  const padding = 4;
  const points = trend
    .map((value, index) => {
      const x = padding + (index / (trend.length - 1 || 1)) * (width - 2 * padding);
      const y =
        height - padding - ((value - minValue) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");
  return `<svg width="${width}" height="${height}" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${escapeHtml(color)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderBlindSpot(data: { exercises: TBlindSpotExercise[] }) {
  titleEl.textContent = "Blind spot analysis";
  const exercises = data.exercises ?? [];
  const stalls = exercises.filter((e) => e.hasStall).length;
  metaEl.textContent = `Last 15 workouts · ${exercises.length} exercises · ${stalls} stalling`;
  chromeActions.innerHTML = "";
  if (exercises.length === 0) {
    bodyEl.innerHTML = `<p class="empty" ${surfaceMarker()}>No exercise history yet.</p>`;
    return;
  }
  bodyEl.innerHTML = `<div class="stall-grid" ${surfaceMarker()}>${exercises
    .slice(0, 40)
    .map((ex) => {
      const ink = statusInk(ex.color);
      const weight =
        ex.weight != null && ex.weight > 0
          ? `<div class="stall-weight">${escapeHtml(String(ex.weight))} lb</div>`
          : `<div class="stall-weight" style="font-size:12px;font-weight:500">No data</div>`;
      const footer = ex.hasStall
        ? `<div class="stall-footer"><span aria-hidden="true">⚠</span> Stall detected</div>`
        : "";
      return `<section class="stall-card">
        <span class="rail" style="background:${escapeHtml(ink)}"></span>
        <div class="stall-top">
          <div class="stall-name-row">
            <span class="stall-dot" style="background:${escapeHtml(ink)}"></span>
            <div style="min-width:0">
              <div class="stall-name">${escapeHtml(ex.name)}</div>
              ${weight}
            </div>
          </div>
          ${miniTrend(ex.trend, ink)}
        </div>
        ${footer}
      </section>`;
    })
    .join("")}</div>`;
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
