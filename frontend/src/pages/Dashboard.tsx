import React from "react";
import { useNavigate } from "react-router-dom";
import type { TicketActivity, VehicleRepair } from "../types/repair";
import {
  getSeverityColor,
  HOVER,
  HOVER_LIFT,
  PANEL_STYLE,
  SEVERITY_TEXT,
} from "../styles/controls";
import {
  daysLate,
  isComeback,
  isDueOn,
  isOverdue,
  localISODate,
  vehicleLabel,
} from "../lib/ticketFilters";
import { shopVitals } from "../lib/shopStats";
import { Empty, Panel } from "../components/dashboard/Panel";
import { CapacityPanel } from "../components/dashboard/CapacityPanel";
import { TargetPanel } from "../components/dashboard/TargetPanel";
import { ThroughputPanel } from "../components/dashboard/ThroughputPanel";

/*
 * Layout: one screen, no page scroll, from iPad mini portrait (sm, 640px) up.
 *
 *   stat strip   - every headline number in one compact row
 *   panel grid   - fills the rest of the viewport; long lists scroll inside
 *                  their own panel instead of lengthening the page
 *
 * The height is the viewport minus the navbar (h-16 + 1px border = 65px) and
 * App's <main> padding (py-8 = 64px). If either of those changes, update
 * DASHBOARD_HEIGHT. Rows have a minimum height, so on a very short window the
 * page scrolls a little rather than squeezing panels to nothing.
 */
const DASHBOARD_HEIGHT = "sm:h-[calc(100dvh-129px)]";

// ---------------------------------------------------------------------------
// Stat strip
// ---------------------------------------------------------------------------
const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueClass?: string;
  onOpen?: () => void;
}> = ({ label, value, sub, valueClass = "text-amstar-ink", onOpen }) => {
  const body = (
    <>
      <span className="block font-cond text-[10px] uppercase tracking-widest text-amstar-ink-dim truncate">
        {label}
      </span>
      <span
        className={`block font-mono text-2xl font-bold tabular-nums leading-tight truncate ${valueClass}`}
      >
        {value}
      </span>
      {sub && (
        <span className="block text-[10px] text-amstar-ink-faint truncate">
          {sub}
        </span>
      )}
    </>
  );
  const base = `${PANEL_STYLE} flex-1 min-w-[88px] px-3 py-2 text-left`;
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} ${HOVER_LIFT} hover:border-amstar-ink-faint hover:bg-amstar-raised`}
    >
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
};

const TicketRow: React.FC<{
  repair: VehicleRepair;
  onOpen: () => void;
  badge: React.ReactNode;
  index: number;
}> = ({ repair, onOpen, badge, index }) => (
  <li
    className="anim-row"
    style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
  >
    <button
      type="button"
      onClick={onOpen}
      className={`w-full min-h-11 flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-sm text-left hover:bg-amstar-raised ${HOVER}`}
    >
      <span
        className={`shrink-0 w-5 h-5 grid place-items-center rounded-sm font-cond text-[10px] font-bold ${SEVERITY_TEXT} ${getSeverityColor(repair.severity)}`}
        aria-label={`Severity ${repair.severity}`}
      >
        {repair.severity}
      </span>
      <span className="flex-1 min-w-0 truncate text-sm">
        <span className="font-bold uppercase text-amstar-ink">
          {vehicleLabel(repair)}
        </span>{" "}
        <span className="text-amstar-ink-faint">{repair.customerName}</span>
      </span>
      {isComeback(repair) && (
        <span className="shrink-0 px-1.5 rounded-sm bg-amstar-red text-white font-cond text-[9px] font-bold uppercase tracking-wider">
          Comeback
        </span>
      )}
      <span className="shrink-0">{badge}</span>
    </button>
  </li>
);

const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-sm font-cond uppercase tracking-wider text-[11px] whitespace-nowrap ${SEVERITY_TEXT} ${className}`}
  >
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

