import type { ReactNode } from "react";

interface StatusCardProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function StatusCard({ title, children }: StatusCardProps) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
