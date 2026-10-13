import React from "react";
import { PANEL_STYLE } from "../styles/controls";

/**
 * A loading placeholder.
 *
 * `amstar-raised` is the one surface above `amstar-surface`, so a block reads
 * as a hole in the panel it sits in rather than a shape drawn on top of it.
 *
 * The delay is applied NEGATIVE, which starts the pulse partway through its
 * cycle. A positive delay would hold every block at full opacity until its turn
 * came round, which looks like the page froze before it looks like a wave.
 */
export const Skeleton: React.FC<{ className?: string; delay?: number }> = ({
  className = "",
  delay = 0,
}) => (
  <div
    className={`skeleton bg-amstar-raised rounded-sm ${className}`}
    style={delay ? { animationDelay: `${-delay}ms` } : undefined}
    aria-hidden="true"
  />
);

const DASHBOARD_HEIGHT = "sm:h-[calc(100dvh-129px)]";

/** Mirrors Panel in components/dashboard/Panel.tsx, including its header rule. */
const PanelSkeleton: React.FC<{ rows: number; className?: string }> = ({
  rows,
  className = "",
}) => (
  <section
    className={`${PANEL_STYLE} flex flex-col min-h-0 min-w-0 overflow-hidden ${className}`}
  >
    <div className="shrink-0 flex items-baseline justify-between gap-3 px-4 py-2.5 border-b border-amstar-line-soft">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-5 w-8" delay={120} />
    </div>
    <div className="flex-1 min-h-0 overflow-hidden px-4 py-2 space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 shrink-0" delay={i * 90} />
          <Skeleton className="h-3 flex-1" delay={i * 90 + 40} />
          <Skeleton className="h-3 w-10 shrink-0" delay={i * 90 + 80} />
        </div>
      ))}
    </div>
  </section>
);

/**
 * The dashboard with its data regions stood in for. The heading and the red
 * rule are real: they need no data, so there is no reason to withhold them.
 * Grid and row template copied from pages/Dashboard.tsx so nothing shifts when
 * the real panels take over.
 */
export const DashboardSkeleton: React.FC = () => (
  <div className={`flex flex-col gap-3 ${DASHBOARD_HEIGHT}`}>
    <div className="shrink-0 flex items-end justify-between gap-3 border-b-2 border-amstar-red pb-1.5">
      <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
        Shop Overview
      </h2>
      <Skeleton className="h-3 w-12" />
    </div>

    <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`${PANEL_STYLE} flex-1 min-w-[88px] px-3 py-2`}>
          <Skeleton className="h-2.5 w-14" delay={i * 70} />
          <Skeleton className="h-7 w-12 mt-1.5" delay={i * 70 + 50} />
        </div>
      ))}
    </div>

    {/* Needs attention | Recent activity / Throughput (full) / Capacity | Target */}
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:grid-rows-[minmax(0,1.15fr)_auto_minmax(0,1.3fr)]">
      <PanelSkeleton rows={4} />
      <PanelSkeleton rows={4} />
      <PanelSkeleton rows={2} className="lg:col-span-2" />
      <PanelSkeleton rows={4} />
      <PanelSkeleton rows={3} />
    </div>
  </div>
);

/** Mirrors the list/detail split in pages/ActiveQueue.tsx. */
export const QueueSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-amstar-red pb-2 gap-4">
      <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
        Shop Active Repairs
      </h2>
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-8 w-28" delay={60} />
        <Skeleton className="h-11 w-32" delay={120} />
      </div>
    </div>

    <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100dvh-232px)] lg:min-h-[420px]">
      <div
        className={`${PANEL_STYLE} shrink-0 lg:w-[344px] xl:w-[380px] max-lg:h-96 flex flex-col min-h-0 overflow-hidden`}
      >
        <div className="shrink-0 p-3 border-b border-amstar-line">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-10 w-full" delay={60} />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 min-h-[4.5rem] px-3 py-2 border-b border-amstar-line-soft"
            >
              <Skeleton className="h-7 w-7 shrink-0" delay={i * 90} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" delay={i * 90 + 40} />
                <Skeleton className="h-2.5 w-1/2" delay={i * 90 + 70} />
              </div>
              <Skeleton className="h-3 w-8 shrink-0" delay={i * 90 + 100} />
            </div>
          ))}
        </div>
      </div>

      <div
        className={`${PANEL_STYLE} flex-1 min-w-0 max-lg:min-h-[560px] flex flex-col min-h-0 overflow-hidden`}
      >
        <div className="shrink-0 flex items-start justify-between gap-4 px-4 pt-4 pb-4 border-b border-amstar-line-soft">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3 w-32" delay={60} />
          </div>
          <Skeleton className="h-20 w-28 shrink-0" delay={120} />
        </div>
        <div className="flex-1 min-h-0 px-4 py-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-12" delay={i * 50} />
                <Skeleton className="h-8 w-full" delay={i * 50 + 40} />
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
            <Skeleton className="min-h-24" delay={200} />
            <Skeleton className="min-h-24" delay={260} />
          </div>
        </div>
      </div>
    </div>
  </div>
);
