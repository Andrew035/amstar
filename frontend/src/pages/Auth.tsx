import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AmstarLogo } from "../components/AmstarLogo";
import { PasswordField } from "../components/PasswordField";
import {
  SHARED_INPUT_STYLE,
  LABEL_STYLE,
  PRIMARY_BUTTON_STYLE,
  PANEL_STYLE,
  HOVER,
  PRESS,
} from "../styles/controls";
import { API_BASE } from "../config";

/**
 * Sign in and sign up, as two faces of one card.
 *
 * This replaces a pair of pages that were the same centred box twice over -
 * same logo, same heading, same error banner, same footer link - differing
 * only in which fields they held. Merging them deleted that duplication and
 * made the switch a turn of one object rather than a page swap.
 *
 * The layout is a split rather than a card floating in the middle of an empty
 * screen. A centred 448px box on a 1280px viewport leaves three quarters of
 * the page saying nothing, and it is the shape every generated sign-in page
 * has. The left half carries the shop; the right half carries the work.
 */

/**
 * Three forms, two faces.
 *
 * A card has a front and a back, so the back carries whichever secondary form
 * was asked for. That works because of the shape of the navigation: both
 * "create one" and "forgot password" are reachable only from sign-in, never
 * from each other, so the back content only ever changes while the card is
 * facing front - where backface-visibility means nobody can see it change.
 *
 * All three stay mounted and grid-stacked so the card is always as tall as the
 * tallest, and the inactive back face is `invisible` rather than `hidden`: it
 * keeps its grid space, so swapping which form the back holds never resizes
 * the card.
 */
type Face = "login" | "register" | "forgot";

const FIELD_ROW = "space-y-1.5";

