"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Alumni } from "@/lib/types";
import {
  profileGroups,
  suggestions,
  type Education,
  type ProfileField,
} from "@/lib/profile-fields";
import { api } from "@/lib/client-api";
export default function ProfileEditor({
  alumni,
  onClose,
  onSaved,
}: {
  alumni: Alumni | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [history, setHistory] = useState<Education[]>(
    alumni?.education_history ?? [],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api("/api/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, education_history: history }),
      });
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function input(key: string, label: string, required = false) {
    return (
      <label key={key}>
        {label}
        <input
          name={key}
          required={required}
          type={
            key === "email" ? "email" : key === "linked_in" ? "url" : "text"
          }
          readOnly={key === "email" && Boolean(alumni)}
          defaultValue={String(alumni?.[key as keyof Alumni] ?? "")}
          list={`edit-${key}`}
          maxLength={10000}
        />
        <datalist id={`edit-${key}`}>
          {(suggestions[key as ProfileField] ?? []).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </label>
    );
  }
  return (
    <dialog
      ref={dialog}
      className="profile-editor"
      aria-labelledby="editor-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save}>
        <div className="editor-heading">
          <h2 id="editor-heading">
            {alumni ? "Edit alumni profile" : "Add alumni profile"}
          </h2>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p>
          Use the suggested answers or enter your own. Leave unanswered
          questions blank. Privacy permissions need explicit answers before a
          profile appears to members.
        </p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <fieldset disabled={busy}>
          <legend>Personal information</legend>
          <div className="editor-grid">
            {input("first_name", "First name", true)}
            {input("last_name", "Last name", true)}
            {input("email", "Email (used to match this record)", true)}
            {input("linked_in", "LinkedIn URL")}
          </div>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Education history</legend>
          {history.map((entry, index) => (
            <div className="education-editor" key={index}>
              {(["degree", "major", "graduation_year"] as const).map((key) => (
                <label key={key}>
                  {key === "graduation_year"
                    ? "Graduation year"
                    : key === "degree"
                      ? "Degree earned"
                      : "Major / academic program"}
                  <input
                    value={entry[key] ?? ""}
                    type={key === "graduation_year" ? "number" : "text"}
                    min={1900}
                    max={2100}
                    maxLength={10000}
                    list={`education-${key}`}
                    onChange={(e) =>
                      setHistory((items) =>
                        items.map((item, i) =>
                          i !== index
                            ? item
                            : {
                                ...item,
                                [key]:
                                  key === "graduation_year"
                                    ? e.target.value
                                      ? Number(e.target.value)
                                      : null
                                    : e.target.value,
                              },
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="text-button"
                aria-label={`Remove education record ${index + 1}`}
                onClick={() =>
                  setHistory((items) => items.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
          {(["degree", "major"] as const).map((key) => (
            <datalist id={`education-${key}`} key={key}>
              {suggestions[key]?.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={history.length >= 30}
            onClick={() =>
              setHistory((items) => [
                ...items,
                { degree: "", major: "", graduation_year: null },
              ])
            }
          >
            Add education record
          </button>
        </fieldset>
        {Object.entries(profileGroups)
          .filter(([group]) => group !== "education")
          .map(([group, fields]) => (
            <fieldset disabled={busy} key={group}>
              <legend>
                {group === "professional"
                  ? "Professional background"
                  : group === "support"
                    ? "Supporting WSU"
                    : "Privacy & communication"}
              </legend>
              {group === "support" ? (
                <p>
                  Separate multiple opportunities or interests with semicolons.
                </p>
              ) : null}
              <div className="editor-grid">
                {Object.entries(fields).map(([key, label]) =>
                  key === "additional_comments" ? (
                    <label key={key}>
                      {label}
                      <textarea
                        name={key}
                        defaultValue={alumni?.additional_comments ?? ""}
                        rows={4}
                        maxLength={10000}
                      />
                    </label>
                  ) : (
                    input(key, label)
                  ),
                )}
              </div>
            </fieldset>
          ))}
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
      </form>
    </dialog>
  );
}
