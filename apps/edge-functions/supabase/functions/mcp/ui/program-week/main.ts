import { App } from "./app-with-deps.js";

type TSet = {
  index: number;
  type: string;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
  rep_range: { start: number; end: number } | null;
};

type TExercise = {
  index: number;
  title: string;
  notes: string;
  rest_seconds: string | null;
  exercise_template_id: string;
  supersets_id: number | null;
  sets: TSet[];
};

type TDay = {
  id: string;
  title: string;
  folder_id: number;
  notes: string;
  order: string;
  exercises: TExercise[];
};

type TWeekPayload = {
  program_id: number;
  title: string;
  week_index: number;
  week_count: number;
  builder_routines: TDay[];
  pending_proposal: boolean;
  pending_op_count: number;
};

const titleEl = document.getElementById("title")!;
const metaEl = document.getElementById("meta")!;
const daysEl = document.getElementById("days")!;
const bannerEl = document.getElementById("banner")!;
const prevBtn = document.getElementById("prev") as HTMLButtonElement;
const nextBtn = document.getElementById("next") as HTMLButtonElement;
const acceptBtn = document.getElementById("accept") as HTMLButtonElement;
const discardBtn = document.getElementById("discard") as HTMLButtonElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;

let programId = 0;
let title = "";
let weekIndex = 0;
let weekCount = 0;
let builder: TDay[] = [];
let pending = false;
let pendingOpCount = 0;
let dirty = false;
let busy = false;

function weekIndices(routines: readonly TDay[]): number[] {
  const set = new Set<number>();
  for (const day of routines) {
    if (Number.isInteger(day.folder_id) && day.folder_id >= 0) {
      set.add(day.folder_id);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function clampWeek(requested: number, count: number): number {
  if (count <= 0) return 0;
  if (requested < 0) return 0;
  if (requested >= count) return count - 1;
  return requested;
}

function daysThisWeek(): TDay[] {
  const indices = weekIndices(builder);
  if (indices.length === 0) return [];
  const folderId = indices[clampWeek(weekIndex, indices.length)]!;
  return builder
    .filter((day) => day.folder_id === folderId)
    .slice()
    .sort((a, b) => Number(a.order) - Number(b.order));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showBanner(
  kind: "pending" | "err" | "ok" | "hidden",
  text = "",
) {
  if (kind === "hidden" || !text) {
    bannerEl.hidden = true;
    bannerEl.textContent = "";
    bannerEl.className = "banner";
    return;
  }
  bannerEl.hidden = false;
  bannerEl.className = `banner ${kind}`;
  bannerEl.textContent = text;
}

function syncChrome() {
  titleEl.textContent = title || `Program ${programId}`;
  metaEl.textContent =
    weekCount === 0
      ? "No weeks in this Program prescription"
      : `Week ${weekIndex + 1} of ${weekCount}${dirty ? " · unsaved" : ""}`;
  prevBtn.disabled = busy || weekIndex <= 0 || weekCount === 0;
  nextBtn.disabled = busy || weekCount === 0 || weekIndex >= weekCount - 1;
  acceptBtn.disabled = busy || !pending;
  discardBtn.disabled = busy || !pending;
  saveBtn.disabled = busy || builder.length === 0;

  // Don't clobber an err/ok banner while buttons refresh.
  if (pending && !bannerEl.classList.contains("err") && !bannerEl.classList.contains("ok")) {
    showBanner(
      "pending",
      `Mutation proposal pending (${pendingOpCount} op${pendingOpCount === 1 ? "" : "s"}). Accept applies to builder; Save writes the prescription.`,
    );
  }
}

function renderDays() {
  const days = daysThisWeek();
  if (weekCount === 0 || days.length === 0) {
    daysEl.innerHTML = `<p class="empty">No days this week.</p>`;
    return;
  }

  daysEl.innerHTML = days
    .map((day) => {
      const exercises =
        day.exercises.length === 0
          ? `<p class="empty">No exercises</p>`
          : day.exercises
              .map((ex, ei) => {
                const rows = ex.sets
                  .map((set, si) => {
                    const reps =
                      set.rep_range != null
                        ? `${set.rep_range.start}–${set.rep_range.end}`
                        : (set.reps ?? "");
                    const repsInput =
                      set.rep_range != null
                        ? `<td>${escapeHtml(String(reps))}</td>`
                        : `<td><input data-day="${escapeHtml(day.id)}" data-ex="${ei}" data-set="${si}" data-field="reps" type="number" inputmode="numeric" value="${set.reps ?? ""}" /></td>`;
                    return `<tr>
                      <td>${si + 1}</td>
                      ${repsInput}
                      <td><input data-day="${escapeHtml(day.id)}" data-ex="${ei}" data-set="${si}" data-field="weight_kg" type="number" inputmode="decimal" step="any" value="${set.weight_kg ?? ""}" /></td>
                      <td><input data-day="${escapeHtml(day.id)}" data-ex="${ei}" data-set="${si}" data-field="rpe" type="number" inputmode="decimal" step="any" value="${set.rpe ?? ""}" /></td>
                    </tr>`;
                  })
                  .join("");
                return `<div class="ex">
                  <p class="ex-title">${escapeHtml(ex.title)}</p>
                  <table class="sets">
                    <thead><tr><th>#</th><th>Reps</th><th>kg</th><th>RPE</th></tr></thead>
                    <tbody>${rows}</tbody>
                  </table>
                </div>`;
              })
              .join("");
      return `<section class="day"><h2>${escapeHtml(day.title)}</h2>${exercises}</section>`;
    })
    .join("");
}

function applyPayload(payload: TWeekPayload) {
  programId = payload.program_id;
  title = payload.title;
  weekIndex = payload.week_index;
  weekCount = payload.week_count;
  builder = payload.builder_routines ?? [];
  pending = Boolean(payload.pending_proposal);
  pendingOpCount = payload.pending_op_count ?? 0;
  dirty = false;
  syncChrome();
  renderDays();
}

function fromResult(result: {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}): TWeekPayload | null {
  if (result.isError) return null;
  const structured = result.structuredContent;
  if (structured && typeof structured === "object") {
    return structured as TWeekPayload;
  }
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text) as TWeekPayload;
  } catch {
    return null;
  }
}

function toolError(result: {
  isError?: boolean;
  content?: Array<{ type: string; text?: string }>;
}): string | null {
  if (!result.isError) return null;
  return result.content?.find((c) => c.type === "text")?.text ?? "Request failed";
}

function parseNum(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function patchSet(
  dayId: string,
  exerciseIndex: number,
  setIndex: number,
  field: "reps" | "weight_kg" | "rpe",
  value: number | null,
) {
  builder = builder.map((day) => {
    if (day.id !== dayId) return day;
    return {
      ...day,
      exercises: day.exercises.map((exercise, ei) => {
        if (ei !== exerciseIndex) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set, si) => {
            if (si !== setIndex) return set;
            return { ...set, [field]: value };
          }),
        };
      }),
    };
  });
  dirty = true;
  if (!pending) showBanner("hidden");
  syncChrome();
}

