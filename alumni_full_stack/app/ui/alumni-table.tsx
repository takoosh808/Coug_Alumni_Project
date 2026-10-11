"use client";
import { opportunities, type Alumni } from "@/lib/types";
export default function AlumniTable({ alumni }: { alumni: Alumni[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {[
              "Alumni",
              "Company & major",
              "Class",
              "Open to helping with",
              "Connect",
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
                  <span className="avatar">
                    {alum.first_name[0]}
                    {alum.last_name[0]}
                  </span>
                  <div>
                    <strong>
                      {alum.first_name} {alum.last_name}
                    </strong>
                    <a className="email-link" href={`mailto:${alum.email}`}>
                      {alum.email}
                    </a>
                  </div>
                </div>
              </td>
              <td>
                <strong className="company-name">
                  {alum.current_company || "Not provided"}
                </strong>
                <small>{alum.major || "Major not provided"}</small>
              </td>
              <td className="class-year">{alum.graduation_year ?? "—"}</td>
              <td>
                <div className="badges">
                  {Object.entries(opportunities)
                    .filter(
                      ([key]) =>
                        alum[key as keyof typeof opportunities] === true,
                    )
                    .map(([key, label]) => (
                      <span className="badge" key={key}>
                        {label}
                      </span>
                    ))}
                  {!Object.keys(opportunities).some(
                    (key) => alum[key as keyof typeof opportunities],
                  ) ? (
                    <small>No opportunities listed</small>
                  ) : null}
                </div>
              </td>
              <td>
                {alum.linked_in ? (
                  <a
                    className="linkedin"
                    href={alum.linked_in}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${alum.first_name} ${alum.last_name} on LinkedIn (new tab)`}
                  >
                    in
                  </a>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
