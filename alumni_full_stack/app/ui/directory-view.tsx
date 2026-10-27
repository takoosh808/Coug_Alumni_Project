"use client";
import Icon from "./ui-icon";
import { number, type Directory, type Navigate } from "@/lib/client-types";
import AlumniFilters from "./alumni-filters";
import AlumniTable from "./alumni-table";
import NetworkStats from "./network-stats";
import QuickSearches from "./quick-searches";
import type { FormEvent } from "react";
import { useState } from "react";
import type { Alumni } from "@/lib/types";
import ProfileEditor from "./profile-editor";
import AlumniProfile from "./alumni-profile";
import { profileGroups } from "@/lib/profile-fields";
import { opportunities } from "@/lib/types";
export default function DirectoryView({
  directory,
  loading,
  query,
  admin,
  navigate,
  filter,
  loadDirectory,
}: {
  directory: Directory | null;
  loading: boolean;
  query: string;
  admin: boolean;
  navigate: Navigate;
  filter: (e: FormEvent<HTMLFormElement>) => void;
  loadDirectory: () => void;
}) {
  const params = new URLSearchParams(query);
  const [editing, setEditing] = useState<Alumni | "new" | null>(null);
  const [viewing, setViewing] = useState<Alumni | null>(null);
  const labels: Record<string, string> = {
    search: "Search",
    opportunity_value: "Willing to provide",
    year_from: "Graduated from",
    year_to: "Graduated through",
    ...Object.assign({}, ...Object.values(profileGroups)),
  };
  const active = [...params.entries()].filter(
    ([key]) => !["page", "sort", "match"].includes(key),
  );
  return (
    <>
      <NetworkStats stats={directory?.stats} />
      <QuickSearches navigate={navigate} />
      <div className="directory-layout">
        <AlumniFilters
          admin={admin}
          query={query}
          filterOptions={directory?.filterOptions ?? {}}
          loading={loading}
          navigate={navigate}
          filter={filter}
        />
        <section className="results-panel" aria-busy={loading}>
          <div className="results-heading">
            <div>
              <h2>Alumni directory</h2>
              <p>
                {admin
                  ? "Departmental access · Review preferences before contacting alumni."
                  : "Profiles and contact links reflect alumni permissions."}
              </p>
              <p role="status">
                {loading
                  ? "Finding your connections…"
                  : `${number.format(directory?.total ?? 0)} alumni${params.size ? " match your search" : " in your network"}`}
              </p>
            </div>
            {admin ? (
              <button className="secondary" onClick={() => setEditing("new")}>
                Add alumnus
              </button>
            ) : null}
            <label className="sort-label">
              Sort by
              <select
                name="sort"
                value={params.get("sort") ?? "name"}
                onChange={(e) => {
                  const p = new URLSearchParams(query);
                  p.set("sort", e.target.value);
                  p.delete("page");
                  navigate("directory", p.toString());
                }}
              >
                <option value="name">Name A–Z</option>
                <option value="year">Newest graduates</option>
              </select>
            </label>
          </div>
          {active.length ? (
            <div className="active-filters" aria-label="Applied filters">
              {active.map(([key, value], index) => (
                <button
                  className="filter-chip"
                  key={`${key}-${index}`}
                  onClick={() => {
                    const next = new URLSearchParams(query);
                    next.delete(key, value);
                    next.delete("page");
                    navigate("directory", next.toString());
                  }}
                  aria-label={`Remove ${labels[key] ?? "opportunity"}: ${key === "opportunity" ? (opportunities[value as keyof typeof opportunities] ?? value) : value}`}
                >
                  {key === "opportunity"
                    ? (opportunities[value as keyof typeof opportunities] ??
                      value)
                    : `${labels[key] ?? key}: ${value}`}{" "}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          ) : null}
          {directory?.alumni.length ? (
            <AlumniTable
              alumni={directory.alumni}
              onView={setViewing}
              onEdit={admin ? setEditing : undefined}
            />
          ) : (
            <div className="empty-state">
              <Icon name="people" />
              <h3>
                {loading
                  ? "Loading alumni…"
                  : params.size
                    ? "No alumni match yet"
                    : "Your network starts here"}
              </h3>
              <p>
                {params.size
                  ? "Try a different company or broaden your opportunity filters."
                  : admin
                    ? "Import your first CSV to start connecting with WSU alumni."
                    : "Your administrator can import alumni to get the directory started."}
              </p>
              {!loading ? (
                <button
                  className="secondary"
                  onClick={() =>
                    params.size
                      ? navigate("directory", "")
                      : admin
                        ? navigate("imports")
                        : loadDirectory()
                  }
                >
                  {params.size
                    ? "Clear filters"
                    : admin
                      ? "Import alumni"
                      : "Refresh directory"}
                </button>
              ) : null}
            </div>
          )}
          <div className="pagination">
            <span>
              {directory?.total
                ? `${(directory.page - 1) * 20 + 1}–${Math.min(directory.page * 20, directory.total)} of ${number.format(directory.total)}`
                : "0 results"}
            </span>
            <div>
              {[
                [-1, "Previous"],
                [1, "Next"],
              ].map(([delta, label]) => (
                <button
                  className="secondary"
                  key={label}
                  disabled={
                    loading ||
                    !directory ||
                    (delta === -1
                      ? directory.page <= 1
                      : directory.page * 20 >= directory.total)
                  }
                  onClick={() => {
                    const p = new URLSearchParams(query);
                    p.set(
                      "page",
                      String((directory?.page ?? 1) + Number(delta)),
                    );
                    navigate("directory", p.toString());
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
      {editing ? (
        <ProfileEditor
          alumni={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadDirectory();
          }}
        />
      ) : null}
      {viewing ? (
        <AlumniProfile
          alumni={viewing}
          admin={admin}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setViewing(null);
            setEditing(viewing);
          }}
        />
      ) : null}
    </>
  );
}
