"use client";
import type { Alumni } from "@/lib/types";
export default function AlumniTable({
  alumni,
  onEdit,
  onView,
}: {
  alumni: Alumni[];
  onEdit?: (alumni: Alumni) => void;
  onView: (alumni: Alumni) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {[
              "Alumni",
              "Professional background",
              "Education",
              "Supporting WSU",
              "Profile",
            ].map((title) => (
              <th scope="col" key={title}>
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alumni.map((alum) => (
            <tr key={alum.id}>
              <td>
                <div className="person">
                  <span className="avatar" aria-hidden="true">
                    {alum.first_name[0]}
                    {alum.last_name[0]}
                  </span>
                  <div>
                    <strong>
                      {alum.first_name} {alum.last_name}
                    </strong>
                    {alum.email ? (
                      <a className="email-link" href={`mailto:${alum.email}`}>
                        {alum.email}
                      </a>
                    ) : (
                      <small>Email restricted</small>
                    )}
                    {alum.linked_in ? (
                      <a
                        className="email-link"
                        href={alum.linked_in}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn (new tab)
                      </a>
                    ) : null}
                  </div>
                </div>
              </td>
              <td>
                <strong className="company-name">
                  {alum.current_company || "Company not provided"}
                </strong>
                <small>{alum.job_title}</small>
                <small>{alum.professional_location}</small>
                <small>{alum.industry}</small>
              </td>
              <td>
                {alum.education_history?.length ? (
                  alum.education_history.map((e, i) => (
                    <div className="education-summary" key={i}>
                      <strong>
                        {e.degree || "Degree not provided"}{" "}
                        {e.graduation_year ?? ""}
                      </strong>
                      <small>{e.major}</small>
                    </div>
                  ))
                ) : (
                  <small>Not provided</small>
                )}
              </td>
              <td>
                <div className="badges">
                  {alum.opportunities ? (
                    alum.opportunities
                      .split(/;|\n/)
                      .filter(Boolean)
                      .map((value, i) => (
                        <span className="badge" key={i}>
                          {value.trim()}
                        </span>
                      ))
                  ) : (
                    <small>No opportunities listed</small>
                  )}
                </div>
                <small>{alum.participation_format}</small>
              </td>
              <td>
                <div className="profile-row-actions">
                  <button className="text-button" onClick={() => onView(alum)}>
                    View profile
                    <span className="sr-only">
                      {" "}
                      for {alum.first_name} {alum.last_name}
                    </span>
                  </button>
                  {onEdit ? (
                    <button
                      className="text-button"
                      onClick={() => onEdit(alum)}
                    >
                      Edit
                      <span className="sr-only">
                        {" "}
                        {alum.first_name} {alum.last_name}
                      </span>
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
