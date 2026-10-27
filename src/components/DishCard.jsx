import React, { memo } from 'react';
import Icon from './Icon';
import { formatDuration, formatTimeOfDay, totalMinutes } from '../lib/schedule';

/** One row in the plan list: dish summary + expandable stage timeline. */
function DishCard({ dish, meta, expanded, onToggle, onEdit, onRemove }) {
  const total = totalMinutes(dish);
  const serveAt = new Date(Date.now() + (meta?.finishSec ?? total * 60) * 1000);

  return (
    <li className="dish-card glass" data-dish-id={dish.id}>
      <div className="dish-card-main">
        <button
          type="button"
          className={`dish-disclose ${expanded ? 'open' : ''}`}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`Show steps for ${dish.name}`}
        >
          <Icon name="chevron" size={16} />
        </button>

        <button type="button" className="dish-info" onClick={onToggle}>
          <span className="dish-title">{dish.name}</span>
          <span className="dish-meta">
            {formatDuration(total)}
            {dish.stages.length > 1 && <> · {dish.stages.length} stages</>}
            {meta && <> · starts in {formatDuration(meta.startSec / 60)}</>}
          </span>
        </button>

        <div className="dish-actions">
          <span className="serve-pill">{formatTimeOfDay(serveAt)}</span>
          <button type="button" className="icon-btn subtle" onClick={onEdit} aria-label={`Edit ${dish.name}`}>
            ✎
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={onRemove}
            aria-label={`Remove ${dish.name}`}
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <ol className="stage-timeline">
          {dish.stages.map((s, i) => {
            const startMin = dish.stages.slice(0, i).reduce((a, x) => a + x.minutes, 0);
            return (
              <li key={i}>
                <span className="dot" aria-hidden="true" />
                <div>
                  <strong>{i === 0 ? 'Put in' : s.action}</strong>
                  <span className="stage-time">
                    {i === 0 ? 'at start (+' : '+'}
                    {startMin} min · lasts {s.minutes} min
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

export default memo(DishCard);