daysEl.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const dayId = target.dataset.day;
  const ex = Number(target.dataset.ex);
  const set = Number(target.dataset.set);
  const field = target.dataset.field;
  if (!dayId || !Number.isInteger(ex) || !Number.isInteger(set)) return;
  if (field !== "reps" && field !== "weight_kg" && field !== "rpe") return;
  patchSet(dayId, ex, set, field, parseNum(target.value));
});

function pageLocal(delta: number) {
  weekIndex = clampWeek(weekIndex + delta, weekCount);
  syncChrome();
  renderDays();
}

async function callTool(name: string, args: Record<string, unknown>) {
  return app.callServerTool({ name, arguments: args });
}

async function onAccept() {
  if (!pending || busy) return;
  busy = true;
  syncChrome();
  try {
    const result = await callTool("accept_program_mutation", {
      program_id: programId,
      builder_routines: builder,
    });
    const err = toolError(result);
    if (err) {
      showBanner("err", err);
      return;
    }
    const structured = result.structuredContent as {
      builder_routines?: TDay[];
    } | null;
    if (structured?.builder_routines) {
      builder = structured.builder_routines;
      weekCount = weekIndices(builder).length;
      weekIndex = clampWeek(weekIndex, weekCount);
    }
    pending = false;
    pendingOpCount = 0;
    dirty = true;
    showBanner("ok", "Accepted into builder. Save to write the Program prescription.");
    renderDays();
  } catch (error) {
    showBanner("err", String(error));
  } finally {
    busy = false;
    syncChrome();
  }
}

async function onDiscard() {
  if (!pending || busy) return;
  busy = true;
  syncChrome();
  try {
    const result = await callTool("reject_program_mutation", {
      program_id: programId,
    });
    const err = toolError(result);
    if (err) {
      showBanner("err", err);
      return;
    }
    pending = false;
    pendingOpCount = 0;
    showBanner("ok", "Discarded Mutation proposal.");
  } catch (error) {
    showBanner("err", String(error));
  } finally {
    busy = false;
    syncChrome();
  }
}

async function onSave() {
  if (busy || builder.length === 0) return;
  busy = true;
  syncChrome();
  try {
    const result = await callTool("save_program", {
      program_id: programId,
      builder_routines: builder,
    });
    const err = toolError(result);
    if (err) {
      showBanner("err", err);
      return;
    }
    dirty = false;
    showBanner("ok", "Saved. Program prescription updated.");
  } catch (error) {
    showBanner("err", String(error));
  } finally {
    busy = false;
    syncChrome();
  }
}

const app = new App({ name: "Proxima program week", version: "0.2.0" });

app.ontoolresult = (result) => {
  const payload = fromResult(result);
  if (!payload) {
    titleEl.textContent = "Program week";
    daysEl.innerHTML = `<p class="err">No week data</p>`;
    return;
  }
  applyPayload(payload);
};

app.onerror = console.error;

prevBtn.addEventListener("click", () => pageLocal(-1));
nextBtn.addEventListener("click", () => pageLocal(1));
acceptBtn.addEventListener("click", () => void onAccept());
discardBtn.addEventListener("click", () => void onDiscard());
saveBtn.addEventListener("click", () => void onSave());

void app.connect();
