"use client";
import Icon from "./ui-icon";
import { opportunities } from "@/lib/types";
import type { Navigate } from "@/lib/client-types";
import type { FormEvent } from "react";
export default function AlumniFilters({
  query,
  majors,
  loading,
  navigate,
  filter,
}: {
  query: string;
  majors: string[];
  loading: boolean;
  navigate: Navigate;
  filter: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const params = new URLSearchParams(query);
  return (
    <section className="filter-panel">
      <div className="filter-heading">
        <h2>Refine your search</h2>
        <button
          className="text-button"
          onClick={(event) => {
            event.currentTarget.closest("section")?.querySelector("form")?.reset();
            navigate("directory", "");
          }}
        >
          Reset
        </button>
      </div>
      <form key={query} onSubmit={filter}>
        <label>
          Search alumni
          <div className="search-input">
            <Icon name="search" />
            <input
              name="search"
              defaultValue={params.get("search") ?? ""}
              autoComplete="off"
              placeholder="Name, email, company…"
            />
          </div>
        </label>
        <label>
          Company
          <input
            name="current_company"
            defaultValue={params.get("current_company") ?? ""}
            autoComplete="off"
            placeholder="e.g. Microsoft…"
          />
        </label>
        <label>
          Major
          <select name="major" defaultValue={params.get("major") ?? ""}>
            <option value="">All majors</option>
            {majors.map((major) => (
              <option key={major}>{major}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Graduation year</legend>
          <div className="year-inputs">
            <input
              aria-label="Graduation year from"
              name="year_from"
              autoComplete="off"
              type="number"
              min="1900"
              max="2100"
              placeholder="From…"
              defaultValue={params.get("year_from") ?? ""}
            />
            <span>–</span>
            <input
              aria-label="Graduation year to"
              name="year_to"
              autoComplete="off"
              type="number"
              min="1900"
              max="2100"
              placeholder="To…"
              defaultValue={params.get("year_to") ?? ""}
            />
          </div>
        </fieldset>
        <fieldset className="opportunity-filters">
          <legend>Willing to help with</legend>
          {Object.entries(opportunities).map(([key, label]) => (
            <label key={key}>
              <input
                name="opportunity"
                type="checkbox"
                value={key}
                defaultChecked={params.getAll("opportunity").includes(key)}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label>
          Opportunity matching
          <select name="match" defaultValue={params.get("match") ?? "all"}>
            <option value="all">All selected opportunities</option>
            <option value="any">Any selected opportunity</option>
          </select>
        </label>
        <button className="primary wide" disabled={loading}>
          {loading ? "Searching…" : "Find alumni"}
          <Icon name="search" />
        </button>
      </form>
    </section>
  );
}
