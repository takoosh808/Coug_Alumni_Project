"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";

export default function PasswordView() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true); setError(""); setSuccess(false);
    try {
      await api("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      form.reset(); setSuccess(true);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <section className="admin-panel password-panel">
      <h2>Change password</h2>
      <p>Enter your current password and choose a new password of 12–200 characters.</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {success ? <p className="notice" role="status">Password changed. Other sessions have been signed out.</p> : null}
      <form onSubmit={save}>
        <label>Current password<input name="current_password" type="password" autoComplete="current-password" required maxLength={200} disabled={busy} /></label>
        <label>New password<input name="new_password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} disabled={busy} /></label>
        <button className="primary" disabled={busy}>{busy ? "Changing…" : "Change password"}</button>
      </form>
    </section>
  );
}
