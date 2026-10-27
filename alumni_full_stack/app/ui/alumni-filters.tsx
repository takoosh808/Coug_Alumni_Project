"use client";
import Icon from "./ui-icon";
import { opportunities } from "@/lib/types";
import {
  profileGroups,
  type ProfileField,
} from "@/lib/profile-fields";
import type { Navigate } from "@/lib/client-types";
import { useState, type FormEvent } from "react";
import FilterCombobox from "./filter-combobox";
import type { FilterOptions } from "@/lib/directory-facets";
export default function AlumniFilters({
  query,
  filterOptions,
  loading,
  navigate,
  filter,
  // admin, // Restore alongside the Privacy & communication group below.
}: {
  query: string;
  filterOptions: FilterOptions;
  loading: boolean;
  navigate: Navigate;
  filter: (e: FormEvent<HTMLFormElement>) => void;
  admin: boolean;
}) {
  const params = new URLSearchParams(query);
  const [opportunitySearch, setOpportunitySearch] = useState("");
  const opportunityChoices = [...new Set([
    ...(filterOptions.opportunities ?? []),
    ...params.getAll("opportunity_value"),
  ])].sort((a, b) => {
    const noneFirst = Number(b.toLowerCase() === "none") - Number(a.toLowerCase() === "none");
    return noneFirst || a.localeCompare(b);
  });
  const matchesOpportunity = (value: string) =>
    value.toLowerCase().includes(opportunitySearch.trim().toLowerCase());
  const field = (name: string, label: string) => {
    const options = filterOptions[name as ProfileField] ?? [];
    return options.length ? (
      <FilterCombobox
        key={name}
        name={name}
        label={label}
        defaultValue={params.get(name) ?? ""}
        options={options}
      />
    ) : (
      <label key={name}>
        {label}
        <input
          name={name}
          defaultValue={params.get(name) ?? ""}
          placeholder="Any / type to search…"
          autoComplete="off"
        />
      </label>
    );
  };
  const group = (title: string, fields: Record<string, string>) => (
    <details
      className="filter-group"
      open={Object.keys(fields).some((key) => params.has(key)) || undefined}
      key={title}
    >
      <summary>{title}</summary>
      {Object.entries(fields).map(([key, label]) => field(key, label))}
    </details>
  );
  return (
    <section className="filter-panel">
      <div className="filter-heading">
        <h2>Refine your search</h2>
        <button
          className="text-button"
          onClick={() => navigate("directory", "")}
        >
          Reset
        </button>
      </div>
      <form key={query} onSubmit={filter}>
        <label>
          Search all profile fields
          <div className="search-input">
            <Icon name="search" />
            <input
              name="search"
              defaultValue={params.get("search") ?? ""}
              placeholder="Name, skills, opportunities…"
              autoComplete="off"
            />
          </div>
        </label>
        <p className="filter-help">
          Type any part of an answer. Combine filters to narrow your results.
        </p>
        {field("current_company", "Company")}
        <details
          className="filter-group"
          open={
            params.has("major") ||
            params.has("degree") ||
            params.has("year_from") ||
            params.has("year_to") ||
            undefined
          }
        >
          <summary>Education</summary>
          {Object.entries(profileGroups.education).map(([key, label]) =>
            field(key, label),
          )}
          <fieldset>
            <legend>Graduation year</legend>
            <div className="year-inputs">
              <input
                aria-label="Graduation year from"
                name="year_from"
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
                type="number"
                min="1900"
                max="2100"
                placeholder="To…"
                defaultValue={params.get("year_to") ?? ""}
              />
            </div>
          </fieldset>
          <p className="filter-help">
            Matches any education record with all selected education criteria.
          </p>
        </details>
        {group(
          "Professional background",
          Object.fromEntries(
            Object.entries(profileGroups.professional).filter(
              ([key]) => key !== "current_company",
            ),
          ),
        )}
        <details
          className="filter-group"
          open={
            params.has("opportunity") ||
            params.has("opportunity_value") ||
            Object.keys(profileGroups.support).some((key) => params.has(key)) ||
            undefined
          }
        >
          <summary>Supporting WSU</summary>
          <fieldset className="opportunity-filters">
            <legend>Willing to provide</legend>
            <label className="opportunity-search">
              Search opportunities
              <input
                type="search"
                value={opportunitySearch}
                onChange={(event) => setOpportunitySearch(event.target.value)}
                placeholder="Find an opportunity…"
              />
            </label>
            <div className="opportunity-choices" role="group" aria-label="Willing to provide choices" tabIndex={0}>
            {opportunityChoices.map((value) => (
              <label key={value} hidden={!matchesOpportunity(value)}>
                <input
                  name="opportunity_value"
                  type="checkbox"
                  value={value}
                  defaultChecked={params.getAll("opportunity_value").includes(value)}
                />
                {value}
              </label>
            ))}
            {Object.entries(opportunities).filter(([key]) => params.getAll("opportunity").includes(key)).map(([key, label]) => (
              <label key={key} hidden={!matchesOpportunity(label)}>
                <input
                  name="opportunity"
                  type="checkbox"
                  value={key}
                  defaultChecked={params.getAll("opportunity").includes(key)}
                />
                {label}
              </label>
            ))}
            {!opportunityChoices.some(matchesOpportunity) &&
              !Object.entries(opportunities).some(([key, label]) => params.getAll("opportunity").includes(key) && matchesOpportunity(label)) ? (
                <p className="filter-help" role="status">No opportunities match your search.</p>
              ) : null}
            </div>
            <p className="filter-help">Search or scroll for more choices. Selected choices stay selected while searching.</p>
          </fieldset>
          <label>
            Match opportunities
            <select name="match" defaultValue={params.get("match") ?? "all"}>
              <option value="all">All selected opportunities</option>
              <option value="any">Any selected opportunity</option>
            </select>
          </label>
          {Object.entries(profileGroups.support)
            .filter(([key]) => key !== "additional_comments" && key !== "opportunities")
            .map(([key, label]) => field(key, label))}
        </details>
        {/* Temporarily hidden. Restore `admin` in the props above to re-enable.
        {admin ? group("Privacy & communication", profileGroups.privacy) : null}
        */}
        <input type="hidden" name="sort" value={params.get("sort") ?? "name"} />
        <button className="primary wide" disabled={loading}>
          {loading ? "Searching…" : "Find alumni"}
          <Icon name="search" />
        </button>
      </form>
    </section>
  );
}
