import { OptionsSection } from "./options-section";

export function DataManagementSection() {
  return (
    <OptionsSection title="数据管理">
      <p className="atti-footer-note">导出、清理、分组管理等能力会在后续版本逐步补齐。</p>
      <p className="atti-footer-note">当前阶段不提供破坏性数据操作，避免误删试用记录。</p>
    </OptionsSection>
  );
}
