"use client";
import Icon from "./ui-icon";
import type { Navigate } from "@/lib/client-types";
export default function QuickSearches({ navigate }: { navigate: Navigate }) {
  return (
    <section className="quick-section">
      <div>
        <h2>A good place to start</h2>
        <p>Find Cougs ready to make a difference.</p>
      </div>
      <div className="quick-queries">
        {[
          {
            title: "Microsoft internship partners",
            text: "Open doors for WSU students",
            query: "current_company=Microsoft&opportunity=q_internship",
          },
          {
            title: "Bring experience to class",
            text: "Alumni available for guest lectures",
            query: "opportunity=q_guest_lecture",
          },
          {
            title: "Build something together",
            text: "Find a capstone project mentor",
            query: "opportunity=q_capstone_mentor",
          },
          {
            title: "Go behind the scenes",
            text: "Explore company visit opportunities",
            query: "opportunity=q_company_visits",
          },
        ].map((item) => (
          <button
            key={item.title}
            onClick={() => navigate("directory", item.query)}
          >
            <span>
              <strong>{item.title}</strong>
              <small>{item.text}</small>
            </span>
            <Icon name="arrow" />
          </button>
        ))}
      </div>
    </section>
  );
}
