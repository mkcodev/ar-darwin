import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
};

export function Section({ id, title, lead, children }: SectionProps) {
  return (
    <section className="pg-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="pg-section-head">
        <h2 id={`${id}-title`} className="pg-section-title">
          {title}
        </h2>
        {lead && <p className="pg-lead">{lead}</p>}
      </header>
      {children}
    </section>
  );
}
