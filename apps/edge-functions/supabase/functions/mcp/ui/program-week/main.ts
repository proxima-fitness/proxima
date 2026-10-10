import { App } from "./app-with-deps.js";

type TDayPlace = {
  title: string;
  order: string;
  exercise_count: number;
  exercises: Array<{ title: string; set_count: number }>;
};

type TWeekPayload = {
  program_id: number;
  title: string;
  week_index: number;
  week_count: number;
  days: TDayPlace[];
};

const titleEl = document.getElementById("title")!;
const metaEl = document.getElementById("meta")!;
const daysEl = document.getElementById("days")!;
const prevBtn = document.getElementById("prev") as HTMLButtonElement;
const nextBtn = document.getElementById("next") as HTMLButtonElement;

let current: TWeekPayload | null = null;

function render(payload: TWeekPayload) {
  current = payload;
  titleEl.textContent = payload.title || `Program ${payload.program_id}`;
  metaEl.textContent =
    payload.week_count === 0
      ? "No weeks in this Program prescription"
      : `Week ${payload.week_index + 1} of ${payload.week_count}`;
  prevBtn.disabled = payload.week_index <= 0 || payload.week_count === 0;
  nextBtn.disabled =
    payload.week_count === 0 || payload.week_index >= payload.week_count - 1;

  if (payload.days.length === 0) {
    daysEl.innerHTML = `<p class="empty">No days this week (placeholder shell).</p>`;
    return;
  }

  daysEl.innerHTML = payload.days
    .map((day) => {
      const lines =
        day.exercises.length === 0
          ? `<div class="ex">No exercises</div>`
          : day.exercises
              .map(
                (ex) =>
                  `<div class="ex">${escapeHtml(ex.title)} · ${ex.set_count} sets</div>`,
              )
              .join("");
      return `<section class="day"><h2>${escapeHtml(day.title)}</h2>${lines}</section>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

async function go(weekIndex: number) {
  if (!current) return;
  daysEl.innerHTML = `<p class="empty">Loading week ${weekIndex + 1}…</p>`;
  try {
    const result = await app.callServerTool({
      name: "show_program_week",
      arguments: {
        program_id: current.program_id,
        week_index: weekIndex,
      },
    });
    const payload = fromResult(result);
    if (!payload) {
      daysEl.innerHTML = `<p class="err">Could not load week</p>`;
      return;
    }
    render(payload);
  } catch (error) {
    daysEl.innerHTML = `<p class="err">${escapeHtml(String(error))}</p>`;
  }
}

const app = new App({ name: "Proxima program week", version: "0.1.0" });

app.ontoolresult = (result) => {
  const payload = fromResult(result);
  if (!payload) {
    titleEl.textContent = "Program week";
    daysEl.innerHTML = `<p class="err">No week data</p>`;
    return;
  }
  render(payload);
};

app.onerror = console.error;

prevBtn.addEventListener("click", () => {
  if (current) void go(current.week_index - 1);
});
nextBtn.addEventListener("click", () => {
  if (current) void go(current.week_index + 1);
});

void app.connect();
