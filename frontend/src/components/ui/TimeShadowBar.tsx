import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faCirclePlay,
  faCirclePause,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

type TimeShadowBarProps = {
  minutes: number;
  date: Date;
  onChange: (minutes: number) => void;
  onClose: () => void;
};

const minuteMax = 24 * 60 - 1;
const autoPlayStepMinutes = 1;
const autoPlayIntervalMs = 30;

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(minuteMax, Math.max(0, Math.round(value)));
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${mins.toString().padStart(2, "0")} ${period.toLowerCase()}`;
}

export default function TimeShadowBar({ minutes, date, onChange, onClose }: TimeShadowBarProps) {
  const [autoPlay, setAutoPlay] = useState(false);
  const clampedMinutes = clampMinutes(minutes);
  const percent = (clampedMinutes / minuteMax) * 100;
  const [timeValue, timePeriod] = formatTime(clampedMinutes).split(" ");
  const dateLabel = date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  const hourStart = "12am";
  const hourEnd = "11:59pm";
  const actionButtonClassName =
    "inline-flex w-fit justify-self-start items-center justify-center gap-1 rounded-full border border-[var(--timebar-pill-border)] bg-[var(--timebar-pill-bg)] px-1.5 py-0.5 text-[11px] font-semibold uppercase text-[var(--timebar-muted)] transition hover:bg-[var(--btn-hover)] hover:text-[var(--timebar-text)]";

  useEffect(() => {
    if (!autoPlay) {
      return;
    }
    const timer = window.setInterval(() => {
      onChange((clampedMinutes + autoPlayStepMinutes) % (minuteMax + 1));
    }, autoPlayIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoPlay, clampedMinutes, onChange]);

  const handleSetNow = () => {
    const now = new Date();
    onChange(now.getHours() * 60 + now.getMinutes());
  };

  return (
    <div className="absolute left-4 top-20 z-[2100] w-[min(520px,calc(100%-24px))] overflow-hidden rounded-xl border border-[var(--timebar-border)] bg-[var(--timebar-bg)] text-[var(--timebar-text)] shadow-[var(--timebar-shadow)]">
      <div className="flex items-center justify-between border-b border-[var(--timebar-border)] pl-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--timebar-muted)]">
          Shadow Time
        </div>
        <button
          type="button"
          className="flex h-9 w-10 items-center justify-center text-[13px] text-[var(--timebar-muted)] transition hover:bg-[var(--btn-hover)] hover:text-[var(--timebar-text)]"
          onClick={onClose}
          aria-label="Hide shadow time"
          title="Hide shadow time"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <div className="grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3">
          <div className="text-[34px] font-semibold leading-[1]">
            {timeValue}
            <span className="ml-1 text-[16px] font-semibold lowercase text-[var(--timebar-muted)]">{timePeriod}</span>
          </div>
          <div className="text-[9px] font-semibold uppercase leading-tight text-[var(--timebar-muted)]">
            UTC
            <br />
            +7:00
          </div>
          <div className="rounded-full border border-[var(--timebar-pill-border)] bg-[var(--timebar-pill-bg)] px-2.5 py-1 text-[14px] font-semibold">
            {dateLabel}
          </div>
          <button
            type="button"
            className={actionButtonClassName}
            onClick={handleSetNow}
            title="Set current time"
            aria-label="Set current time"
          >
            <FontAwesomeIcon icon={faClock} className="text-[11px]" />
            <span>Now</span>
          </button>
          <button
            type="button"
            className={`${actionButtonClassName} ${autoPlay ? "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]" : ""}`}
            onClick={() => setAutoPlay((prev) => !prev)}
            title={autoPlay ? "Pause auto time" : "Start 24h auto time"}
            aria-label={autoPlay ? "Pause auto time" : "Start 24h auto time"}
          >
            <FontAwesomeIcon icon={autoPlay ? faCirclePause : faCirclePlay} className="text-[11px]" />
            <span>24H</span>
          </button>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <span className="text-[12px] font-semibold text-[var(--timebar-muted)]">{hourStart}</span>
          <input
            className="time-slider"
            type="range"
            min={0}
            max={minuteMax}
            step={1}
            value={clampedMinutes}
            onChange={(event) => onChange(Number.parseInt(event.target.value, 10))}
            style={{
              background: `linear-gradient(90deg, var(--timebar-fill) ${percent}%, var(--timebar-track) ${percent}%)`,
            }}
          />
          <span className="text-[12px] font-semibold text-[var(--timebar-muted)]">{hourEnd}</span>
        </div>
      </div>

    </div>
  );
}
