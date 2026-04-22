import type { ReactNode } from "react";

interface OptionsSectionProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function OptionsSection({ title, children }: OptionsSectionProps) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
