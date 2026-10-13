import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  SHARED_INPUT_STYLE,
  PANEL_STYLE,
  LABEL_STYLE,
  PRIMARY_BUTTON_STYLE,
} from "../styles/controls";
import { API_BASE } from "../config";

/**
 * Claiming an invited account: the first password someone sets.
 *
 * Deliberately a separate page and a separate endpoint from the password
 * reset, even though the two share a token table. This is the only path that
 * activates an account, and keeping them apart is what stops a reset link
 * reviving an account a manager switched off.
 */
export const AcceptInvite: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not set the password.");
        return;
      }
      navigate("/login");
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div
          className={`${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md text-center`}
        >
          <p className="text-sm text-amstar-ink-dim mb-6">
            This invite link is missing its token. Ask the shop for a new one.
          </p>
          <Link
            to="/login"
            className="text-amstar-red-ink font-bold hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className={`${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md`}>
        <h1 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink border-b-2 border-amstar-red pb-1.5 mb-6">
          Set your password
        </h1>
        <p className="text-sm text-amstar-ink-dim mb-6">
          Choose a password and your account is ready.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={LABEL_STYLE} htmlFor="invite-password">
              Password
            </label>
            <input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={SHARED_INPUT_STYLE}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={LABEL_STYLE} htmlFor="invite-confirm">
              Confirm password
            </label>
            <input
              id="invite-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={SHARED_INPUT_STYLE}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm font-bold text-amstar-red-ink">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`${PRIMARY_BUTTON_STYLE} w-full py-3`}
          >
            {isSubmitting ? "Saving..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
};
