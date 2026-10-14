import React, { useEffect, useState } from "react";

import type { Technician, VehicleRepair } from "../types/repair";
import {
  PANEL_STYLE,
  PANEL_HEADING_STYLE,
  SHARED_INPUT_STYLE,
  PRIMARY_BUTTON_STYLE,
  PRESS,
} from "../styles/controls";
import { isActive, technicianList } from "../lib/ticketFilters";
import { grantableRoles, mayManage, roleLabel } from "../lib/roles";
import { RowMenu } from "../components/RowMenu";

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
  /** The signed-in role, which decides what may be granted. */
  currentRole: string | null;
  onInvite: (id: number, email: string, role: string) => Promise<boolean>;
  onChangeRole: (id: number, role: string) => Promise<boolean>;
  onLinkAccount: (id: number, email: string) => Promise<boolean>;
  onUnlinkAccount: (id: number) => Promise<boolean>;
  onSetAccountActive: (id: number, active: boolean) => Promise<boolean>;
  /**
   * Whether this account may change anything. False for a technician, who can
   * reach this page but whose every write 403s at SecurityConfig - so the menu
   * would offer four actions that all silently do nothing.
   */
  canEdit: boolean;
}> = ({
  technicians,
  repairs,
  onAddTechnician,
  onRenameTechnician,
  onSetTechnicianActive,
  currentRole,
  onInvite,
  onChangeRole,
  onLinkAccount,
  onUnlinkAccount,
  onSetAccountActive,
  canEdit,
}) => {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  /*
   * Which row has its second line open, and which of the two things it is for.
   *
   * "invite" makes a new account; "link" points at one that already exists.
   * Both are the same shape - an email and a confirm - so they share a row and
   * differ only in what the button does.
   */
  const [formRow, setFormRow] = useState<{
    id: number;
    mode: "invite" | "link";
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const grantable = grantableRoles(currentRole);

  useEffect(() => {
    if (!formRow) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFormRow(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formRow]);

  const openForm = (tech: Technician, mode: "invite" | "link") => {
    setFormRow({ id: tech.id, mode });
    setInviteEmail("");
    setInviteRole(grantable[grantable.length - 1] ?? "");
  };

  const submitForm = async (tech: Technician) => {
    const email = inviteEmail.trim();
    if (!email || !formRow) return;
    setSaving(true);
    const ok =
      formRow.mode === "link"
        ? await onLinkAccount(tech.id, email)
        : inviteRole
          ? await onInvite(tech.id, email, inviteRole)
          : false;
    setSaving(false);
    if (ok) setFormRow(null);
  };

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
            className={`${ACTION_BUTTON} border-amstar-red bg-amstar-red text-white hover:bg-red-700 disabled:opacity-40 ${PRESS}`}
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className={`${ACTION_BUTTON} border-amstar-line text-amstar-ink-dim hover:bg-amstar-raised hover:text-amstar-ink ${PRESS}`}
          >
            Cancel
          </button>
        </li>
      );
    }

    return (
      <li
        key={tech.id}
        className="flex flex-col gap-2 px-4 py-2 border-b border-amstar-line-soft last:border-0"
      >
        {/*
          Two lines, not one. The invite form used to sit inline in this row:
          nine flex children in a 766px row measured 1368px of content, which
          squeezed the name to zero width and pushed Rename and Remove clean
          off the panel. The form gets its own line and the whole width.
        */}
        <div className="flex items-center gap-3">
          {/* An initial, not a photo. Gives the eye something to run down the
              left edge, which a list of bare names does not have. */}
          <span
            aria-hidden="true"
            className="shrink-0 grid place-items-center w-8 h-8 rounded-full
              bg-amstar-field border border-amstar-line
              font-cond text-xs font-bold text-amstar-ink-dim"
          >
            {tech.fullName.charAt(0).toUpperCase()}
          </span>

          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold text-amstar-ink truncate">
              {tech.fullName}
            </span>
            {/* "-" read as missing data rather than as zero. */}
            <span className="block text-[11px] text-amstar-ink-faint truncate">
              {open > 0
                ? `Assigned ${open} open ticket${open > 1 ? "s" : ""}`
                : "No open tickets"}
            </span>
          </span>

          {/* One chip treatment, two colours. A roster name with no account is
              the normal case, so it reads quietly rather than as an absence. */}
          {/*
            A revoked account must not look like a working one. That confusion
            is the whole reason this field exists: "Remove from roster" leaves
            the login alive, so a roster that rendered both the same was telling
            the manager something untrue about who can get in.
          */}
          <span
            className={`shrink-0 font-cond uppercase tracking-widest text-[10px] px-2 py-1 rounded-sm border ${
              !tech.role
                ? "border-transparent text-amstar-ink-faint"
                : tech.accountActive === false
                  ? "border-amstar-red-edge text-amstar-red-ink"
                  : "border-amstar-line bg-amstar-field text-amstar-ink-dim"
            }`}
          >
            {tech.role && tech.accountActive === false
              ? `${roleLabel(tech.role)} · revoked`
              : roleLabel(tech.role)}
          </span>

          {canEdit && (
          <RowMenu
            label={tech.fullName}
            actions={[
              ...(tech.role
                ? [
                    ...(mayManage(currentRole, tech.role)
                      ? grantable
                          .filter((r) => r !== tech.role)
                          .map((r) => ({
                            label: `Make ${roleLabel(r).toLowerCase()}`,
                            onSelect: () => onChangeRole(tech.id, r),
                          }))
                      : []),
                    {
                      label:
                        tech.accountActive === false
                          ? "Restore sign-in"
                          : "Revoke sign-in",
                      onSelect: () =>
                        onSetAccountActive(
                          tech.id,
                          tech.accountActive === false,
                        ),
                    },
                    {
                      label: "Unlink account",
                      onSelect: () => onUnlinkAccount(tech.id),
                    },
                  ]
                : [
                    ...(grantable.length > 0
                      ? [
                          {
                            label: "Invite to sign in",
                            onSelect: () => openForm(tech, "invite"),
                          },
                        ]
                      : []),
                    {
                      label: "Link existing account",
                      onSelect: () => openForm(tech, "link"),
                    },
                  ]),
              { label: "Rename", onSelect: () => startEdit(tech) },
              {
                label: tech.isActive ? "Remove from roster" : "Bring back",
                onSelect: () => onSetTechnicianActive(tech.id, !tech.isActive),
                destructive: tech.isActive,
              },
            ]}
          />
          )}
        </div>

        {formRow?.id === tech.id && (
          /* Wraps rather than overflows: on a narrow window the role buttons
             drop to their own line instead of pushing Send out of the panel. */
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={
                formRow.mode === "link"
                  ? "Their existing account email"
                  : "email@example.com"
              }
              aria-label={`${formRow.mode === "link" ? "Account" : "Invite"} email for ${tech.fullName}`}
              /* flex-1 with a floor, not a fixed width: SHARED_INPUT_STYLE
                 already carries w-full, and Tailwind emits w-full after the
                 numeric widths, so a `w-52` here would simply be ignored. */
              className={`${SHARED_INPUT_STYLE} flex-1 min-w-[14rem]`}
            />
            {formRow.mode === "invite" && (
              <span
                role="radiogroup"
                aria-label={`Invite role for ${tech.fullName}`}
                className="shrink-0 flex items-center gap-1"
              >
                {grantable.map((role) => (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={inviteRole === role}
                    onClick={() => setInviteRole(role)}
                    className={`${ACTION_BUTTON} ${PRESS} ${
                      inviteRole === role
                        ? "border-amstar-red-edge bg-amstar-raised text-amstar-ink"
                        : "border-amstar-line text-amstar-ink-dim hover:text-amstar-ink"
                    }`}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
              </span>
            )}
            <button
              type="button"
              disabled={saving || !inviteEmail.trim()}
              onClick={() => submitForm(tech)}
              className={`${PRIMARY_BUTTON_STYLE} shrink-0 min-h-10 px-4 text-xs`}
            >
              {formRow.mode === "link" ? "Link" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormRow(null);
                setInviteEmail("");
                setInviteRole(grantable[grantable.length - 1] ?? "");
              }}
              className={`${ACTION_BUTTON} shrink-0 border-amstar-line text-amstar-ink-dim hover:bg-amstar-raised hover:text-amstar-ink ${PRESS}`}
            >
              Cancel
            </button>
          </div>
        )}
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
          className={`${PRIMARY_BUTTON_STYLE} shrink-0 min-h-11 px-5 text-sm`}
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
