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

const CARD_HEADING =
  "font-cond text-base uppercase tracking-widest text-amstar-ink-dim";

const MonthlyReportCard = ({ repairs }: { repairs: VehicleRepair[] }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthName = monthNames[now.getMonth()];

  const isThisMonth = (dateString?: string | null) => {
    if (!dateString) return false;
    const [yearStr, monthStr] = dateString.split("-");
    if (!yearStr || !monthStr) return false;
    return (
      parseInt(yearStr) === currentYear && parseInt(monthStr) === currentMonth
    );
  };

  const completedThisMonth = repairs.filter(
    (r) => r.status === "COMPLETED" && isThisMonth(r.actualCompletionDate),
  );
  const intakeThisMonth = repairs.filter((r) => isThisMonth(r.entryDate));

  const avgSeverityStr =
    completedThisMonth.length > 0
      ? (
          completedThisMonth.reduce((sum, r) => sum + (r.severity || 0), 0) /
          completedThisMonth.length
        ).toFixed(1)
      : "0.0";

  const avgSeverityNum = parseFloat(avgSeverityStr);
  let avgTextColor = "text-sev-1";
  if (avgSeverityNum >= 4.5) avgTextColor = "text-sev-5";
  else if (avgSeverityNum >= 3.5) avgTextColor = "text-sev-4";
  else if (avgSeverityNum >= 2.5) avgTextColor = "text-sev-3";
  else if (avgSeverityNum >= 1.5) avgTextColor = "text-sev-2";

  const serviceCounts: Record<string, number> = {};
  completedThisMonth.forEach((r) => {
    if (r.serviceType) {
      serviceCounts[r.serviceType] = (serviceCounts[r.serviceType] || 0) + 1;
    }
  });

  let topService = "None Yet";
  let maxCount = 0;
  Object.entries(serviceCounts).forEach(([service, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topService = service;
    }
  });

  return (
    <div className={`${PANEL_STYLE} p-6`}>
      <div className="flex justify-between items-end border-b border-amstar-line-soft pb-3 mb-4">
        <div>
          <h3 className="font-cond text-lg font-bold text-amstar-ink uppercase tracking-wider">
            Shop Performance Report
          </h3>
          <p className="font-cond text-xs text-amstar-ink-dim uppercase tracking-widest">
            {monthName} {currentYear}
          </p>
        </div>
        <span className="bg-amstar-raised text-amstar-ink-dim font-cond uppercase tracking-widest px-3 py-1 rounded-sm text-[11px] border border-amstar-line">
          Live Data
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-amstar-line-soft">
        <div className="px-4 text-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">
            Completed
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-sev-1">
            {completedThisMonth.length}
          </span>
          <span className="block text-[10px] text-amstar-ink-faint font-medium mt-1">
            Vehicles fixed
          </span>
        </div>

        <div className="px-4 text-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">
            New Intake
          </span>
          <span className="font-mono text-3xl font-bold tabular-nums text-sev-2">
            {intakeThisMonth.length}
          </span>
          <span className="block text-[10px] text-amstar-ink-faint font-medium mt-1">
            Vehicles added
          </span>
        </div>

        <div className="px-4 text-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">
            Avg Severity
          </span>
          <span
            className={`font-mono text-3xl font-bold tabular-nums transition-colors ${avgTextColor}`}
          >
            {avgSeverityStr}
          </span>
          <span className="block text-[10px] text-amstar-ink-faint font-medium mt-1">
            Out of 5.0
          </span>
        </div>

        <div className="px-4 text-center flex flex-col justify-center">
          <span className="block font-cond text-xs text-amstar-ink-dim uppercase tracking-wider mb-1">
            Top Service
          </span>
          <span className="text-sm font-bold text-amstar-ink leading-tight line-clamp-2">
            {topService}
          </span>
        </div>
      </div>
    </div>
  );
};

