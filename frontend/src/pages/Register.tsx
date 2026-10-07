import React, { useState } from "react";
import { AmstarLogo } from "../components/AmstarLogo";
import { Link, useNavigate } from "react-router-dom";
import {
  SHARED_INPUT_STYLE,
  PANEL_STYLE,
  LABEL_STYLE,
} from "../styles/controls";
import { API_BASE } from "../config";

// Tailwind Upgraded Register Page
export const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setIsSubmitting(true);

    try {
      // Adjust this URL if your backend auth endpoint is different
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, signupCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Registration failed.");
      }

      setSuccessMessage("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error: any) {
      setError(error.message || "Failed to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className={`${PANEL_STYLE} p-8 shadow-2xl w-full max-w-md`}>
        <div className="group flex justify-center mb-8">
          <AmstarLogo size="page" />
        </div>

        <h2 className="font-cond text-xl uppercase tracking-wider text-amstar-ink-dim mb-6 text-center">
          Create Technician Account
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-amstar-red/20 text-white text-sm font-bold rounded-lg text-center border border-amstar-red">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-sev-1/20 text-white text-sm font-bold rounded-lg text-center border border-sev-1 flex items-center justify-center gap-2">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className={LABEL_STYLE}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={SHARED_INPUT_STYLE}
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className={LABEL_STYLE}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={SHARED_INPUT_STYLE}
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className={LABEL_STYLE}>Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={SHARED_INPUT_STYLE}
              placeholder="Repeat password"
            />
          </div>

          <div>
            <label className={LABEL_STYLE}>Shop Signup Code</label>
            <input
              type="password"
              required
              value={signupCode}
              onChange={(e) => setSignupCode(e.target.value)}
              className={SHARED_INPUT_STYLE}
              placeholder="Provided by your manager"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 bg-amstar-red hover:bg-red-700 text-white font-cond uppercase tracking-widest rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition disabled:opacity-70"
          >
            {isSubmitting ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-amstar-ink-dim">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-amstar-red-ink font-bold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
