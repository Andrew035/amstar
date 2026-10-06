import React from "react";
import type { VehicleRepair } from "../../types/repair";
import { throughput } from "../../lib/shopStats";
import { Panel } from "./Panel";

const VIEW_W = 220;
const VIEW_H = 50;

/**
 * Completed per month. Complete months only: a partial month plots low and
 * reads as a collapse when it just started. The current month is reported as
 * a number instead, and the line is hidden entirely below three months of
 * history, where a trend would imply a slope that is not there.
 */
export const ThroughputPanel: React.FC<{
  repairs: VehicleRepair[];
  onOpenHistory: () => void;
  className?: string;
}> = ({ repairs, onOpenHistory, className }) => {
  const t = throughput(repairs);
  const peak = Math.max(1, ...t.months.map((m) => m.count));

  const points = t.months
    .map((m, i) => {
      const x = (i / Math.max(1, t.months.length - 1)) * VIEW_W;
      const y = VIEW_H - 4 - (m.count / peak) * (VIEW_H - 14);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = t.months[t.months.length - 1];
  const lastY = VIEW_H - 4 - ((last?.count ?? 0) / peak) * (VIEW_H - 14);

  return (
    <Panel className={className} title="Throughput" onOpen={onOpenHistory}>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_1fr_minmax(0,190px)] gap-4 items-center">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tabular-nums leading-none text-sev-1">
            {t.thisMonthCount}
          </span>
          <span className="font-cond text-[10px] uppercase tracking-widest text-amstar-ink-faint">
            done in {t.thisMonthLabel}
          </span>
          <span className="ml-auto font-mono text-base font-bold tabular-nums leading-none text-sev-4">
            {t.stillOpen}
          </span>
          <span className="font-cond text-[10px] uppercase tracking-widest text-amstar-ink-faint">
            open
          </span>
        </div>

        <div>
          {t.chart === "line" && (
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="w-full h-11"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Completed per month over ${t.months.length} months`}
            >
              <polyline
                points={`${points} ${VIEW_W},${VIEW_H} 0,${VIEW_H}`}
                fill="rgb(56 189 248 / 0.14)"
                stroke="none"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={VIEW_W} cy={lastY} r="3.5" fill="#10b981" />
            </svg>
          )}

          {t.chart === "bars" && (
            <div
              className="flex items-end gap-2 h-11"
              role="img"
              aria-label={`Completed per month over ${t.months.length} months`}
            >
              {t.months.map((m, i) => (
                <span
                  key={m.key}
                  className={`flex-1 rounded-sm ${
                    i === t.months.length - 1 ? "bg-sev-1" : "bg-sev-2"
                  }`}
                  style={{ height: `${Math.max(8, (m.count / peak) * 100)}%` }}
                />
              ))}
            </div>
          )}

          {t.chart === "none" && (
            <p className="text-xs text-amstar-ink-faint">
              No completed jobs yet. The trend starts with the first one.
            </p>
          )}

          {t.chart !== "none" && (
            <div className="flex mt-0.5">
              {t.months.map((m, i) => (
                <span
                  key={m.key}
                  className={`flex-1 text-center font-mono text-[10px] ${
                    i === t.months.length - 1
                      ? "text-sev-1"
                      : "text-amstar-ink-faint"
                  }`}
                >
                  {m.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <dl className="text-xs">
          <div className="flex justify-between py-1 border-b border-amstar-line-soft">
            <dt className="text-amstar-ink-dim">Best month</dt>
            <dd className="font-mono tabular-nums text-amstar-ink-dim">
              {t.bestMonth
                ? `${t.bestMonth.label}, ${t.bestMonth.count}`
                : "No data"}
            </dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-amstar-ink-dim">Monthly average</dt>
            <dd className="font-mono tabular-nums text-amstar-ink-dim">
              {t.average === null ? "No data" : t.average.toFixed(1)}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
};
