"use client";
import { roleName, type User } from "@/lib/client-types";
import type { FormEvent } from "react";
export default function AccountsView({
  users,
  busy,
  createUser,
}: {
  users: User[];
  busy: boolean;
  createUser: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="admin-layout">
      <section className="admin-panel">
        <h2>Create an account</h2>
        <p>
          Members can search alumni. Administrators can also import CSV files.
        </p>
        <form onSubmit={createUser}>
          <label>
            Full name
            <input name="name" required maxLength={100} autoComplete="name" />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              spellCheck={false}
            />
          </label>
          <label>
            Initial password
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={200}
              autoComplete="new-password"
            />
            <small>Use at least 12 characters.</small>
          </label>
          <label>
            Role
            <select name="role">
              <option value="user">Member — search alumni</option>
              <option value="admin">Administrator — search & import</option>
            </select>
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      </section>
      <section className="admin-panel">
        <h2>Workspace accounts</h2>
        <ul className="history-list">
          {users.map((account) => (
            <li key={account.id}>
              <strong>
                {account.name}
                <span className="role-badge">{roleName(account.role)}</span>
              </strong>
              <span>{account.email}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
