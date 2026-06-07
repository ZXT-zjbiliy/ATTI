import { useState } from "react";

import { OptionsSection } from "./options-section";

interface DataManagementSectionProps {
  readonly onExportSessions: () => void;
  readonly onExportProfiles: () => void;
  readonly onPurgeCompletedSessions: () => void;
}

export function DataManagementSection({
  onExportSessions,
  onExportProfiles,
  onPurgeCompletedSessions
}: DataManagementSectionProps) {
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  async function handlePurge() {
    if (!window.confirm("确定要清除所有已完成的会话记录吗？此操作不可撤销。")) {
      return;
    }

    setIsPurging(true);
    setPurgeResult(null);

    try {
      await onPurgeCompletedSessions();
      setPurgeResult("已完成的会话记录已清除。");
    } catch (error) {
      setPurgeResult(error instanceof Error ? error.message : "清除失败。");
    } finally {
      setIsPurging(false);
    }
  }

  return (
    <OptionsSection title="数据管理">
      <div className="atti-stack atti-stack--tight">
        <button
          className="atti-button atti-button--secondary"
          type="button"
          onClick={() => {
            void onExportSessions();
          }}
        >
          导出全部会话
        </button>
        <button
          className="atti-button atti-button--secondary"
          type="button"
          onClick={() => {
            void onExportProfiles();
          }}
        >
          导出画像
        </button>
        <button
          className="atti-button atti-button--secondary"
          disabled={isPurging}
          type="button"
          onClick={() => {
            void handlePurge();
          }}
        >
          {isPurging ? "清除中..." : "清除已完成会话"}
        </button>
        {purgeResult ? <p className="atti-status-text">{purgeResult}</p> : null}
      </div>
      <p className="atti-footer-note">导出文件将自动下载为 JSON 格式。</p>
    </OptionsSection>
  );
}
