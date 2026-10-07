import React from "react";
import { HOVER, PANEL_STYLE } from "../../styles/controls";

/**
 * A fixed-size dashboard panel. The body scrolls on its own, so a long list
 * never pushes the rest of the dashboard off screen.
 */
export const Panel: React.FC<{
  title: string;
  count?: number;
  alarm?: boolean;
  onOpen?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ title, count, alarm = false, onOpen, className = "", children }) => {
  const heading = (
    <>
      <h3
        className={`font-cond text-sm uppercase tracking-widest text-amstar-ink-dim group-hover:text-amstar-ink truncate ${HOVER}`}
      >
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
          className={`${headClass} group text-left hover:bg-amstar-raised ${HOVER}`}
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

export const Empty: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <p className="text-sm text-amstar-ink-faint py-2">{children}</p>;
