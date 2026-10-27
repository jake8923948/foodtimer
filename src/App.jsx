import React, { useCallback, useMemo, useState } from 'react';
import DishForm from './components/DishForm';
import DishCard from './components/DishCard';
import Timeline from './components/Timeline';
import AlertOverlay from './components/AlertOverlay';
import Icon from './components/Icon';
import useCookingSession from './hooks/useCookingSession';
import { primeAudio } from './lib/audio';
import { requestNotificationPermission } from './lib/notify';
import { formatClock, formatDuration, formatTimeOfDay } from './lib/schedule';

const STORAGE_KEY = 'mise.dishes.v2';

function loadDishes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [dishes, setDishes] = useState(loadDishes);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const persist = useCallback((next) => {
    setDishes(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full / private mode — plan still works in memory */
    }
  }, []);

  const session = useCookingSession(dishes);
  const { schedule, running, paused, nowSec, durationSec, alerts } = session;

  const nextUp = useMemo(() => {
    if (!running) return null;
    return schedule.events.find((e) => e.atSec > nowSec) || null;
  }, [running, schedule, nowSec]);

  const remainingSec = Math.max(0, durationSec - nowSec);
  const progress = durationSec > 0 ? Math.min(1, nowSec / durationSec) : 0;
  // Anchor the serve time when Start is pressed so the label doesn't drift each tick.
  const [serveAnchor, setServeAnchor] = useState(null);
  const serveAt = new Date((serveAnchor ?? Date.now()) + remainingSec * 1000);

  /* ---------- dish CRUD ---------- */
  const upsertDish = (dish) => {
    const exists = dishes.some((d) => d.id === dish.id);
    persist(exists ? dishes.map((d) => (d.id === dish.id ? dish : d)) : [...dishes, dish]);
    setEditingId(null);
  };
  const removeDish = (id) => persist(dishes.filter((d) => d.id !== id));

  /* ---------- session control ---------- */
  const handleStart = () => {
    primeAudio(); // unlock Web Audio inside the user gesture
    requestNotificationPermission();
    setServeAnchor(Date.now() + durationSec * 1000);
    session.start();
  };
  const handleFinish = () => {
    session.stop();
    persist([]);
  };

  /* ================= LIVE VIEW ================= */
  if (running) {
    return (
      <div className="app">
        <header className="topbar">
          <span className="brand small">
            <Icon name="flame" size={18} /> Mise
          </span>
          <span className="serve-eta">
            <Icon name="clock" size={15} /> Serves {formatTimeOfDay(serveAt)}
          </span>
          <button type="button" className="btn ghost" onClick={session.togglePause}>
            <Icon name={paused ? 'play' : 'pause'} size={16} /> {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btn danger-ghost" onClick={handleFinish}>
            <Icon name="stop" size={15} /> End
          </button>
        </header>

        <main className="live-main">
          {paused && <div className="paused-banner">Paused — timeline frozen</div>}

          <section className={`hero glass ${alerts.length ? 'ringing' : ''}`}>
            <svg className="progress-ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle className="ring-bg" cx="60" cy="60" r="54" />
              <circle
                className="ring-fg"
                cx="60"
                cy="60"
                r="54"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress)}`}
              />
            </svg>
            <div className="hero-inner">
              <span className="hero-label">{remainingSec <= 0 ? 'Service time' : 'Everything ready in'}</span>
              <time className="hero-clock">{formatClock(remainingSec)}</time>
              {nextUp ? (
                <p className="hero-next">
                  Next: <strong>{nextUp.dishName}</strong> — {nextUp.instruction} in{' '}
                  {formatClock(nextUp.atSec - nowSec)}
                </p>
              ) : (
                <p className="hero-next">Final steps underway…</p>
              )}
            </div>
          </section>

          <Timeline dishes={dishes} schedule={schedule} nowSec={nowSec} />

          <ol className="event-list">
            {schedule.events.map((e) => {
              const fired = e.atSec <= nowSec;
              return (
                <li key={e.id} className={`event ${fired ? 'past' : ''} type-${e.type}`}>
                  <span className="event-time">{formatClock(e.atSec)}</span>
                  <span className="event-body">
                    <strong>{e.dishName}</strong> · {e.instruction}
                  </span>
                  {fired && <Icon name="check" size={14} className="event-check" />}
                </li>
              );
            })}
          </ol>
        </main>

        <AlertOverlay
          alerts={alerts}
          onAcknowledge={session.acknowledge}
          onAcknowledgeAll={session.acknowledgeAll}
        />

        {session.complete && !alerts.length && (
          <div className="alert-overlay complete">
            <div className="alert-card glass type-done">
              <span className="alert-type">Bon appétit</span>
              <h2 className="alert-dish">Every dish is done at the same moment.</h2>
              <div className="alert-actions">
                <button type="button" className="btn primary big" onClick={handleFinish}>
                  Start a new plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= PLAN VIEW ================= */
  const editingDish = editingId ? dishes.find((d) => d.id === editingId) : null;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <Icon name="flame" size={22} className="brand-flame" /> Mise
        </span>
        <span className="tagline">everything done at once</span>
      </header>

      <main className="plan-main">
        <p className="intro">
          List each dish — including multi-stage steps like <em>“stir after 15 min”</em> — and Mise
          reverse-plans your kitchen so every plate lands hot at the same time.
        </p>

        <DishForm
          key={editingId ?? 'new'}
          initial={editingDish}
          onSubmit={upsertDish}
          onCancel={editingId ? () => setEditingId(null) : undefined}
          submitLabel={editingId ? 'Save changes' : 'Add dish'}
        />

        {dishes.length > 0 && (
          <>
            <h3 className="section-title">Your plan</h3>
            <ul className="dish-list">
              {dishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  meta={schedule.dishMeta.get(dish.id)}
                  expanded={expandedId === dish.id}
                  onToggle={() => setExpandedId(expandedId === dish.id ? null : dish.id)}
                  onEdit={() => setEditingId(dish.id)}
                  onRemove={() => removeDish(dish.id)}
                />
              ))}
            </ul>

            <Timeline dishes={dishes} schedule={schedule} />

            <div className="summary glass">
              <div>
                <span className="summary-num">{dishes.length}</span>
                <span className="summary-cap">dishes</span>
              </div>
              <div>
                <span className="summary-num">{formatDuration(durationSec / 60)}</span>
                <span className="summary-cap">total cook</span>
              </div>
              <div>
                <span className="summary-num">{formatTimeOfDay(new Date(Date.now() + durationSec * 1000))}</span>
                <span className="summary-cap">serve time</span>
              </div>
            </div>

            <button
              type="button"
              className="btn start"
              onClick={handleStart}
              disabled={!dishes.length}
            >
              <Icon name="play" size={18} /> Start cooking
            </button>
          </>
        )}
      </main>

      <footer className="footnote">Tip: add dishes longest-cook first for the clearest plan ✦</footer>
    </div>
  );
}
