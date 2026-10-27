/**
 * Core scheduling engine — pure functions, no React, fully testable.
 *
 * A dish is a list of stages:
 *   { action: 'add' | <instruction text>, minutes: number }
 *
 * Stage semantics:
 *   - The FIRST stage of a dish must be `add` — it marks when the food goes in.
 *   - Every stage lasts `minutes`; when a stage ends its action fires
 *     ("stir", "flip", "reduce heat"…), except the last stage which is
 *     the dish completing (done / rest).
 *
 * The plan is built by anchoring every dish's LAST stage to finish at t=0
 * (serving time) and working backwards. Earlier stages therefore land at
 * negative offsets from serving; the schedule converts them into absolute
 * seconds-from-start so the whole session begins with "put the longest
 * dish in" and everything still finishes together.
 */

export const ADD = 'add';
export const DONE_ACTIONS = new Set(['done', 'rest']);

let seq = 0;
export const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

const clampMinutes = (m) => Math.min(600, Math.max(0, Number(m) || 0));

const DEFAULT_ACTION = { mid: 'Flip / stir', last: 'Rest' };

/** Normalise raw user input into a valid dish object. */
export function makeDish({ name = '', stages = [], id = uid() }) {
  const cleaned = stages
    .map((s, i) => ({
      action: String(s.action ?? '').trim(),
      minutes: clampMinutes(s.minutes),
    }))
    // Drop empty/zero rows, but always keep the first stage of a dish.
    .filter((s, i) => (i === 0 ? true : s.minutes > 0));

  const last = cleaned.length - 1;
  cleaned.forEach((s, i) => {
    if (i === 0) s.action = ADD;
    else if (!s.action) s.action = i === last ? DEFAULT_ACTION.last : DEFAULT_ACTION.mid;
  });

  return { id, name: String(name).trim(), stages: cleaned };
}

export function totalMinutes(dish) {
  return dish.stages.reduce((sum, s) => sum + s.minutes, 0);
}

/**
 * Build the full event schedule.
 * @param {Array} dishes – validated dishes (each has ≥1 stage).
 * @returns {{ events: Array, durationSec: number, dishMeta: Map }}
 *   events: [{ id, dishId, dishName, atSec, type, instruction, remainingForDish }]
 *   sorted ascending by atSec. type ∈ 'add' | 'action' | 'done'
 */
export function buildSchedule(dishes) {
  const durations = dishes.map(totalMinutes);
  const maxDuration = durations.length ? Math.max(...durations) : 0;

  const events = [];
  const dishMeta = new Map();

  // Longest-cook dishes first so the plan reads top-to-bottom in start order.
  const ordered = dishes
    .map((dish, i) => ({ dish, di: i }))
    .sort((a, b) => (durations[b.di] - durations[a.di]) || a.dish.name.localeCompare(b.dish.name));

  ordered.forEach(({ dish, di }) => {
    // Offset (in minutes) between session start and this dish's first stage.
    const startOffset = maxDuration - durations[di];
    let cursor = startOffset; // minutes into the session for the current stage start
    let remaining = durations[di];

    dish.stages.forEach((stage, si) => {
      remaining -= stage.minutes;
      const isLast = si === dish.stages.length - 1;
      const atSec = Math.round(cursor * 60);

      let type;
      if (si === 0) type = ADD;
      else if (isLast && DONE_ACTIONS.has(stage.action.toLowerCase())) type = 'done';
      else if (isLast) type = 'action'; // e.g. "rest" — a step you must perform, not the finish
      else type = 'action';

      events.push({
        id: `${dish.id}-${si}`,
        dishId: dish.id,
        dishName: dish.name,
        atSec,
        type,
        instruction: type === ADD ? 'Put in the pan' : stage.action,
        remainingForDish: Math.max(0, Math.round(remaining * 60)),
      });

      cursor += stage.minutes;
    });

    dishMeta.set(dish.id, {
      startSec: Math.round(startOffset * 60),
      finishSec: Math.round((startOffset + durations[di]) * 60),
      totalSec: Math.round(durations[di] * 60),
    });
  });

  // Stable sort keeps same-second events in dish start order.
  events.sort((a, b) => a.atSec - b.atSec);

  return {
    events,
    durationSec: Math.round(maxDuration * 60),
    dishMeta,
  };
}

/** Next pending event at or after `nowSec`. */
export function nextEvent(events, firedIds, nowSec) {
  return events.find((e) => !firedIds.has(e.id) && e.atSec >= nowSec - 0.001) || null;
}

/* ---------- formatting helpers ---------- */

export function formatClock(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(min) {
  min = Math.round(min);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTimeOfDay(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
