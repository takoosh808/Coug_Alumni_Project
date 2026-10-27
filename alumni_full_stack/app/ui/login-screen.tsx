"use client";
import Icon from "./ui-icon";
import Image from "next/image";
import loginLogo from "../../wsu_red_white_bckgrd.png";
import type { FormEvent, RefObject } from "react";
export default function LoginScreen({
  checking,
  busy,
  error,
  login,
  loginError,
}: {
  checking: boolean;
  busy: boolean;
  error: string;
  login: (e: FormEvent<HTMLFormElement>) => void;
  loginError: RefObject<HTMLParagraphElement | null>;
}) {
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="wordmark">
          <Image className="brand-mark" src={loginLogo} alt="Washington State University logo" sizes="43px" />
          Coug Connect
        </div>
        <div>
          <p className="story-label">Washington State University</p>
          <h1>
            Once a Coug.
            <br />
            Always a Coug.
          </h1>
          <p>
            Find the alumni who can open a door, share their experience, and
            help the next generation take their first step.
          </p>
          <div className="story-rule" />
          <p className="story-foot">A stronger network. A shared future.</p>
        </div>
        <span>WSU Alumni Network</span>
      </section>
      <main id="main" className="login-panel">
        <div className="login-form">
          <Image className="mini-mark" src={loginLogo} alt="Washington State University logo" sizes="38px" />
          <h2>Welcome back</h2>
          <p>Sign in to your alumni workspace.</p>
          {checking ? (
            <p role="status">Checking your session…</p>
          ) : (
            <form onSubmit={login}>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  required
                  placeholder="you@wsu.edu…"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={200}
                />
              </label>
              {error ? (
                <p
                  className="error"
                  role="alert"
                  tabIndex={-1}
                  ref={loginError}
                >
                  {error}
                </p>
              ) : null}
              <button className="primary wide" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
                <Icon name="arrow" />
              </button>
            </form>
          )}
          <p className="login-help">
            Need an account? Contact your workspace administrator.
          </p>
        </div>
        <p className="login-bottom">Connecting Cougs with opportunity.</p>
      </main>
    </div>
  );
}
