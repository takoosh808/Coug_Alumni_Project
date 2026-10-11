"use client";
import { number, type Directory } from "@/lib/client-types";
export default function NetworkStats({
  stats,
}: {
  stats: Directory["stats"] | undefined;
}) {
  return (
    <section className="stats" aria-label="Network overview">
      {[
        ["Alumni in your network", stats?.total],
        ["Companies represented", stats?.companies],
        ["Ready to give back", stats?.volunteers],
        ["Offering internships", stats?.internships],
      ].map(([label, value]) => (
        <div key={String(label)}>
          <span>{label}</span>
          <strong>
            {value === undefined ? "—" : number.format(value as number)}
          </strong>
        </div>
      ))}
    </section>
  );
}
