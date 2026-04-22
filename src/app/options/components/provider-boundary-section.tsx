import { OptionsSection } from "./options-section";

export function ProviderBoundarySection() {
  return (
    <OptionsSection title="本地与 Provider 边界">
      <p className="atti-footer-note">画像草稿、题目、推荐结果、诊断信息与本地历史默认保存在当前设备。</p>
      <p className="atti-footer-note">只有在你主动开始 AI 规划时，系统才会调用所选 provider。</p>
      <p className="atti-footer-note">点击“开始 AI 规划”后，会生成建议并尝试填写页面，但不会自动提交问卷。</p>
      <p className="atti-footer-note">当前界面已转向 AI-first 多站点过渡表达，但稳定支持范围仍以 Truity 九型人格试用流为主。</p>
    </OptionsSection>
  );
}
