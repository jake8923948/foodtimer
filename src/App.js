import React, { useState, useEffect } from 'react';
import './App.css';

// Parse "50", "50 mins", "30 minutes", "1h 10m"... into minutes. NaN if invalid.
const parseMinutes = (value) => {
  if (value === null || value === undefined) return NaN;
  const str = String(value).trim().toLowerCase();
  if (str === '') return NaN;
  let total = 0;
  let matched = false;
  const hourRe = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)(?![a-z])/g;
  const minRe = /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)(?![a-z])/g;
  let m;
  while ((m = hourRe.exec(str)) !== null) {
    total += parseFloat(m[1]) * 60;
    matched = true;
  }
  while ((m = minRe.exec(str)) !== null) {
    total += parseFloat(m[1]);
    matched = true;
  }
  if (!matched) {
    // Bare number with no unit -> treat as minutes
    const bare = str.match(/^\d+(?:\.\d+)?$/);
    if (!bare) return NaN;
    total = parseFloat(str);
  }
  return Math.round(total);
};

const formatDuration = (minutes) => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
};

let nextDishId = 1;

function App() {
  const [dishes, setDishes] = useState([]);
  const [foodName, setFoodName] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionTime, setActionTime] = useState('');
  const [isCooking, setIsCooking] = useState(false);
  const [timer, setTimer] = useState(0);
  const [events, setEvents] = useState([]);
  const [eventIndex, setEventIndex] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const foodNameInputRef = React.useRef(null);
  const cookTimeInputRef = React.useRef(null);
  const actionLabelInputRef = React.useRef(null);
  const actionTimeInputRef = React.useRef(null);
  const audioRef = React.useRef(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const totalMinutes = parseMinutes(cookTime);
  const partialMinutes = parseMinutes(actionTime);
  const hasAction = actionLabel.trim() !== '' || actionTime.trim() !== '';
  const actionInvalid =
    hasAction &&
    !(Number.isFinite(partialMinutes) && Number.isFinite(totalMinutes) && partialMinutes > 0 && partialMinutes < totalMinutes);
  const remainingAfterAction =
    Number.isFinite(partialMinutes) && Number.isFinite(totalMinutes) && partialMinutes < totalMinutes
      ? totalMinutes - partialMinutes
      : null;

  const handleFoodNameKeyDown = (e) => {
    if (e.key === 'Enter') cookTimeInputRef.current && cookTimeInputRef.current.focus();
  };

  const handleCookTimeKeyDown = (e) => {
    if (e.key === 'Enter') actionLabelInputRef.current && actionLabelInputRef.current.focus();
  };

  const handleActionLabelKeyDown = (e) => {
    if (e.key === 'Enter') actionTimeInputRef.current && actionTimeInputRef.current.focus();
  };

  const handleActionTimeKeyDown = (e) => {
    if (e.key === 'Enter') addFoodItem();
  };

  // "Add dish": append the dish, then immediately re-sort "your plan" so the
  // longest-cooking items sit on top and the shortest drop to the bottom.
  const addFoodItem = () => {
    if (!foodName.trim()) return;
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return;
    if (actionInvalid) return;

    const stageOne = hasAction ? partialMinutes : totalMinutes;
    const stageTwo = hasAction ? totalMinutes - partialMinutes : 0;

    const newDish = {
      id: nextDishId++,
      name: foodName.trim(),
      totalTime: totalMinutes,
      hasAction,
      actionLabel: hasAction ? (actionLabel.trim() || 'Do step 2') : '',
      stageOne,
      stageTwo,
    };

    const updated = [...dishes, newDish].sort((a, b) => b.totalTime - a.totalTime);
    setDishes(updated);

    setFoodName('');
    setCookTime('');
    setActionLabel('');
    setActionTime('');
    if (foodNameInputRef.current) foodNameInputRef.current.focus();
  };

  const removeDish = (id) => {
    setDishes((prev) => prev.filter((d) => d.id !== id));
  };

  // Build the staggered schedule: every dish finishes at the same moment.
  // Alarms fire earliest-first, so the list is sorted by offset ascending.
  const startCooking = () => {
    if (dishes.length === 0) return;

    const evts = [];
    dishes.forEach((dish) => {
      const finishOffset = Math.max(0, dish.totalTime - dish.stageOne);
      evts.push({
        offset: finishOffset,
        message: dish.hasAction
          ? `Start "${dish.name}" now — it will need to ${dish.actionLabel} in ${formatDuration(dish.stageTwo)}.`
          : `Start "${dish.name}" now — done in ${formatDuration(dish.stageOne)}.`,
        dishId: dish.id,
        kind: 'start',
      });
      if (dish.hasAction) {
        evts.push({
          offset: finishOffset + dish.stageTwo,
          message: `${dish.actionLabel.toUpperCase()} the "${dish.name}"! (${formatDuration(dish.stageTwo)} in, ${formatDuration(dish.stageOne)} left)`,
          dishId: dish.id,
          kind: 'action',
        });
      }
    });
    evts.sort((a, b) => a.offset - b.offset);

    if (audioRef.current) {
      audioRef.current.volume = 1;
    }

    setEvents(evts);
    setEventIndex(0);
    setTimer(evts[0].offset * 60);
    setIsCooking(true);
  };

  const cancelCooking = () => {
    setIsCooking(false);
    setEvents([]);
    setEventIndex(0);
    setTimer(0);
    setShowModal(false);
  };

  const playAlarm = () => {
    if (audioRef.current && typeof audioRef.current.play === 'function') {
      audioRef.current.currentTime = 0;
      const played = audioRef.current.play();
      if (played && typeof played.catch === 'function') {
        played.catch(() => {});
      }
    }
  };

  const advanceToNextEvent = () => {
    const nextIdx = eventIndex + 1;
    if (nextIdx < events.length) {
      setEventIndex(nextIdx);
      setTimer((events[nextIdx].offset - events[eventIndex].offset) * 60);
    } else {
      setIsCooking(false);
      setEvents([]);
      setEventIndex(0);
      setTimer(0);
    }
  };

  // If a countdown reaches zero while a modal is still open (e.g. the user
  // hasn't dismissed the previous alert yet), queue the event so nothing is
  // lost; the countdown freezes at 0 and the alarm fires as soon as the
  // modal is acknowledged.
  const pendingEventRef = React.useRef(false);

  const acknowledgeModal = () => {
    setShowModal(false);
    if (pendingEventRef.current) {
      // The next event already reached zero: its alarm will be shown by the
      // effect (timer === 0, no modal). Don't advance past it.
      pendingEventRef.current = false;
      return;
    }
    advanceToNextEvent();
  };

  useEffect(() => {
    if (!isCooking) return undefined;
    if (timer > 0 && !pendingEventRef.current) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    if (timer > 0) return undefined; // countdown frozen at 0 with a queued event

    // timer hit zero -> current event fires
    const current = events[eventIndex];
    if (!current) {
      setIsCooking(false);
      return undefined;
    }

    if (showModal) {
      pendingEventRef.current = true;
      return undefined;
    }

    playAlarm();
    setModalMessage(current.message);
    setShowModal(true);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(current.message);
    }
    return undefined;
  }, [isCooking, timer, events, eventIndex, showModal]);

  const formatTime = (seconds) => {
    const safe = Math.max(0, seconds);
    const hrs = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentEvent = events[eventIndex];
  const nextEvent = events[eventIndex + 1];
  // Once an event's alarm is acknowledged, the next pending event is what's up.
  const upcomingEvent = showModal ? currentEvent : nextEvent;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Food Timer</h1>
      </header>
      {!isCooking ? (
        <div>
          <div className="form-container">
            <input
              ref={foodNameInputRef}
              type="text"
              placeholder="Food Name"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              onKeyDown={handleFoodNameKeyDown}
            />
            <input
              ref={cookTimeInputRef}
              type="text"
              inputMode="numeric"
              placeholder="Total time (mins)"
              title="Total cooking time, e.g. 50 or 50 mins"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              onKeyDown={handleCookTimeKeyDown}
            />
            <button onClick={addFoodItem} disabled={!foodName.trim() || !Number.isFinite(totalMinutes) || totalMinutes <= 0 || actionInvalid}>
              Add dish
            </button>
          </div>
          <div className="form-container stage2-container">
            <span className="stage-label" title="Optional second stage: read the packet, e.g. 'flip after 25 mins'">
              Step 2 <span className="optional">(optional)</span>
            </span>
            <input
              ref={actionLabelInputRef}
              type="text"
              placeholder="Action (flip, stir...)"
              value={actionLabel}
              onChange={(e) => setActionLabel(e.target.value)}
              onKeyDown={handleActionLabelKeyDown}
            />
            <input
              ref={actionTimeInputRef}
              type="text"
              inputMode="numeric"
              placeholder="At (mins)"
              title="When to do the action, counted from the start — e.g. 25 for 'flip 25 mins into cooking'"
              value={actionTime}
              onChange={(e) => setActionTime(e.target.value)}
              onKeyDown={handleActionTimeKeyDown}
            />
          </div>
          {hasAction && actionInvalid ? (
            <p className="error-text">Step 2 time must be between 0 and the total time.</p>
          ) : hasAction && remainingAfterAction !== null ? (
            <p className="auto-calc-text">
              Auto-calc: action after {formatDuration(partialMinutes)}, then cook {formatDuration(remainingAfterAction)} more.
            </p>
          ) : null}
          <p className="instruction-text">Press Enter to advance or submit.</p>
          <button onClick={startCooking} className="start-cooking-btn" disabled={dishes.length === 0}>
            Start Cooking
          </button>
        </div>
      ) : (
        <div className="timer-container">
          {upcomingEvent && <p className="up-next">Up next: {upcomingEvent.message}</p>}
          <h2>{formatTime(timer)}</h2>
          {!showModal && nextEvent && (
            <p className="after-that">After that: {events[eventIndex + 2] ? events[eventIndex + 2].message : nextEvent.message}</p>
          )}
          <button onClick={cancelCooking} className="cancel-btn">
            Cancel
          </button>
        </div>
      )}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <p>{modalMessage}</p>
            <button onClick={acknowledgeModal}>Dismiss</button>
          </div>
        </div>
      )}
      <h2 className="plan-title">{isCooking ? 'Your plan (cooking)' : 'Your plan'}</h2>
      <ul>
        {dishes.map((dish) => (
          <li key={dish.id} className="plan-item">
            <div className="plan-info">
              <span className="plan-name">{dish.name}</span>
              <span className="plan-detail">
                {dish.hasAction ? (
                  <>
                    {formatDuration(dish.totalTime)} total — {dish.actionLabel} after {formatDuration(dish.stageTwo)},
                    then {formatDuration(dish.stageOne)} more
                  </>
                ) : (
                  <>{formatDuration(dish.totalTime)}</>
                )}
              </span>
            </div>
            {!isCooking && (
              <button className="remove-btn" onClick={() => removeDish(dish.id)} aria-label={`Remove ${dish.name}`}>
                ✕
              </button>
            )}
          </li>
        ))}
        {dishes.length === 0 && <li className="empty-plan">Add a dish above to build your plan.</li>}
      </ul>
      <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
    </div>
  );
}

export default App;
