import { OptionsSection } from "./options-section";

export function ProviderBoundarySection() {
  return (
    <OptionsSection title="Local And Provider Boundary">
      <p>Your saved profile draft, extracted questions, planned answers, diagnostics, and local history stay on this device by default.</p>
      <p>The selected provider is called only when answer planning runs for the locked Truity Enneagram MVP flow.</p>
      <p>For the locked single-site trial flow, clicking Run answer planning also triggers page fill immediately after planning.</p>
      <p>ATTI fills supported answers into the page, but it does not auto-submit the assessment.</p>
      <p>Current supported scope is limited to the locked single-site MVP path: Truity Enneagram.</p>
    </OptionsSection>
  );
}
