import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSchedule } from '../lib/schedule';
import { playChime } from '../lib/audio';
import { pushNotification } from '../lib/notify';

/**
 * Owns everything about a live cooking session: a monotonic clock, the
 * derived schedule, fired/pending events and alert state. Ticks off a
 * wall-clock start timestamp (not decremented counters) so throttled
 * background tabs catch up without drift.
 */
export default function useCookingSession(dishes) {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [nowSec, setNowSec] = useState(0);

  const startRef = useRef(0); // epoch ms of session start (adjusted on pause)
  const pauseAtRef = useRef(0);
  const firedRef = useRef(new Set());
  const [firedIds, setFiredIds] = useState(() => new Set());
  const [alerts, setAlerts] = useState([]); // queue of events needing acknowledgement

  const schedule = useMemo(() => buildSchedule(dishes), [dishes]);
  const { events, durationSec } = schedule;

  const acknowledge = useCallback((id) => {
    firedRef.current.add(id);
    setFiredIds(new Set(firedRef.current));
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const acknowledgeAll = useCallback(() => {
    setAlerts((prev) => {
      prev.forEach((a) => firedRef.current.add(a.id));
      setFiredIds(new Set(firedRef.current));
      return [];
    });
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setPaused(false);
    setAlerts([]);
    firedRef.current = new Set();
    setFiredIds(new Set());
    setNowSec(0);
  }, []);

  const start = useCallback(() => {
    firedRef.current = new Set();
    setFiredIds(new Set());
    setAlerts([]);
    startRef.current = Date.now();
    setPaused(false);
    setNowSec(0);
    setRunning(true);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (!p) {
        pauseAtRef.current = Date.now();
        return true;
      }
      startRef.current += Date.now() - pauseAtRef.current; // shift timeline past the gap
      return false;
    });
  }, []);

  // The one and only interval for the whole app.
  useEffect(() => {
    if (!running || paused) return undefined;
    const tick = () => setNowSec(Math.max(0, (Date.now() - startRef.current) / 1000));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [running, paused]);

  // Fire due events whenever the clock advances (catches up after tab throttling).
  useEffect(() => {
    if (!running || paused) return;
    const due = events.filter((e) => !firedRef.current.has(e.id) && e.atSec <= nowSec);
    if (!due.length) return;

    due.forEach((e) => firedRef.current.add(e.id));
    setFiredIds(new Set(firedRef.current));
    setAlerts((prev) => [...prev, ...due]);

    const primary = due[due.length - 1];
    playChime(primary.type);
    pushNotification(
      primary.type === 'add'
        ? `Put in: ${primary.dishName}`
        : primary.type === 'done'
          ? `${primary.dishName} is ready!`
          : `${primary.dishName}: ${primary.instruction}`,
      primary.remainingForDish > 0 ? `${Math.round(primary.remainingForDish / 60)} min remaining` : ''
    );
  }, [nowSec, running, paused, events]);

  // Session finished: every event acknowledged and we're at/past the end.
  const complete =
    running && alerts.length === 0 && events.length > 0 && events.every((e) => firedIds.has(e.id));

  return {
    schedule,
    running,
    paused,
    complete,
    nowSec,
    durationSec,
    firedIds,
    alerts,
    start,
    stop,
    togglePause,
    acknowledge,
    acknowledgeAll,
  };
}
