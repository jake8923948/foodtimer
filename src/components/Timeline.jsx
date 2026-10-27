import React, { memo } from 'react';
import { formatDuration } from '../lib/schedule';

/**
 * Horizontal stacked-bar visualisation of the plan. Pure CSS positioning —
 * re-renders are cheap and scale to dozens of dishes.
 */
function Timeline({ dishes, schedule, nowSec = null, durationSec = null }) {
  const span = Math.max(1, durationSec ?? schedule.durationSec);
  const nowPct = nowSec != null ? (Math.min(nowSec, span) / span) * 100 : null;

  return (
    <div className="timeline glass" role="img" aria-label="Cooking timeline">
      <div className="timeline-track">
        {dishes.map((dish) => {
          const meta = schedule.dishMeta.get(dish.id);
          if (!meta) return null;
          const left = (meta.startSec / span) * 100;
          const width = Math.max(2, (meta.totalSec / span) * 100);
          return (
            <div key={dish.id} className="timeline-row">
              <span className="timeline-label" title={dish.name}>
                {dish.name}
              </span>
              <div className="timeline-lane">
                <div
                  className={`dish-bar stages-${Math.min(dish.stages.length, 4)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {dish.stages.slice(1).map((s, i) => {
                    const at =
                      ((meta.startSec +
                        dish.stages.slice(0, i + 1).reduce((a, x) => a + x.minutes, 0) * 60) /
                        span) *
                      100;
                    return (
                      <span
                        key={i}
                        className="stage-mark"
                        style={{ left: `${at}%` }}
                        title={`${s.action} @ ${formatDuration(at / 100 / 60)}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {nowPct != null && (
          <div className="timeline-now" style={{ left: `${nowPct}%` }} aria-hidden="true">
            <span className="timeline-now-bulb" />
          </div>
        )}
      </div>
      <div className="timeline-axis">
        <span>0:00</span>
        <span>{formatDuration(span / 60)}</span>
      </div>
    </div>
  );
}

export default memo(Timeline);
