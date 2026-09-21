import React from "react";
import { useNavigate } from "react-router-dom";
import type { TicketActivity, VehicleRepair } from "../types/repair";
import {
  getSeverityColor,
  getSeverityGlow,
  PANEL_STYLE,
  SEVERITY_TEXT,
} from "../styles/controls";
import {
  daysLate,
  isActive,
  isDueOn,
  isOverdue,
  isUnassigned,
  isUnbilled,
  localISODate,
  technicianList,
  vehicleLabel,
} from "../lib/ticketFilters";

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

const monthlyStats = (repairs: VehicleRepair[]) => {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inMonth = (d?: string | null) => !!d && d.startsWith(prefix);

  const completed = repairs.filter(
    (r) => r.status === "COMPLETED" && inMonth(r.actualCompletionDate),
  );
  const intake = repairs.filter((r) => inMonth(r.entryDate)).length;
  const avgSeverity = completed.length
    ? completed.reduce((sum, r) => sum + (r.severity || 0), 0) /
      completed.length
    : 0;

  const serviceCounts: Record<string, number> = {};
  completed.forEach((r) => {
    if (r.serviceType)
      serviceCounts[r.serviceType] = (serviceCounts[r.serviceType] || 0) + 1;
  });
  const topService =
    Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "None yet";

  return {
    // Short form: "September avg" does not fit a tile on an iPad.
    monthName: now.toLocaleString("en-US", { month: "short" }),
    completed: completed.length,
    intake,
    avgSeverity,
    topService,
  };
};

// Bright sev-* tokens are safe as large numbers on the dark ground (see controls.ts).
const severityText = (avg: number) =>
  avg >= 4.5
    ? "text-sev-5"
    : avg >= 3.5
      ? "text-sev-4"
      : avg >= 2.5
        ? "text-sev-3"
        : avg >= 1.5
          ? "text-sev-2"
          : "text-sev-1";

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
      className={`${base} hover:border-amstar-ink-faint hover:bg-amstar-raised transition-colors`}
    >
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
};

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

/**
 * A fixed-size dashboard panel. The body scrolls on its own, so a long list
 * never pushes the rest of the dashboard off screen.
 */
const Panel: React.FC<{
  title: string;
  count?: number;
  alarm?: boolean;
  onOpen?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ title, count, alarm = false, onOpen, className = "", children }) => {
  const heading = (
    <>
      <h3 className="font-cond text-sm uppercase tracking-widest text-amstar-ink-dim group-hover:text-amstar-ink transition-colors truncate">
        {title}
      </h3>
      {count !== undefined && (
        <span
          className={`font-mono text-xl font-bold tabular-nums ${count > 0 && alarm ? "text-amstar-red-ink" : "text-amstar-ink"}`}
        >
          {count}
        </span>
      )}
    </>
  );
  const headClass =
    "shrink-0 flex items-baseline justify-between gap-3 px-4 py-2.5 border-b border-amstar-line-soft";
  return (
    <section
      className={`${PANEL_STYLE} flex flex-col min-h-0 min-w-0 overflow-hidden ${className}`}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={`${headClass} group text-left hover:bg-amstar-raised transition-colors`}
        >
          {heading}
        </button>
      ) : (
        <div className={headClass}>{heading}</div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">{children}</div>
    </section>
  );
};

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-amstar-ink-faint py-2">{children}</p>
);

