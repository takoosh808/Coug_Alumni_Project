"use client";
import Icon from "./ui-icon";
import Link from "next/link";
import { roleName, type Navigate, type User } from "@/lib/client-types";
export default function Sidebar({
  user,
  busy,
  tab,
  query,
  navigate,
  logout,
}: {
  user: User;
  busy: boolean;
  tab: string;
  query: string;
  navigate: Navigate;
  logout: () => void;
}) {
  const admin = user.role !== "user";
  return (
    <aside className="sidebar">
      <Link
        className="wordmark"
        href="/"
        onClick={(e) => {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            navigate("directory", "");
          }
        }}
      >
        <span className="brand-mark">W</span>
        <span>
          Coug<span className="brand-second">Connect</span>
        </span>
      </Link>
      <p className="sidebar-caption">WSU Alumni Network</p>
      <nav aria-label="Workspace">
        {[
          {
            key: "directory",
            title: "Alumni directory",
            icon: "people" as const,
          },
          ...(admin
            ? [
                {
                  key: "imports",
                  title: "CSV imports",
                  icon: "upload" as const,
                },
              ]
            : []),
          ...(user.role === "super_admin"
            ? [
                {
                  key: "users",
                  title: "Manage accounts",
                  icon: "shield" as const,
                },
              ]
            : []),
        ].map((item) => (
          <a
            key={item.key}
            href={item.key === "directory" ? `/?${query}` : `/?tab=${item.key}`}
            aria-current={tab === item.key ? "page" : undefined}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                navigate(item.key);
              }
            }}
          >
            <Icon name={item.icon} />
            {item.title}
          </a>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="note-symbol">W</span>
        <p>
          Good things happen
          <br />
          when Cougs connect.
        </p>
        <span>Washington State University</span>
      </div>
      <div className="account">
        <div className="avatar">{user.name.slice(0, 1)}</div>
        <div>
          <strong>{user.name}</strong>
          <small>{roleName(user.role)}</small>
        </div>
        <button
          aria-label="Sign out"
          title="Sign out"
          onClick={logout}
          disabled={busy}
        >
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}
