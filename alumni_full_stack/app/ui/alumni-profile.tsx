"use client";

import { useEffect, useRef, useState } from "react";
import type { Alumni } from "@/lib/types";

function Facts({ items }: { items: [string, string][] }) {
  const answered = items.filter(([, value]) => value.trim());
  if (!answered.length)
    return <p className="profile-empty">No details provided yet.</p>;
  return (
    <dl className="profile-facts">
      {answered.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Answers({ value, empty }: { value: string; empty: string }) {
  const answers = value
    .split(/[;\n]/)
    .map((answer) => answer.trim())
    .filter(Boolean);
  return answers.length ? (
    <ul className="profile-tags">
      {answers.map((answer, index) => (
        <li key={index}>{answer}</li>
      ))}
    </ul>
  ) : (
    <p className="profile-empty">{empty}</p>
  );
}

export default function AlumniProfile({
  alumni,
  admin,
  onClose,
  onEdit,
}: {
  alumni: Alumni;
  admin: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState("overview");
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="alumni-profile"
      aria-labelledby="profile-name"
      onCancel={onClose}
    >
      <div className="profile-header">
        <div className="profile-title-row">
          <span className="profile-avatar" aria-hidden="true">
            {alumni.first_name[0]}
            {alumni.last_name[0]}
          </span>
          <div>
            <h2 id="profile-name">
              {alumni.first_name} {alumni.last_name}
            </h2>
            {alumni.job_title || alumni.current_company ? (
              <p>
                {[alumni.job_title, alumni.current_company]
                  .filter(Boolean)
                  .join(" at ")}
              </p>
            ) : null}
            {alumni.professional_location ? (
              <p className="profile-location">{alumni.professional_location}</p>
            ) : null}
          </div>
          <button
            className="profile-close"
            onClick={onClose}
            aria-label="Close profile"
            autoFocus
          >
            ×
          </button>
        </div>
        <div className="profile-contact-actions">
          {alumni.email ? (
            <a className="secondary" href={`mailto:${alumni.email}`}>
              Email {alumni.first_name}
            </a>
          ) : null}
          {alumni.linked_in ? (
            <a
              className="secondary"
              href={alumni.linked_in}
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn <span className="sr-only">(new tab)</span>
            </a>
          ) : null}
          {!alumni.email && !alumni.linked_in ? (
            <span className="profile-empty">
              No direct contact details available.
            </span>
          ) : null}
        </div>
        <div
          className="profile-navigation"
          role="group"
          aria-label="Profile sections"
        >
          {[
            ["overview", "Overview"],
            ["support", "Supporting WSU"],
            ["privacy", "Privacy & contact"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={section === key}
              aria-controls="profile-content"
              onClick={() => setSection(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="profile-content" id="profile-content" key={section}>
        {section === "overview" ? (
          <>
            <section aria-labelledby="professional-heading">
              <h3 id="professional-heading">Professional background</h3>
              <Facts
                items={[
                  ["Employment", alumni.employment_status],
                  ["Industry", alumni.industry],
                ]}
              />
              {alumni.expertise ? (
                <div className="profile-subsection">
                  <h4>Expertise & interests</h4>
                  <Answers
                    value={alumni.expertise}
                    empty="No expertise listed."
                  />
                </div>
              ) : null}
            </section>
            <section aria-labelledby="education-heading">
              <h3 id="education-heading">WSU education</h3>
              {alumni.education_history?.length ? (
                <ul className="profile-education">
                  {alumni.education_history.map((education, index) => (
                    <li key={index}>
                      <div>
                        <strong>
                          {education.degree || "Degree not provided"}
                        </strong>
                        {education.major ? <p>{education.major}</p> : null}
                      </div>
                      {education.graduation_year ? (
                        <span>{education.graduation_year}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="profile-empty">No education records provided.</p>
              )}
            </section>
          </>
        ) : section === "support" ? (
          <>
            <section aria-labelledby="opportunities-heading">
              <h3 id="opportunities-heading">Willing to provide</h3>
              <Answers
                value={alumni.opportunities}
                empty="No opportunities listed."
              />
            </section>
            {alumni.support_interests ? (
              <section aria-labelledby="support-heading">
                <h3 id="support-heading">Other ways to support WSU</h3>
                <Answers
                  value={alumni.support_interests}
                  empty="No support interests listed."
                />
              </section>
            ) : null}
            <section aria-labelledby="participation-heading">
              <h3 id="participation-heading">Participation & outreach</h3>
              <Facts
                items={[
                  ["Preferred format", alumni.participation_format],
                  ["Contact frequency", alumni.contact_frequency],
                ]}
              />
            </section>
            {admin && alumni.additional_comments ? (
              <details className="profile-notes">
                <summary>Additional notes</summary>
                <p>{alumni.additional_comments}</p>
              </details>
            ) : null}
          </>
        ) : (
          <>
            <p className="profile-guidance">
              Review these preferences before reaching out or sharing this
              profile.
            </p>
            <section aria-labelledby="contact-heading">
              <h3 id="contact-heading">Contact preferences</h3>
              <Facts
                items={[
                  ["Contact details visible", alumni.contact_visibility],
                  ["Student contact", alumni.student_contact],
                  ["Engagement contact frequency", alumni.contact_frequency],
                ]}
              />
            </section>
            {admin ? (
              <section aria-labelledby="privacy-heading">
                <h3 id="privacy-heading">Departmental permissions</h3>
                <Facts
                  items={[
                    ["Store & use information", alumni.storage_consent],
                    ["Profile audience", alumni.profile_visibility],
                    ["Alumni news & updates", alumni.alumni_updates],
                  ]}
                />
              </section>
            ) : null}
          </>
        )}
      </div>
      <div className="profile-footer">
        <span>
          {admin
            ? "Departmental view"
            : "Contact details follow alumni permissions"}
        </span>
        {admin ? (
          <button className="text-button" onClick={onEdit}>
            Edit profile
          </button>
        ) : null}
        <button className="secondary" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  );
}