const CircularProgress = ({
  percent,
  color,
  label,
  count,
  onClick,
}: {
  percent: number;
  color: string;
  label: string;
  count: number;
  onClick: () => void;
}) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Show ${label.toLowerCase()}`}
      className={`${PANEL_STYLE} flex flex-col items-center p-6 flex-1 hover:border-amstar-ink-faint transition-colors`}
    >
      <svg width="100" height="100" aria-hidden="true">
        <circle
          stroke="#162b48"
          fill="transparent"
          strokeWidth="8"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth="8"
          r={radius}
          cx="50"
          cy="50"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          transform="rotate(-90 50 50)"
        />
        {/* Tick marks at the cardinal points */}
        <g stroke="#2d5590" strokeWidth="1.5">
          <line x1="50" y1="4" x2="50" y2="10" />
          <line x1="96" y1="50" x2="90" y2="50" />
          <line x1="50" y1="96" x2="50" y2="90" />
          <line x1="4" y1="50" x2="10" y2="50" />
        </g>
        <text
          x="50"
          y="50"
          fill="#eef3fa"
          fontSize="1.5rem"
          fontWeight="bold"
          textAnchor="middle"
          dy=".3em"
          fontFamily='"Roboto Mono", ui-monospace, monospace'
        >
          {count}
        </text>
      </svg>
      <div className="font-cond uppercase tracking-widest text-sm text-amstar-ink-dim mt-3 text-center">
        {label}
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Needs-attention cards
// ---------------------------------------------------------------------------

/** A card whose heading and rows link to the list of tickets it counts. */
const AttentionCard: React.FC<{
  title: string;
  count: number;
  alarm?: boolean;
  onOpen: () => void;
  empty: string;
  children: React.ReactNode;
}> = ({ title, count, alarm = false, onOpen, empty, children }) => (
  <div className={`${PANEL_STYLE} p-5 flex flex-col min-w-0`}>
    <button
      type="button"
      onClick={onOpen}
      className="flex items-baseline justify-between gap-3 border-b border-amstar-line-soft pb-3 mb-3 text-left group"
    >
      <h3
        className={`${CARD_HEADING} group-hover:text-amstar-ink transition-colors`}
      >
        {title}
      </h3>
      <span
        className={`font-mono text-2xl font-bold tabular-nums ${count > 0 && alarm ? "text-amstar-red-ink" : "text-amstar-ink"}`}
      >
        {count}
      </span>
    </button>
    {count === 0 ? (
      <p className="text-sm text-amstar-ink-faint">{empty}</p>
    ) : (
      children
    )}
  </div>
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
      className="w-full min-h-11 flex items-center justify-between gap-3 px-2 py-2 -mx-2 rounded-sm text-left hover:bg-amstar-raised transition-colors"
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

const MAX_ROWS = 5;

const MoreLink: React.FC<{ hidden: number; onOpen: () => void }> = ({
  hidden,
  onOpen,
}) =>
  hidden > 0 ? (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 min-h-9 text-xs font-bold text-amstar-red-ink hover:underline self-start"
    >
      +{hidden} more
    </button>
  ) : null;

// ---------------------------------------------------------------------------
// Technician workload
// ---------------------------------------------------------------------------

const TechnicianWorkloadCard: React.FC<{
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
        inProgress: mine.filter((r) => r.status === "IN_PROGRESS").length,
        major: mine.filter((r) => r.severity >= 4).length,
        overdue: mine.filter((r) => isOverdue(r, today)).length,
      };
    })
    .sort((a, b) => b.active - a.active || a.name.localeCompare(b.name));

  const cell = "w-12 text-center font-mono tabular-nums";

  return (
    <div className={`${PANEL_STYLE} p-5 min-w-0`}>
      <h3
        className={`${CARD_HEADING} border-b border-amstar-line-soft pb-3 mb-2`}
      >
        Technician Workload
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-amstar-ink-faint">
          No technicians on the roster.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 px-2 pb-1 text-[10px] font-cond uppercase tracking-widest text-amstar-ink-faint">
            <span className="flex-1">Technician</span>
            <span className="w-12 text-center">Active</span>
            <span className="w-12 text-center">Bay</span>
            <span className="w-12 text-center">Lvl 4-5</span>
            <span className="w-12 text-center">Late</span>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.name}>
                <button
                  type="button"
                  onClick={() => onOpenTech(row.name)}
                  className="w-full min-h-11 flex items-center gap-2 px-2 rounded-sm text-left hover:bg-amstar-raised transition-colors"
                >
                  <span className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-bold text-amstar-ink truncate">
                      {row.name}
                    </span>
                    {row.active === 0 && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-sev-1 text-black font-cond uppercase tracking-wider text-[10px]">
                        Available
                      </span>
                    )}
                  </span>
                  <span className={`${cell} text-sm font-bold text-amstar-ink`}>
                    {row.active}
                  </span>
                  <span className={`${cell} text-sm text-amstar-ink-dim`}>
                    {row.inProgress}
                  </span>
                  <span
                    className={`${cell} text-sm ${row.major > 0 ? "text-amstar-ink font-bold" : "text-amstar-ink-faint"}`}
                  >
                    {row.major}
                  </span>
                  <span
                    className={`${cell} text-sm ${row.overdue > 0 ? "text-amstar-red-ink font-bold" : "text-amstar-ink-faint"}`}
                  >
                    {row.overdue}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
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

const ActivityFeedCard: React.FC<{ activity: TicketActivity[] }> = ({
  activity,
}) => (
  <div className={`${PANEL_STYLE} p-5 min-w-0`}>
    <h3
      className={`${CARD_HEADING} border-b border-amstar-line-soft pb-3 mb-2`}
    >
      Recent Activity
    </h3>
    {activity.length === 0 ? (
      <p className="text-sm text-amstar-ink-faint">
        No activity yet. Changes to tickets will show up here.
      </p>
    ) : (
      <ul className="max-h-80 overflow-y-auto divide-y divide-amstar-line-soft">
        {activity.map((event) => (
          <li key={event.id} className="py-2.5 flex gap-3">
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
    )}
  </div>
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

  const totalRepairs = repairs.length;
  const pendingCount = repairs.filter((r) => r.status === "PENDING").length;
  const inProgressCount = repairs.filter(
    (r) => r.status === "IN_PROGRESS",
  ).length;
  const completedCount = repairs.filter((r) => r.status === "COMPLETED").length;

  const pendingPercent =
    totalRepairs === 0 ? 0 : (pendingCount / totalRepairs) * 100;
  const inProgressPercent =
    totalRepairs === 0 ? 0 : (inProgressCount / totalRepairs) * 100;
  const completedPercent =
    totalRepairs === 0 ? 0 : (completedCount / totalRepairs) * 100;

  const activeWorkers = repairs.filter(
    (r) => r.status === "IN_PROGRESS" && r.assignedWorker,
  );
  const criticalPending = repairs
    .filter((r) => r.status === "PENDING" && r.severity >= 4)
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  // Needs attention
  const overdue = repairs
    .filter((r) => isOverdue(r, today))
    .sort((a, b) => daysLate(b, today) - daysLate(a, today));
  const dueToday = repairs.filter((r) => isDueOn(r, today));
  const dueTomorrow = repairs.filter((r) => isDueOn(r, tomorrow));
  const dueSoon = [...overdue, ...dueToday, ...dueTomorrow];
  const unassigned = repairs
    .filter(isUnassigned)
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
    <div className="space-y-6">
      <div className="border-b-2 border-amstar-red pb-2">
        <h2 className="font-cond text-2xl font-bold uppercase tracking-wider text-amstar-ink">
          Real-Time Shop Metrics
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CircularProgress
          percent={pendingPercent}
          color="#f0a02a"
          label="Vehicles Pending"
          count={pendingCount}
          onClick={() => openQueue("pending")}
        />
        <CircularProgress
          percent={inProgressPercent}
          color="#38bdf8"
          label="Vehicles In Progress"
          count={inProgressCount}
          onClick={() => openQueue("in-progress")}
        />
        <CircularProgress
          percent={completedPercent}
          color="#10b981"
          label="Vehicles Completed"
          count={completedCount}
          onClick={() => navigate("/history")}
        />
      </div>

      {/* Needs attention */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? "xl:grid-cols-3" : ""} gap-4`}
      >
        <AttentionCard
          title="Overdue & Due Soon"
          count={dueSoon.length}
          alarm={overdue.length > 0}
          onOpen={() => openQueue("due-soon")}
          empty="Nothing is late or due by tomorrow."
        >
          <div className="flex flex-wrap gap-1.5 mb-2">
            {summaryChip("overdue", overdue.length, "overdue")}
            {summaryChip("today", dueToday.length, "due-today")}
            {summaryChip("tomorrow", dueTomorrow.length, "due-tomorrow")}
          </div>
          <ul>
            {dueSoon.slice(0, MAX_ROWS).map((r) => (
              <TicketRow
                key={r.id}
                repair={r}
                onOpen={() => openQueue(dueFilter(r))}
                badge={dueBadge(r)}
                meta={technicianList(r).join(", ") || "Unassigned"}
              />
            ))}
          </ul>
          <MoreLink
            hidden={dueSoon.length - MAX_ROWS}
            onOpen={() => openQueue("due-soon")}
          />
        </AttentionCard>

        <AttentionCard
          title="Unassigned Jobs"
          count={unassigned.length}
          alarm
          onOpen={() => openQueue("unassigned")}
          empty="Every active job has a technician."
        >
          <ul>
            {unassigned.slice(0, MAX_ROWS).map((r) => (
              <TicketRow
                key={r.id}
                repair={r}
                onOpen={() => openQueue("unassigned")}
                badge={
                  <Badge
                    className={`${getSeverityColor(r.severity)} ${getSeverityGlow(r.severity)}`}
                  >
                    Level {r.severity}
                  </Badge>
                }
                meta={r.status === "IN_PROGRESS" ? "In progress" : "Pending"}
              />
            ))}
          </ul>
          <MoreLink
            hidden={unassigned.length - MAX_ROWS}
            onOpen={() => openQueue("unassigned")}
          />
        </AttentionCard>

        {/* Prices are admin-only; shop view never sees this card. */}
        {isAdmin && (
          <AttentionCard
            title="Completed, Not Billed"
            count={unbilled.length}
            alarm
            onOpen={() => navigate("/pricing?filter=unbilled")}
            empty="Every completed job has been priced."
          >
            <ul>
              {unbilled.slice(0, MAX_ROWS).map((r) => (
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
            <MoreLink
              hidden={unbilled.length - MAX_ROWS}
              onOpen={() => navigate("/pricing?filter=unbilled")}
            />
          </AttentionCard>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TechnicianWorkloadCard
          repairs={repairs}
          technicianNames={technicianNames}
          today={today}
          onOpenTech={(name) => openQueue(`tech:${name}`)}
        />
        <ActivityFeedCard activity={activity} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Bays */}
        <div className={`${PANEL_STYLE} p-6`}>
          <h3 className="font-cond text-base uppercase tracking-widest text-amstar-ink-dim border-b border-amstar-line-soft pb-3 mb-4">
            Active Bays (In Progress)
          </h3>
          {activeWorkers.length === 0 ? (
            <p className="text-sm text-amstar-ink-faint">
              No technicians are currently working on active jobs.
            </p>
          ) : (
            <ul className="divide-y divide-amstar-line-soft max-h-64 overflow-y-auto pr-2">
              {activeWorkers.map((item) => (
                <li key={item.id} className="py-3 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-sev-2 animate-pulse shrink-0" />
                  <div>
                    <span className="font-bold text-amstar-ink">
                      {item.assignedWorker}
                    </span>
                    <span className="text-xs text-amstar-ink-dim block">
                      {item.vehicle?.year} {item.vehicle?.make}{" "}
                      {item.vehicle?.model} — {item.serviceType}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Critical Approvals */}
        <div className={`${PANEL_STYLE} p-6`}>
          <h3 className="font-cond text-base uppercase tracking-widest text-amstar-red-ink border-b border-amstar-line-soft pb-3 mb-4">
            Critical Pending Vehicles
          </h3>
          {criticalPending.length === 0 ? (
            <p className="text-sm text-amstar-ink-faint">
              No critical tickets are pending.
            </p>
          ) : (
            <ul className="divide-y divide-amstar-line-soft max-h-64 overflow-y-auto pr-2">
              {criticalPending.map((item) => (
                <li
                  key={item.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div>
                    <strong className="text-amstar-ink text-sm">
                      {item.vehicle?.year} {item.vehicle?.make}{" "}
                      {item.vehicle?.model}
                    </strong>
                    <span className="text-xs text-amstar-ink-dim block">
                      {item.serviceType}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span
                      className={`px-2 py-0.5 ${SEVERITY_TEXT} rounded-sm font-cond text-xs uppercase tracking-wider ${getSeverityColor(item.severity)} ${getSeverityGlow(item.severity)}`}
                    >
                      Level {item.severity}
                    </span>
                    <span className="font-mono text-xs text-amstar-ink-faint block mt-0.5 tabular-nums">
                      Score: {item.priorityScore?.toFixed(1)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <MonthlyReportCard repairs={repairs} />
    </div>
  );
};
