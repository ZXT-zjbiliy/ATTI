export function PopupBoundarySummary() {
  return (
    <section aria-label="边界说明" className="atti-card">
      <div className="atti-card__header">
        <h2 className="atti-card__title">边界说明</h2>
        <p className="atti-card__subtitle">先把当前可用能力和限制讲清楚，避免误用。</p>
      </div>
      <div className="atti-stack atti-stack--tight">
        <p className="atti-footer-note">画像草稿、本地历史和推荐结果默认保存在当前设备。</p>
        <p className="atti-footer-note">只有在你主动开始 AI 规划时，系统才会调用当前 provider。</p>
        <p className="atti-footer-note">
          当前产品正过渡到 AI-first 多站点路线，但稳定试用路径仍以 Truity 为主。
        </p>
        <p className="atti-footer-note">
          点击“开始 AI 规划”后会尝试自动填写页面，但不会自动提交问卷。
        </p>
      </div>
    </section>
  );
}