const TicketRow: React.FC<{
  repair: VehicleRepair;
  onOpen: () => void;
  badge: React.ReactNode;
  meta?: string;
}> = ({ repair, onOpen, badge, meta }) => (
  <li>
    <button
      type="button"
      onClick={onOpen}
      className="w-full min-h-11 flex items-center justify-between gap-3 px-2 py-1.5 -mx-2 rounded-sm text-left hover:bg-amstar-raised transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-amstar-ink truncate">
          {vehicleLabel(repair)}
        </span>
        <span className="block text-xs text-amstar-ink-dim truncate">
          {repair.customerName}
          {meta ? ` · ${meta}` : ""}
        </span>
      </span>
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

const severityBadge = (r: VehicleRepair) => (
  <Badge
    className={`${getSeverityColor(r.severity)} ${getSeverityGlow(r.severity)}`}
  >
    Level {r.severity}
  </Badge>
);

// ---------------------------------------------------------------------------
// Technician workload
// ---------------------------------------------------------------------------

const TechnicianWorkload: React.FC<{
  repairs: VehicleRepair[];
  technicianNames: string[];
  today: string;
  onOpenTech: (name: string) => void;
}> = ({ repairs, technicianNames, today, onOpenTech }) => {
  const active = repairs.filter(isActive);
  const rows = technicianNames
    .map((name) => {
      const mine = active.filter((r) =>
        technicianList(r).some((t) => t.toLowerCase() === name.toLowerCase()),
      );
      return {
        name,
        active: mine.length,
        major: mine.filter((r) => r.severity >= 4).length,
        overdue: mine.filter((r) => isOverdue(r, today)).length,
      };
    })
    .sort((a, b) => b.active - a.active || a.name.localeCompare(b.name));

  if (rows.length === 0) return <Empty>No technicians on the roster.</Empty>;

  const cell = "w-10 shrink-0 text-center font-mono tabular-nums text-sm";

  return (
    <>
      <div className="sticky -top-2 z-10 -mt-2 -mx-4 pl-4 pr-8 py-1 bg-amstar-surface border-b border-amstar-line-soft flex items-center gap-1 text-[10px] font-cond uppercase tracking-widest text-amstar-ink-faint">
        <span className="flex-1">Technician</span>
        <span className="w-10 text-center">Active</span>
        <span className="w-10 text-center" title="Level 4-5 jobs">
          L4-5
        </span>
        <span className="w-10 text-center">Late</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.name}>
            <button
              type="button"
              onClick={() => onOpenTech(row.name)}
              className="w-full min-h-11 flex items-center gap-1 px-2 py-1 -mx-2 rounded-sm text-left hover:bg-amstar-raised transition-colors"
            >
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amstar-ink truncate">
                    {row.name}
                  </span>
                  {row.active === 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-sev-1 text-black font-cond uppercase tracking-wider text-[10px]">
                      Available
                    </span>
                  )}
                </span>
              </span>
              <span className={`${cell} font-bold text-amstar-ink`}>
                {row.active}
              </span>
              <span
                className={`${cell} ${row.major > 0 ? "text-amstar-ink font-bold" : "text-amstar-ink-faint"}`}
              >
                {row.major}
              </span>
              <span
                className={`${cell} ${row.overdue > 0 ? "text-amstar-red-ink font-bold" : "text-amstar-ink-faint"}`}
              >
                {row.overdue}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};

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
  DUE_DATE: "moved the due date on",
  CUSTOMER: "corrected the customer on",
  DELETED: "deleted",
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
  DUE_DATE: "bg-sev-3",
  CUSTOMER: "bg-amstar-ink-faint",
  DELETED: "bg-sev-5",
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
      {activity.map((event) => (
        <li key={event.id} className="py-2 flex gap-3">
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

  const today = localISODate();
  const tomorrow = localISODate(1);
  const month = monthlyStats(repairs);

  const pendingCount = repairs.filter((r) => r.status === "PENDING").length;
  const inProgressCount = repairs.filter(
    (r) => r.status === "IN_PROGRESS",
  ).length;

  const overdue = repairs
    .filter((r) => isOverdue(r, today))
    .sort((a, b) => daysLate(b, today) - daysLate(a, today));
  const dueToday = repairs.filter((r) => isDueOn(r, today));
  const dueTomorrow = repairs.filter((r) => isDueOn(r, tomorrow));
  const dueSoon = [...overdue, ...dueToday, ...dueTomorrow];
  const unassigned = repairs
    .filter(isUnassigned)
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  const critical = repairs
    .filter((r) => r.status === "PENDING" && r.severity >= 4)
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  const unbilled = repairs
    .filter(isUnbilled)
    .sort((a, b) =>
      (b.actualCompletionDate || "").localeCompare(
        a.actualCompletionDate || "",
      ),
    );

  const dueBadge = (r: VehicleRepair) => {
    if (isOverdue(r, today))
      return <Badge className="bg-sev-5">{daysLate(r, today)}d late</Badge>;
    if (r.expectedCompletionDate === today)
      return <Badge className="bg-sev-3">Today</Badge>;
    return <Badge className="bg-sev-2">Tomorrow</Badge>;
  };
  const dueFilter = (r: VehicleRepair) =>
    isOverdue(r, today)
      ? "overdue"
      : r.expectedCompletionDate === today
        ? "due-today"
        : "due-tomorrow";

  const summaryChip = (label: string, count: number, filter: string) => (
    <button
      type="button"
      onClick={() => openQueue(filter)}
      disabled={count === 0}
      className="min-h-8 px-2 py-1 rounded-sm border border-amstar-line text-xs text-amstar-ink-dim hover:text-amstar-ink hover:bg-amstar-raised disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
    >
      <span className="font-mono font-bold tabular-nums text-amstar-ink">
        {count}
      </span>{" "}
      {label}
    </button>
  );

  return (
    <div className={`flex flex-col gap-3 ${DASHBOARD_HEIGHT}`}>
      {/* Header */}
      <div className="shrink-0 flex items-end justify-between gap-3 border-b-2 border-amstar-red pb-1.5">
        <h2 className="font-cond text-xl font-bold uppercase tracking-wider text-amstar-ink">
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

      {/* Stat strip: right now | this month */}
      <div className="shrink-0 flex flex-wrap gap-2">
        <StatTile
          label="Pending"
          value={pendingCount}
          onOpen={() => openQueue("pending")}
        />
        <StatTile
          label="In Progress"
          value={inProgressCount}
          onOpen={() => openQueue("in-progress")}
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          valueClass={
            overdue.length ? "text-amstar-red-ink" : "text-amstar-ink"
          }
          onOpen={() => openQueue("overdue")}
        />
        <StatTile
          label="Unassigned"
          value={unassigned.length}
          valueClass={
            unassigned.length ? "text-amstar-red-ink" : "text-amstar-ink"
          }
          onOpen={() => openQueue("unassigned")}
        />
        {isAdmin && (
          <StatTile
            label="Not Billed"
            value={unbilled.length}
            valueClass={
              unbilled.length ? "text-amstar-red-ink" : "text-amstar-ink"
            }
            onOpen={() => navigate("/pricing?filter=unbilled")}
          />
        )}
        <div
          className="hidden lg:block w-px self-stretch bg-amstar-line mx-1"
          aria-hidden="true"
        />
        <StatTile
          label="Completed"
          value={month.completed}
          sub={month.monthName}
          valueClass="text-sev-1"
          onOpen={() => navigate("/history")}
        />
        <StatTile
          label="New Intake"
          value={month.intake}
          sub={month.monthName}
          valueClass="text-sev-2"
        />
        <StatTile
          label="Severity"
          value={month.avgSeverity.toFixed(1)}
          sub={`${month.monthName} avg`}
          valueClass={severityText(month.avgSeverity)}
        />
        <div className={`${PANEL_STYLE} flex-[2] min-w-[128px] px-3 py-2`}>
          <span className="block font-cond text-[10px] uppercase tracking-widest text-amstar-ink-dim">
            Top Service
          </span>
          <span
            className="block text-sm font-bold text-amstar-ink leading-tight line-clamp-2"
            title={month.topService}
          >
            {month.topService}
          </span>
          <span className="block text-[10px] text-amstar-ink-faint">
            {month.monthName}
          </span>
        </div>
      </div>

      {/*
        Panel grid. DOM order is chosen so both layouts read well:
          lg (3x2): due soon | unassigned | critical  /  workload | not billed | activity
          sm (2x3): due soon | unassigned  /  critical | workload  /  not billed | activity
        Shop view has no "not billed" panel, so activity widens to fill its row.
      */}
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:grid-rows-[repeat(3,minmax(180px,1fr))] lg:grid-cols-3 lg:grid-rows-[repeat(2,minmax(180px,1fr))]">
        <Panel
          title="Overdue & Due Soon"
          count={dueSoon.length}
          alarm={overdue.length > 0}
          onOpen={() => openQueue("due-soon")}
        >
          {dueSoon.length === 0 ? (
            <Empty>Nothing is late or due by tomorrow.</Empty>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 py-1">
                {summaryChip("overdue", overdue.length, "overdue")}
                {summaryChip("today", dueToday.length, "due-today")}
                {summaryChip("tomorrow", dueTomorrow.length, "due-tomorrow")}
              </div>
              <ul>
                {dueSoon.map((r) => (
                  <TicketRow
                    key={r.id}
                    repair={r}
                    onOpen={() => openQueue(dueFilter(r))}
                    badge={dueBadge(r)}
                    meta={technicianList(r).join(", ") || "Unassigned"}
                  />
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel
          title="Unassigned Jobs"
          count={unassigned.length}
          alarm
          onOpen={() => openQueue("unassigned")}
        >
          {unassigned.length === 0 ? (
            <Empty>Every active job has a technician.</Empty>
          ) : (
            <ul>
              {unassigned.map((r) => (
                <TicketRow
                  key={r.id}
                  repair={r}
                  onOpen={() => openQueue("unassigned")}
                  badge={severityBadge(r)}
                  meta={r.status === "IN_PROGRESS" ? "In progress" : "Pending"}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Critical Pending"
          count={critical.length}
          alarm
          onOpen={() => openQueue("critical")}
        >
          {critical.length === 0 ? (
            <Empty>No Level 4-5 tickets are waiting to start.</Empty>
          ) : (
            <ul>
              {critical.map((r) => (
                <TicketRow
                  key={r.id}
                  repair={r}
                  onOpen={() => openQueue("critical")}
                  badge={severityBadge(r)}
                  meta={`Score ${r.priorityScore?.toFixed(0) ?? "—"}`}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Technician Workload">
          <TechnicianWorkload
            repairs={repairs}
            technicianNames={technicianNames}
            today={today}
            onOpenTech={(name) => openQueue(`tech:${name}`)}
          />
        </Panel>

        {/* Prices are admin-only; shop view never sees this panel. */}
        {isAdmin && (
          <Panel
            title="Completed, Not Billed"
            count={unbilled.length}
            alarm
            onOpen={() => navigate("/pricing?filter=unbilled")}
          >
            {unbilled.length === 0 ? (
              <Empty>Every completed job has been priced.</Empty>
            ) : (
              <ul>
                {unbilled.map((r) => (
                  <TicketRow
                    key={r.id}
                    repair={r}
                    onOpen={() => navigate("/pricing?filter=unbilled")}
                    badge={<Badge className="bg-sev-3">$0.00</Badge>}
                    meta={
                      r.actualCompletionDate
                        ? `Done ${r.actualCompletionDate}`
                        : "Completed"
                    }
                  />
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel
          title="Recent Activity"
          className={isAdmin ? "" : "sm:col-span-2"}
        >
          <ActivityFeed activity={activity} />
        </Panel>
      </div>
    </div>
  );
};