const ACTION_TEXT: Record<TicketActivity["action"], string> = {
  CREATED: "added",
  STATUS: "changed status on",
  SEVERITY: "changed severity on",
  ASSIGNED: "reassigned",
  SERVICES: "updated services on",
  PRICING: "updated pricing on",
  NOTES: "updated notes on",
  PARTS: "updated parts on",
  LINE_ITEMS: "updated parts pricing on",
  BILLING_TYPE: "changed billing type on",
  DUE_DATE: "moved the due date on",
  CUSTOMER: "corrected the customer on",
  DELETED: "deleted",
  COMEBACK: "marked a comeback on",
};

const ACTION_DOT: Record<TicketActivity["action"], string> = {
  CREATED: "bg-sev-2",
  STATUS: "bg-sev-1",
  SEVERITY: "bg-sev-4",
  ASSIGNED: "bg-sev-3",
  SERVICES: "bg-amstar-ink-faint",
  PRICING: "bg-amstar-ink-faint",
  NOTES: "bg-amstar-ink-faint",
  PARTS: "bg-amstar-ink-faint",
  LINE_ITEMS: "bg-amstar-ink-faint",
  BILLING_TYPE: "bg-amstar-ink-faint",
  DUE_DATE: "bg-sev-3",
  CUSTOMER: "bg-amstar-ink-faint",
  DELETED: "bg-sev-5",
  COMEBACK: "bg-sev-3",
};

