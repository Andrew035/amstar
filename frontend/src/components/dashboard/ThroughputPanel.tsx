import React from "react";
import type { VehicleRepair } from "../../types/repair";
import { throughput } from "../../lib/shopStats";
import { Panel } from "./Panel";

const VIEW_W = 220;
const VIEW_H = 50;
/** Headroom for the top of the plot, so a peak never touches the frame. */
const PAD_TOP = 10;
const PAD_BOTTOM = 4;

/**
 * Cars completed per month, over three months ending with the one in progress.
 *
 * <p>The month in progress is **dashed** everywhere it appears - the last line
 * segment, its bar, its label. A partial month always plots low, so a solid mark
 * would read as a collapse rather than as a month that is not over.
 *
 * <p>Three points make a line; one or two get bars, because a line between two
 * points draws a slope that is not in the data.
 *
 * <p>Colour comes from the sev tokens via `currentColor`, since an SVG `stroke`
 * cannot take a Tailwind class. The chart previously hardcoded #38bdf8 and
 * #10b981, which are those two tokens' values copied by hand.
 */
export const ThroughputPanel: React.FC<{
  repairs: VehicleRepair[];
  onOpenHistory: () => void;
  className?: string;
}> = ({ repairs, onOpenHistory, className }) => {
  const t = throughput(repairs);
  const peak = Math.max(1, ...t.months.map((m) => m.count));
  const span = VIEW_H - PAD_TOP - PAD_BOTTOM;

  const xy = t.months.map((m, i) => ({
    x: (i / Math.max(1, t.months.length - 1)) * VIEW_W,
    y: VIEW_H - PAD_BOTTOM - (m.count / peak) * span,
  }));
  const at = (p: { x: number; y: number }) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

  // Split so the leg into the unfinished month can be dashed on its own.
  const solid = xy.slice(0, -1).map(at).join(" ");
  const dashed = xy.slice(-2).map(at).join(" ");

  const label = `Completed per month: ${t.months
    .map((m) => `${m.label} ${m.count}${m.partial ? " so far" : ""}`)
    .join(", ")}`;

  /*
   * Line mode anchors its end points at 0% and 100% of the width, so the
   * captions are edge-anchored to match. Bars occupy equal columns instead, so
   * theirs are centred. Using one row for both left the first and last caption
   * a sixth of the width away from the point they named.
   */
  const captions = (kind: "line" | "bars") => (
    <div className={`mt-0.5 flex ${kind === "line" ? "justify-between" : ""}`}>
      {t.months.map((m, i) => (
        <span
          key={m.key}
          className={`font-mono text-[10px] ${
            kind === "bars" ? "flex-1 text-center" : ""
          } ${
            i === 0 && kind === "line"
              ? "text-left"
              : i === t.months.length - 1 && kind === "line"
                ? "text-right"
                : "text-center"
          } ${m.partial ? "text-sev-1" : "text-amstar-ink-faint"}`}
        >
          {m.label}
        </span>
      ))}
    </div>
  );

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
            <>
              {/* Values live in HTML, not SVG text: the plot is stretched with
                  preserveAspectRatio="none", which would squash any glyph. */}
              <div className="flex justify-between">
                {t.months.map((m, i) => (
                  <span
                    key={m.key}
                    className={`font-mono text-[10px] tabular-nums ${
                      i === 0
                        ? "text-left"
                        : i === t.months.length - 1
                          ? "text-right"
                          : "text-center"
                    } ${m.partial ? "text-sev-1" : "text-amstar-ink-dim"}`}
                  >
                    {m.count}
                  </span>
                ))}
              </div>
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="w-full h-11 text-sev-2"
                preserveAspectRatio="none"
                role="img"
                aria-label={label}
              >
                <polyline
                  points={`${xy.map(at).join(" ")} ${VIEW_W},${VIEW_H} 0,${VIEW_H}`}
                  fill="currentColor"
                  fillOpacity="0.14"
                  stroke="none"
                />
                <polyline
                  points={solid}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={dashed}
                  fill="none"
                  className="text-sev-1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {captions("line")}
            </>
          )}

          {t.chart === "bars" && (
            <>
              <div
                className="flex items-end gap-2 h-11"
                role="img"
                aria-label={label}
              >
                {t.months.map((m) => (
                  <span
                    key={m.key}
                    // The month in progress is an outline, not a fill: it says
                    // "as far as it has got" rather than stating a total.
                    className={`flex-1 rounded-sm ${
                      m.partial
                        ? "border-2 border-dashed border-sev-1 bg-sev-1/20"
                        : "bg-sev-2"
                    }`}
                    style={{ height: `${Math.max(8, (m.count / peak) * 100)}%` }}
                  />
                ))}
              </div>
              {captions("bars")}
            </>
          )}

          {t.chart === "none" && (
            <p className="text-xs text-amstar-ink-faint">
              No completed jobs yet. The trend starts with the first one.
            </p>
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
