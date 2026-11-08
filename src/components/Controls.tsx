import { useEffect, useId, useRef, useState } from 'react';

interface RangeFieldProps {
  label: string;
  en: string;
  value: number;
  displayValue: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
  hint?: string;
}

export function RangeField({
  label,
  en,
  value,
  displayValue,
  min,
  max,
  step = 1,
  unit,
  onChange,
  hint,
}: RangeFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(displayValue));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(Number(displayValue.toFixed(1)).toString());
    }
  }, [displayValue]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(Number(displayValue.toFixed(1)).toString());
      return;
    }
    const next = Math.min(max, Math.max(min, parsed));
    onChange(next);
    setDraft(Number(next.toFixed(1)).toString());
  };

  const fill = ((displayValue - min) / (max - min)) * 100;

  return (
    <div className="range-field">
      <div className="range-field__head">
        <label htmlFor={id}>
          {label}
          <span>{en}</span>
        </label>
        {hint ? <span className="range-field__hint">{hint}</span> : null}
      </div>
      <div className="range-field__value">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = Number(event.target.value);
            if (
              Number.isFinite(parsed) &&
              parsed >= min &&
              parsed <= max
            ) {
              onChange(parsed);
            }
          }}
          onBlur={(event) => {
            focused.current = false;
            commit(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              (event.target as HTMLInputElement).blur();
            }
          }}
        />
        <span className="range-field__unit">{unit}</span>
      </div>
      <input
        className="range-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        aria-label={`${label}滑杆`}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(next);
          setDraft(String(next));
        }}
      />
      <div className="range-field__bounds">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

interface CompactFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

export function CompactField({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: CompactFieldProps) {
  return (
    <label className="compact-field">
      <span>{label}</span>
      <div>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) {
              onChange(Math.min(max, Math.max(min, parsed)));
            }
          }}
        />
        <em>{unit}</em>
      </div>
    </label>
  );
}

interface MeasureFieldProps {
  label: string;
  en: string;
  value: number | null;
  estimate: number;
  min: number;
  max: number;
  unit?: string;
  statusLabel?: string;
  onChange: (value: number | null) => void;
  hint?: string;
}

export function MeasureField({
  label,
  en,
  value,
  estimate,
  min,
  max,
  unit = 'cm',
  statusLabel = '实测',
  onChange,
  hint,
}: MeasureFieldProps) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value === null ? '' : String(value));
  }, [value]);

  return (
    <label className="measure-field" title={hint}>
      <span className="measure-field__label">
        {label}
        <em>{en}</em>
      </span>
      <span className="measure-field__input">
        <input
          type="number"
          inputMode="decimal"
          value={draft}
          placeholder={`≈ ${estimate.toFixed(1)}`}
          min={min}
          max={max}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            if (raw === '') {
              onChange(null);
              return;
            }
            const parsed = Number(raw);
            if (
              Number.isFinite(parsed) &&
              parsed >= min &&
              parsed <= max
            ) {
              onChange(parsed);
            }
          }}
          onBlur={() => {
            focused.current = false;
            const parsed = Number(draft);
            if (!draft || !Number.isFinite(parsed)) {
              setDraft('');
              onChange(null);
              return;
            }
            const next = Math.min(max, Math.max(min, parsed));
            setDraft(String(next));
            onChange(next);
          }}
        />
        <em>{unit}</em>
        <span
          className={`measure-field__status ${
            value !== null ? 'is-measured' : ''
          }`}
        >
          {value !== null ? statusLabel : '估算'}
        </span>
      </span>
    </label>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  columns?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  columns,
}: SegmentedProps<T>) {
  return (
    <div className="segmented-block">
      {label ? <div className="segmented-label">{label}</div> : null}
      <div
        className={`segmented ${columns ? 'segmented--grid' : ''}`}
        style={
          columns
            ? ({ '--cols': columns } as React.CSSProperties)
            : undefined
        }
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`segmented__item ${
              option.value === value ? 'is-active' : ''
            }`}
            title={option.description}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; note?: string }[];
  onChange: (value: T) => void;
  note?: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  note,
}: SelectProps<T>) {
  return (
    <label className="select-field">
      <span className="select-field__label">{label}</span>
      <span className="select-field__control">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {note ? <span className="select-field__note">{note}</span> : null}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`switch ${checked ? 'is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <i>
        <b />
      </i>
    </button>
  );
}