const timeAgo = (iso: string): string => {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - Date.parse(iso)) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const ActivityFeed: React.FC<{ activity: TicketActivity[] }> = ({
  activity,
}) =>
  activity.length === 0 ? (
    <Empty>No activity yet. Changes to tickets will show up here.</Empty>
  ) : (
    <ul className="divide-y divide-amstar-line-soft">
      {activity.map((event, i) => (
        <li
          key={event.id}
          className="py-2 flex gap-3 anim-row"
          style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
        >
          <span
            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ACTION_DOT[event.action]}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-amstar-ink leading-snug">
              <span className="font-bold">{event.actor}</span>{" "}
              <span className="text-amstar-ink-dim">
                {ACTION_TEXT[event.action]}
              </span>{" "}
              <span className="font-bold">{event.ticketLabel}</span>
            </p>
            {event.detail && (
              <p className="text-xs text-amstar-ink-dim truncate uppercase">
                {event.detail}
              </p>
            )}
          </div>
          <time
            dateTime={event.createdAt}
            title={new Date(event.createdAt).toLocaleString()}
            className="shrink-0 text-[11px] font-mono tabular-nums text-amstar-ink-faint mt-0.5"
          >
            {timeAgo(event.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );

// ---------------------------------------------------------------------------

export const Dashboard: React.FC<{
  repairs: VehicleRepair[];
  technicianNames: string[];
  activity: TicketActivity[];
  isAdmin: boolean;
}> = ({ repairs, technicianNames, activity, isAdmin }) => {
  const navigate = useNavigate();
  const openQueue = (filter: string) =>
    navigate(`/queue?filter=${encodeURIComponent(filter)}`);
  /*
   * A heading opens the group; a row opens the car. This used to send the row's
   * due-date filter, which landed you on a narrowed list with the highest
   * priority ticket selected rather than the one you clicked. No filter here on
   * purpose: you asked for a vehicle, so the queue shows it in full context.
   */
  const openTicket = (id?: number) => navigate(`/queue?ticket=${id}`);

  const today = localISODate();
  const tomorrow = localISODate(1);

  const vitals = shopVitals(repairs, today);
  // "--" rather than 0%: with no completed jobs yet, 0% on time would be a lie.
  const pct = (n: number | null) => (n === null ? "--" : `${Math.round(n)}%`);

  const overdue = repairs
    .filter((r) => isOverdue(r, today))
    .sort((a, b) => daysLate(b, today) - daysLate(a, today));
  const dueToday = repairs.filter((r) => isDueOn(r, today));
  const dueTomorrow = repairs.filter((r) => isDueOn(r, tomorrow));
  const dueSoon = [...overdue, ...dueToday, ...dueTomorrow];

  const dueBadge = (r: VehicleRepair) => {
    if (isOverdue(r, today))
      return <Badge className="bg-sev-5">{daysLate(r, today)}d late</Badge>;
    if (r.expectedCompletionDate === today)
      return <Badge className="bg-sev-3">Today</Badge>;
    return <Badge className="bg-sev-2">Tomorrow</Badge>;
  };
  return (
    <div className={`flex flex-col gap-3 ${DASHBOARD_HEIGHT}`}>
      {/* Header */}
      <div className="shrink-0 flex items-end justify-between gap-3 border-b-2 border-amstar-red pb-1.5">
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Shop Overview
        </h2>
        <span className="flex items-center gap-1.5 font-cond text-[11px] uppercase tracking-widest text-amstar-ink-dim">
          <span
            className="w-2 h-2 rounded-full bg-sev-1 animate-pulse"
            aria-hidden="true"
          />
          Live
        </span>
      </div>

      {/*
        Five across rather than nine tiles. These answer "how is the shop
        doing" and have to read from the counter, which a row of small
        counters never did.
      */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <StatTile
          label="Active jobs"
          value={vitals.activeCount}
          onOpen={() => openQueue("pending")}
        />
        <StatTile
          label="Overdue"
          value={vitals.overdueCount}
          valueClass={
            vitals.overdueCount ? "text-amstar-red-ink" : "text-amstar-ink"
          }
          onOpen={() => openQueue("overdue")}
        />
        <StatTile
          label="Finished on time"
          value={pct(vitals.onTimeRate)}
          valueClass="text-sev-1"
          onOpen={() => navigate("/history")}
        />
        <StatTile
          label="Average in shop"
          value={
            vitals.avgDaysInShop === null
              ? "--"
              : `${vitals.avgDaysInShop.toFixed(1)}d`
          }
          valueClass="text-sev-2"
        />
        <StatTile
          label="Came back"
          value={pct(vitals.comebackRate)}
          valueClass="text-sev-3"
          onOpen={() => openQueue("comeback")}
        />
      </div>

      {/*
        Needs attention and activity on top, throughput as a full-width band,
        capacity and targets below. The band is horizontal on purpose: stacked
        it cost 250px, and that height is what lets every technician fit
        without the capacity panel scrolling.
      */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:grid-rows-[minmax(0,1.15fr)_auto_minmax(0,1.3fr)]">
        <Panel
          title="Needs attention"
          count={dueSoon.length}
          alarm={overdue.length > 0}
          onOpen={() => openQueue("due-soon")}
        >
          {dueSoon.length === 0 ? (
            <Empty>Nothing is late or due by tomorrow.</Empty>
          ) : (
            <ul>
              {dueSoon.map((r, i) => (
                <TicketRow
                  key={r.id}
                  repair={r}
                  index={i}
                  onOpen={() => openTicket(r.id)}
                  badge={dueBadge(r)}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity">
          <ActivityFeed activity={activity} />
        </Panel>

        <ThroughputPanel
          repairs={repairs}
          onOpenHistory={() => navigate("/history")}
          className="lg:col-span-2"
        />

        <CapacityPanel
          repairs={repairs}
          technicianNames={technicianNames}
          today={today}
          onOpenTech={(name) => openQueue(`tech:${name}`)}
          onOpenUnassigned={() => openQueue("unassigned")}
        />

        <TargetPanel
          repairs={repairs}
          today={today}
          onOpenFilter={(f) =>
            f === "unbilled" && isAdmin
              ? navigate("/pricing?filter=unbilled")
              : openQueue(f)
          }
        />
      </div>
    </div>
  );
};
