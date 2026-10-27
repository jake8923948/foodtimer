import React, { useState } from 'react';
import Icon from './Icon';
import { ADD, makeDish, totalMinutes, uid } from '../lib/schedule';

const QUICK_TIMES = [5, 10, 15, 20, 30, 45];
const QUICK_ACTIONS = ['Flip', 'Stir', 'Baste', 'Reduce heat', 'Add water', 'Cover', 'Rest'];

const emptyStage = () => ({ action: '', minutes: '' });

function StageRow({ stage, index, onChange, onRemove, canRemove }) {
  const isFirst = index === 0;
  return (
    <div className="stage-row">
      <span className="stage-badge">{isFirst ? 'In' : `Step ${index + 1}`}</span>
      {isFirst ? (
        <input className="stage-action stage-action-static" value="Put in pan / pot / oven" disabled />
      ) : (
        <input
          className="stage-action"
          placeholder="e.g. Flip, stir, rest…"
          value={stage.action}
          onChange={(e) => onChange({ ...stage, action: e.target.value })}
          list="quick-actions"
          aria-label={`Action for step ${index + 1}`}
        />
      )}
      <div className="stage-mins">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="min"
          value={stage.minutes}
          onChange={(e) => onChange({ ...stage, minutes: e.target.value })}
          aria-label={`Minutes for step ${index + 1}`}
        />
      </div>
      {canRemove && (
        <button
          type="button"
          className="icon-btn subtle"
          onClick={() => onRemove()}
          aria-label={`Remove step ${index + 1}`}
        >
          <Icon name="trash" size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Card editor for a single dish: name + repeatable cooking stages.
 * Used both for creating new dishes and editing existing ones.
 */
export default function DishForm({ initial, onSubmit, onCancel, submitLabel = 'Add dish' }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [stages, setStages] = useState(
    initial
      ? initial.stages.map((s) => ({
          action: s.action === ADD ? '' : s.action,
          minutes: String(s.minutes),
        }))
      : [emptyStage()]
  );
  const [error, setError] = useState('');

  const setStage = (i, next) => setStages((prev) => prev.map((s, j) => (j === i ? next : s)));
  const removeStage = (i) => setStages((prev) => prev.filter((_, j) => j !== i));
  const addStage = () => setStages((prev) => [...prev, emptyStage()]);

  const total = stages.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dish = makeDish({ id: initial?.id ?? uid(), name, stages });
    if (!dish.name) return setError('Give your dish a name.');
    if (!dish.stages.length || dish.stages[0].minutes <= 0)
      return setError('The first stage needs a time (how long it takes to start).');
    onSubmit(dish);
  };

  return (
    <form className="dish-form glass" onSubmit={handleSubmit}>
      <datalist id="quick-actions">
        {QUICK_ACTIONS.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      <div className="dish-form-head">
        <input
          className="dish-name"
          placeholder="Dish name — roast potatoes, rice…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus={!initial}
          aria-label="Dish name"
        />
        <div className="dish-total" title="Total time on the plan">
          <Icon name="clock" size={15} />
          <strong>{total}</strong> min
        </div>
      </div>

      <div className="stage-list">
        {stages.map((s, i) => (
          <StageRow
            key={i}
            stage={s}
            index={i}
            onChange={(next) => setStage(i, next)}
            onRemove={() => removeStage(i)}
            canRemove={stages.length > 1}
          />
        ))}
      </div>

      <div className="chip-row" role="group" aria-label="Quick total times">
        {QUICK_TIMES.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${total === t ? 'active' : ''}`}
            onClick={() => setStages([{ action: '', minutes: String(t) }])}
          >
            {t}m
          </button>
        ))}
      </div>

      <button type="button" className="add-stage-btn" onClick={addStage}>
        <Icon name="plus" size={16} /> Multi-stage step
        <span className="hint">flip · stir · rest…</span>
      </button>

      {error && <p className="form-error">{error}</p>}

      <div className="dish-form-actions">
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn primary">
          <Icon name="plus" size={17} /> {submitLabel}
        </button>
      </div>
    </form>
  );
}
