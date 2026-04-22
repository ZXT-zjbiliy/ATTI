import type { ReactNode } from "react";

interface OptionsSectionProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function OptionsSection({ title, children }: OptionsSectionProps) {
  return (
    <section aria-label={title} className="atti-card">
      <div className="atti-card__header">
        <h2 className="atti-card__title">{title}</h2>
      </div>
      <div className="atti-card__body">{children}</div>
    </section>
  );
}