/** The small print under the form, one line, no stacked link soup. */
const SwitchLine: React.FC<{
  prompt: string;
  action: string;
  onClick: () => void;
}> = ({ prompt, action, onClick }) => (
  <p className="text-sm text-amstar-ink-dim">
    {prompt}{" "}
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center font-bold text-amstar-red-ink underline-offset-4 hover:underline ${HOVER} ${PRESS}`}
    >
      {action}
    </button>
  </p>
);

/** Error and success read the same shape, so they share one. */
const Notice: React.FC<{ tone: "bad" | "good"; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <p
    role="status"
    className={`rounded-sm px-3 py-2 text-sm font-bold ${
      tone === "bad"
        ? "bg-amstar-red/15 text-amstar-red-ink"
        : "bg-sev-1/15 text-sev-1"
    }`}
  >
    {children}
  </p>
);

export const Auth: React.FC<{
  initial: Face;
  onLoginSuccess: () => void;
}> = ({ initial, onLoginSuccess }) => {
  const [face, setFace] = useState<Face>(initial);
  /*
   * Which form sits on the back, held separately from which side is showing.
   *
   * These have to be two pieces of state. Deriving the back's visibility from
   * `face` meant that pressing "Back to sign in" hid the back on the very
   * frame the rotation began: the card blanked, turned empty, and the front
   * only appeared at the end. Keeping the back form put until you ask for a
   * different one means the face you are leaving stays on screen for the whole
   * turn, which is the only way the flip reads as one object.
   */
  const [backForm, setBackForm] = useState<Exclude<Face, "login">>(
    initial === "login" ? "register" : initial,
  );
  const navigate = useNavigate();

  // Sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Sign up
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [regError, setRegError] = useState("");
  const [regDone, setRegDone] = useState("");
  const [registering, setRegistering] = useState(false);

  // Reset link
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSigningIn(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many sign-in attempts. Wait a minute and try again.");
        }
        if (response.status === 401) {
          throw new Error("Invalid email or password");
        }
        throw new Error("Something went wrong signing in. Try again in a moment.");
      }
      const data = await response.json();
      localStorage.setItem("amstar_token", data.token);
      onLoginSuccess();
      navigate("/");
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Failed to connect to server.",
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegDone("");
    if (regPassword !== confirmPassword) {
      setRegError("Passwords do not match!");
      return;
    }
    setRegistering(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          signupCode,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Registration failed.");
      }
      // Turn back to the sign-in face rather than navigating: the account is
      // made, and the next thing they need is the form on the other side.
      setRegDone("Account created. Turning you back to sign in...");
      setEmail(regEmail);
      window.setTimeout(() => {
        setFace("login");
        setRegDone("");
      }, 1400);
    } catch (err) {
      setRegError(
        err instanceof Error ? err.message : "Failed to connect to server.",
      );
    } finally {
      setRegistering(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingLink(true);
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
    } catch {
      // The response is deliberately identical either way, so a network
      // failure shows the same confirmation rather than leaking a difference.
    }
    setForgotSent(true);
    setSendingLink(false);
  };

  /** Turn back to sign-in, leaving the face behind it clean for next time. */
  const backToSignIn = () => {
    setFace("login");
    setForgotSent(false);
  };

  /** Put a form on the back, then turn to it. */
  const turnTo = (form: Exclude<Face, "login">) => {
    setBackForm(form);
    setFace(form);
  };

  const faceProps = (side: Face) => ({
    "data-side": side === "login" ? "front" : "back",
    inert: face !== side ? true : undefined,
    // Hidden only to stop the two back forms overlapping, so it keys off
    // `backForm` rather than `face` - the form being turned away from must
    // stay visible until the card has finished turning.
    className: `flip-face ${PANEL_STYLE} flex flex-col p-7 sm:p-9 ${
      side !== "login" && side !== backForm ? "invisible" : ""
    }`,
  });

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] items-center justify-items-center gap-10 py-6 lg:grid-cols-[1fr_minmax(26rem,30rem)] lg:justify-items-stretch lg:gap-16">
      {/*
        The shop, at the size a sign is read from. This half used to be empty
        navy; a wordmark set small and centred over a form is the generic
        shape, and it wastes the only part of the screen that can say whose
        app this is.
      */}
      <aside className="hidden lg:flex flex-col justify-center">
        <div className="group max-w-md">
          <AmstarLogo size="page" />
        </div>
        <div className="mt-7 h-0.5 w-24 bg-amstar-red" />
        <p className="mt-6 max-w-md font-cond text-2xl uppercase leading-snug tracking-wide text-amstar-ink">
          Every vehicle in the shop, what it needs, who has it, and when it was
          promised.
        </p>
        <dl className="mt-10 flex gap-10 font-cond uppercase tracking-widest text-[11px] text-amstar-ink-faint">
          {[
            ["Queue", "Ranked by severity"],
            ["Floor", "Who has capacity"],
            ["Invoices", "What is owed"],
          ].map(([term, detail]) => (
            <div key={term}>
              <dt className="text-amstar-ink-dim">{term}</dt>
              <dd className="mt-1 normal-case tracking-normal">{detail}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="flip-scene w-full max-w-[30rem] lg:max-w-none">
        <div className="flip-card" data-face={face === "login" ? "front" : "back"}>
          {/* ---------------------------------------------------- sign in */}
          <section {...faceProps("login")}>
            <div className="group mb-7 lg:hidden">
              <AmstarLogo size="page" />
            </div>
            <h1 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
              Sign in
            </h1>
            <p className="mt-1 text-sm text-amstar-ink-faint">
              Shop floor access.
            </p>

            <form onSubmit={handleLogin} className="mt-7 space-y-5">
              {loginError && <Notice tone="bad">{loginError}</Notice>}
              <div className={FIELD_ROW}>
                <label className={LABEL_STYLE} htmlFor="auth-email">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={SHARED_INPUT_STYLE}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
              <div className={FIELD_ROW}>
                <label className={LABEL_STYLE} htmlFor="auth-password">
                  Password
                </label>
                <PasswordField
                  id="auth-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  label="password"
                />
              </div>
              <button
                type="submit"
                disabled={signingIn}
                className={`${PRIMARY_BUTTON_STYLE} w-full py-3`}
              >
                {signingIn ? "Authenticating..." : "Sign In"}
              </button>
            </form>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-amstar-line-soft pt-5">
              <SwitchLine
                prompt="No account?"
                action="Create one"
                onClick={() => turnTo("register")}
              />
              <button
                type="button"
                onClick={() => turnTo("forgot")}
                className={`inline-flex min-h-10 items-center text-sm text-amstar-ink-faint underline-offset-4 hover:text-amstar-ink hover:underline ${HOVER} ${PRESS}`}
              >
                Forgot password?
              </button>
            </div>
          </section>

          {/* --------------------------------------------------- sign up */}
          <section {...faceProps("register")}>
            <div className="group mb-7 lg:hidden">
              <AmstarLogo size="page" />
            </div>
            <h1 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
              Create account
            </h1>
            <p className="mt-1 text-sm text-amstar-ink-faint">
              You will need the shop signup code.
            </p>

            <form onSubmit={handleRegister} className="mt-7 space-y-4">
              {regError && <Notice tone="bad">{regError}</Notice>}
              {regDone && <Notice tone="good">{regDone}</Notice>}
              <div className={FIELD_ROW}>
                <label className={LABEL_STYLE} htmlFor="reg-email">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className={SHARED_INPUT_STYLE}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={FIELD_ROW}>
                  <label className={LABEL_STYLE} htmlFor="reg-password">
                    Password
                  </label>
                  <PasswordField
                    id="reg-password"
                    value={regPassword}
                    onChange={setRegPassword}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    label="password"
                  />
                </div>
                <div className={FIELD_ROW}>
                  <label className={LABEL_STYLE} htmlFor="reg-confirm">
                    Confirm
                  </label>
                  <PasswordField
                    id="reg-confirm"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    label="confirmation"
                  />
                </div>
              </div>
              <div className={FIELD_ROW}>
                <label className={LABEL_STYLE} htmlFor="reg-code">
                  Shop signup code
                </label>
                {/* Copied off a note from a manager, so reading it back
                    matters more here than anywhere else on the card. */}
                <PasswordField
                  id="reg-code"
                  value={signupCode}
                  onChange={setSignupCode}
                  placeholder="Provided by your manager"
                  autoComplete="off"
                  label="signup code"
                />
              </div>
              <button
                type="submit"
                disabled={registering}
                className={`${PRIMARY_BUTTON_STYLE} w-full py-3`}
              >
                {registering ? "Registering..." : "Create Account"}
              </button>
            </form>

            <div className="mt-7 border-t border-amstar-line-soft pt-5">
              <SwitchLine
                prompt="Already have an account?"
                action="Sign in"
                onClick={backToSignIn}
              />
            </div>
          </section>

          {/* ---------------------------------------------- reset password */}
          <section {...faceProps("forgot")}>
            <div className="group mb-7 lg:hidden">
              <AmstarLogo size="page" />
            </div>
            <h1 className="font-cond text-2xl font-black uppercase tracking-wider text-amstar-ink">
              Reset password
            </h1>
            <p className="mt-1 text-sm text-amstar-ink-faint">
              {forgotSent
                ? "Check your email."
                : "We will send you a link to choose a new one."}
            </p>

            {forgotSent ? (
              <p className="mt-7 text-sm leading-relaxed text-amstar-ink-dim">
                If that address has an account, a reset link is on its way. The
                link expires in 30 minutes.
              </p>
            ) : (
              <form onSubmit={handleForgot} className="mt-7 space-y-5">
                <div className={FIELD_ROW}>
                  <label className={LABEL_STYLE} htmlFor="forgot-email">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={SHARED_INPUT_STYLE}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingLink}
                  className={`${PRIMARY_BUTTON_STYLE} w-full py-3`}
                >
                  {sendingLink ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}

            <div className="mt-auto border-t border-amstar-line-soft pt-5">
              <SwitchLine
                prompt="Remembered it?"
                action="Back to sign in"
                onClick={backToSignIn}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
