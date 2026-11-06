import "./style.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Tandem Tactics | Two minds. One hero.",
  description:
    "Choose an Archer, Wizard, Bomber or Ice Wizard. Share the controls, team up and battle across three fantasy arenas.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
