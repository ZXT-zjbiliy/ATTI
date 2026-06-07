import type { DebugSnapshot } from "../services/options-debug-client";
import { OptionsSection } from "./options-section";

function buildSessionHistoryLabel(args: {
  siteId: string;
  startedAt: string;
  status: string;
  questionCount: number;
  recommendationCount: number;
}) {
  return `${args.siteId} / ${args.startedAt} / ${args.status} / ${args.questionCount} 题 / ${args.recommendationCount} 条推荐`;
}

interface DebugViewSectionProps {
  readonly snapshot: DebugSnapshot | null;
  readonly isLoading: boolean;
}

export function DebugViewSection({ snapshot, isLoading }: DebugViewSectionProps) {
  return (
    <OptionsSection title="调试视图">
      {isLoading ? <p className="atti-status-text">正在加载调试快照...</p> : null}
      {snapshot ? (
        <div className="atti-stack atti-stack--tight">
          <p className="atti-status-text">运行时：{snapshot.runtimeName}</p>
          <p className="atti-status-text">运行状态：{snapshot.runtimeStatus}</p>
          <p className="atti-status-text">
            当前 provider：{snapshot.activeSettings.activeProvider}
          </p>
          <p className="atti-status-text">调试模式：{String(snapshot.activeSettings.debugMode)}</p>
          <p className="atti-status-text">
            是否存在画像草稿：{String(snapshot.hasActiveProfileDraft)}
          </p>
          <p className="atti-status-text">当前画像 ID：{snapshot.activeProfileId ?? "无"}</p>
          <p className="atti-status-text">最近一次会话摘要：{snapshot.lastSessionSummary}</p>
          <p className="atti-status-text">最近会话历史：</p>
          {snapshot.recentSessionHistory.length === 0 ? (
            <p className="atti-status-text">当前还没有本地会话历史。</p>
          ) : (
            <ul className="atti-list">
              {snapshot.recentSessionHistory.map((entry) => (
                <li key={entry.id}>
                  {buildSessionHistoryLabel({
                    siteId: entry.siteId,
                    startedAt: entry.startedAt,
                    status: entry.status,
                    questionCount: entry.questionCount,
                    recommendationCount: entry.recommendationCount
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </OptionsSection>
  );
}
