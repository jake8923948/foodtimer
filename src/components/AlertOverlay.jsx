import React, { useEffect } from 'react';
import Icon from './Icon';
import { formatClock } from '../lib/schedule';

/**
 * Full-screen alert shown when an event fires. One card per queued event;
 * the user acknowledges each (or all) so nothing is missed with wet hands later.
 */
export default function AlertOverlay({ alerts, onAcknowledge, onAcknowledgeAll }) {
  const primary = alerts[alerts.length - 1];
  const others = alerts.slice(0, -1);

  // Keep the screen awake while an alert is up (best-effort).
  useEffect(() => {
    let wakeLock;
    if ('wakeLock' in navigator && primary) {
      navigator.wakeLock.request('screen').then((l) => (wakeLock = l)).catch(() => {});
    }
    return () => wakeLock?.release?.().catch(() => {});
  }, [primary]);

  if (!primary) return null;

  const verb =
    primary.type === 'add' ? 'Put in' : primary.type === 'done' ? 'Ready — serve!' : primary.instruction;

  return (
    <div className="alert-overlay" role="alertdialog" aria-modal="true" aria-label={verb}>
      {others.length > 0 && (
        <div className="alert-stack">
          {others.map((a) => (
            <button key={a.id} type="button" className="alert-peek" onClick={() => onAcknowledge(a.id)}>
              <Icon name="check" size={14} /> {a.dishName}: {a.instruction}
            </button>
          ))}
        </div>
      )}

      <div className={`alert-card glass type-${primary.type}`}>
        <span className="alert-type">{primary.type === 'add' ? 'Now adding' : primary.type === 'done' ? 'Dish complete' : 'Action'}</span>
        <h2 className="alert-dish">{primary.dishName}</h2>
        <p className="alert-verb">{verb}</p>
        {primary.remainingForDish > 0 && (
          <p className="alert-remaining">
            <Icon name="clock" size={15} /> {formatClock(primary.remainingForDish)} left on this dish
          </p>
        )}
        <div className="alert-actions">
          <button type="button" className="btn primary big" onClick={() => onAcknowledge(primary.id)}>
            <Icon name="check" size={18} /> Done it
          </button>
          {others.length > 0 && (
            <button type="button" className="btn ghost big" onClick={onAcknowledgeAll}>
              Acknowledge all ({alerts.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
