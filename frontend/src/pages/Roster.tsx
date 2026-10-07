import React, { useState } from "react";

import type { Technician, VehicleRepair } from "../types/repair";
import {
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  SHARED_INPUT_STYLE,
} from "../styles/controls";
import { isActive, technicianList } from "../lib/ticketFilters";

const ACTION_BUTTON =
  "shrink-0 min-h-10 px-3 py-1.5 rounded-sm border font-cond uppercase tracking-widest text-xs transition-colors";

/**
 * The shop roster: add a technician, fix a misspelled name, take someone off
 * the list, put them back.
 *
 * Nobody is ever deleted - a ticket from last year has to keep pointing at a
 * real person, and the database enforces that. Removing only takes the name out
 * of the assignment dropdowns. Renaming is safe for the same reason: tickets
 * reference the technician's row, so a correction reaches every ticket.
 */
export const Roster: React.FC<{
  technicians: Technician[];
  repairs: VehicleRepair[];
  onAddTechnician: (fullName: string) => Promise<boolean>;
  onRenameTechnician: (id: number, fullName: string) => Promise<boolean>;
  onSetTechnicianActive: (id: number, isActive: boolean) => void;
}> = ({
  technicians,
  repairs,
  onAddTechnician,
  onRenameTechnician,
  onSetTechnicianActive,
}) => {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  // Open tickets per technician, so nobody is taken off the roster without
  // seeing what is still assigned to them.
  const openCount = (name: string) =>
    repairs.filter(
      (r) =>
        isActive(r) &&
        technicianList(r).some((t) => t.toLowerCase() === name.toLowerCase()),
    ).length;

  const active = technicians.filter((t) => t.isActive);
  const inactive = technicians.filter((t) => !t.isActive);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    // Only clear the box on success, so a rejected name is not lost.
    if (await onAddTechnician(name)) setNewName("");
    setSaving(false);
  };

  const startEdit = (tech: Technician) => {
    setEditingId(tech.id);
    setEditName(tech.fullName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (tech: Technician) => {
    const name = editName.trim();
    if (!name || saving) return;
    // Nothing typed but the same name: treat it as a cancel, not a save.
    if (name === tech.fullName) return cancelEdit();
    setSaving(true);
    if (await onRenameTechnician(tech.id, name)) cancelEdit();
    setSaving(false);
  };

  const row = (tech: Technician) => {
    const open = openCount(tech.fullName);

    if (editingId === tech.id) {
      return (
        <li
          key={tech.id}
          className="flex items-center gap-2 px-4 py-2 border-b border-amstar-line-soft last:border-0"
        >
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit(tech);
              }
              if (e.key === "Escape") cancelEdit();
            }}
            maxLength={120}
            autoFocus
            className={SHARED_INPUT_STYLE}
          />
          <button
            type="button"
            onClick={() => saveEdit(tech)}
            disabled={!editName.trim() || saving}
            className={`${ACTION_BUTTON} border-amstar-red bg-amstar-red text-white hover:bg-red-700 disabled:opacity-40`}
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className={`${ACTION_BUTTON} border-amstar-line text-amstar-ink-dim hover:bg-amstar-raised hover:text-amstar-ink`}
          >
            Cancel
          </button>
        </li>
      );
    }

    return (
      <li
        key={tech.id}
        className="flex items-center gap-2 px-4 py-2 border-b border-amstar-line-soft last:border-0"
      >
        <span className="flex-1 min-w-0 text-sm font-bold text-amstar-ink truncate">
          {tech.fullName}
        </span>
        <span className="shrink-0 font-mono tabular-nums text-xs text-amstar-ink-dim">
          {open > 0 ? `${open} open` : "-"}
        </span>
        <button
          type="button"
          onClick={() => startEdit(tech)}
          className={`${ACTION_BUTTON} border-amstar-line text-amstar-ink-dim hover:bg-amstar-raised hover:text-amstar-ink`}
        >
          Rename
        </button>
        <button
          type="button"
          onClick={() => onSetTechnicianActive(tech.id, !tech.isActive)}
          className={`${ACTION_BUTTON} ${
            tech.isActive
              ? "border-amstar-red text-amstar-red-ink hover:bg-amstar-red hover:text-white"
              : "border-amstar-line text-amstar-ink-dim hover:bg-amstar-raised hover:text-amstar-ink"
          }`}
        >
          {tech.isActive ? "Remove" : "Bring back"}
        </button>
      </li>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
          Shop Roster
        </h2>
        <p className="mt-1 text-sm text-amstar-ink-dim">
          Who can be assigned to a ticket. Renaming fixes the name everywhere,
          old tickets included. Removing someone hides them from the assignment
          lists; the tickets they already worked on keep their name.
        </p>
      </div>

      <form onSubmit={submit} className={`${PANEL_STYLE} p-4 flex gap-3`}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={120}
          placeholder="New technician's name"
          className={SHARED_INPUT_STYLE}
        />
        <button
          type="submit"
          disabled={!newName.trim() || saving}
          className="shrink-0 min-h-11 px-5 bg-amstar-red hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-amstar-red text-white rounded-sm font-cond uppercase tracking-widest text-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition-colors"
        >
          Add
        </button>
      </form>

      <section className={PANEL_STYLE}>
        <h3
          className={`${PANEL_HEADING_STYLE} text-sm px-4 py-2.5 border-b border-amstar-line-soft flex items-baseline justify-between gap-3`}
        >
          <span>On the roster</span>
          <span className="font-mono text-base tabular-nums text-amstar-ink">
            {active.length}
          </span>
        </h3>
        {active.length === 0 ? (
          <p className="px-4 py-6 text-sm text-amstar-ink-faint">
            Nobody on the roster. Add a technician above.
          </p>
        ) : (
          <ul>{active.map(row)}</ul>
        )}
      </section>

      {inactive.length > 0 && (
        <section className={PANEL_STYLE}>
          <h3
            className={`${PANEL_HEADING_STYLE} text-sm px-4 py-2.5 border-b border-amstar-line-soft flex items-baseline justify-between gap-3`}
          >
            <span>No longer here</span>
            <span className="font-mono text-base tabular-nums text-amstar-ink-dim">
              {inactive.length}
            </span>
          </h3>
          <ul>{inactive.map(row)}</ul>
        </section>
      )}
    </div>
  );
};
