"use client";
import Icon from "./ui-icon";
import { number, type ImportRecord, type Preview } from "@/lib/client-types";
export default function ImportsView({
  file,
  preview,
  imports,
  busy,
  setFile,
  setPreview,
  setError,
  importCsv,
}: {
  file: File | null;
  preview: Preview | null;
  imports: ImportRecord[];
  busy: boolean;
  setFile: (f: File | null) => void;
  setPreview: (p: Preview | null) => void;
  setError: (s: string) => void;
  importCsv: (commit: boolean) => void;
}) {
  return (
    <div className="admin-layout">
      <section className="admin-panel">
        <h2>Import alumni from CSV</h2>
        <p>Upload up to 5,000 rows in a file under 2 MB.</p>
        <a href="/alumni-template.csv" download className="template-link">
          Download CSV template
        </a>
        <div className="upload-area">
          <Icon name="upload" />
          <label>
            Choose your CSV
            <input
              key={file?.name ?? "empty"}
              type="file"
              name="csv"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setError("");
              }}
            />
          </label>
          <small>
            {file ? file.name : "Required: first_name, last_name, email"}
          </small>
        </div>
        <div className="import-note">
          <strong>Existing emails update matching alumni.</strong>
          <p>
            Imported records replace matching alumni data. Missing optional
            columns clear those fields, including privacy permissions and
            education history. Custom answers are welcome; separate multiple
            opportunities with semicolons. A validation error prevents the
            entire import.
          </p>
        </div>
        <details className="import-note">
          <summary>New form fields & education history</summary>
          <p>
            The template includes professional background, support interests,
            and all privacy and communication preferences. Only first name, last
            name, and email are required.
          </p>
          <p>
            For one qualification, use degree, major, and graduation_year. For
            multiple qualifications, use education_history as a JSON array of
            objects containing degree, major, and graduation_year. This replaces
            the single-qualification columns. You can also add education records
            with the profile editor after importing.
          </p>
          <p>
            Unknown privacy answers remain available to administrators for
            review but do not authorize member visibility. Blank permissions
            never grant access.
          </p>
        </details>
        <button
          className="primary"
          disabled={!file || busy}
          onClick={() => importCsv(false)}
        >
          {busy ? "Checking…" : "Validate & preview"}
        </button>
        {preview ? (
          <div className="preview" aria-live="polite">
            <h3>{number.format(preview.count)} valid rows</h3>
            <p>First {preview.preview.length} records:</p>
            <ul>
              {preview.preview.map((row) => (
                <li key={row.email}>
                  <strong>
                    {row.first_name} {row.last_name}
                  </strong>
                  <span>
                    {row.email} / {row.current_company || "No company"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="primary"
              disabled={busy}
              onClick={() => importCsv(true)}
            >
              {busy
                ? "Importing…"
                : `Import ${number.format(preview.count)} alumni`}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </section>
      <section className="admin-panel">
        <h2>Recent imports</h2>
        {imports.length ? (
          <ul className="history-list">
            {imports.map((item) => (
              <li key={item.id}>
                <strong>{item.filename}</strong>
                <span>
                  {number.format(item.row_count)} alumni ·{" "}
                  {item.name ?? "Former administrator"}
                </span>
                <small>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(item.created_at))}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No imports yet. Your first upload will appear here.</p>
        )}
      </section>
    </div>
  );
}
