import type { ReactNode } from "react";

interface StatusCardProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function StatusCard({ title, children }: StatusCardProps) {
  return (
    <section aria-label={title} className="atti-card">
      <div className="atti-card__header">
        <h2 className="atti-card__title">{title}</h2>
      </div>
      <div className="atti-card__body">{children}</div>
    </section>
  );
}
