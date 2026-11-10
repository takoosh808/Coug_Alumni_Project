"use client";
import { number, type Directory } from "@/lib/client-types";
export default function NetworkStats({
  stats,
}: {
  stats: Directory["stats"] | undefined;
}) {
  const graduationYears = stats?.graduation_year_min != null && stats?.graduation_year_max != null
    ? `${stats.graduation_year_min}–${stats.graduation_year_max}`
    : "—";
  return (
    <section className="stats" aria-label="Network overview">
      {[
        ["Alumni in your network", stats?.total],
        ["Companies represented", stats?.companies],
        ["Willing to Support WSU", stats?.volunteers],
        ["Graduation Years", graduationYears],
      ].map(([label, value]) => (
        <div key={String(label)}>
          <span>{label}</span>
          <strong>
            {value === undefined ? "—" : typeof value === "number" ? number.format(value) : value}
          </strong>
        </div>
      ))}
    </section>
  );
}
