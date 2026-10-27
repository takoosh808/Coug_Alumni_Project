import { textFields, type ProfileField } from "./profile-fields";

export type FilterOptions = Partial<Record<ProfileField, string[]>>;

// The caller supplies the permission-filtered directory CTE. Never read the
// underlying tables here: facets must reveal only values this user can see.
export const directoryFacets = `
  SELECT field, array_agg(DISTINCT answer ORDER BY answer) AS options
  FROM (
    SELECT field, BTRIM(part) AS answer
    FROM directory d
    CROSS JOIN LATERAL jsonb_each_text(to_jsonb(d)) AS fields(field, value)
    CROSS JOIN LATERAL unnest(
      CASE WHEN field IN ('opportunities','expertise','support_interests')
        THEN string_to_array(value, ';') ELSE ARRAY[value] END
    ) AS parts(part)
    WHERE field IN (${textFields
      .filter((f) => f !== "degree" && f !== "major")
      .map((f) => `'${f}'`)
      .join(",")})
    UNION ALL
    SELECT field, BTRIM(entry->>field) AS answer
    FROM directory
    CROSS JOIN LATERAL jsonb_array_elements(education_history) AS entry
    CROSS JOIN (VALUES ('degree'), ('major')) AS fields(field)
  ) answers
  WHERE answer <> ''
  GROUP BY field
`;

export function facetOptions(
  rows: { field: ProfileField; options: string[] }[],
): FilterOptions {
  return Object.fromEntries(rows.map((row) => [row.field, row.options]));
}
