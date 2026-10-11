import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Coug Connect | WSU Alumni",
  description: "Connect WSU alumni with the next generation of Cougs.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
