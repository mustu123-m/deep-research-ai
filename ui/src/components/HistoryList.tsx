import type { HistoryRun } from "@/types";
import styles from "./HistoryList.module.css";

interface Props {
  runs: HistoryRun[];
  onSelect: (runId: string, topic: string) => void;
  loading: boolean;
  error: string | null;
}

export function HistoryList({ runs, onSelect, loading, error }: Props) {
  if (loading) {
    return <div className={styles.empty}>Loading history...</div>;
  }

  if (error) {
    return <div className={styles.error}>Failed to load history: {error}</div>;
  }

  if (runs.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>◎</div>
        <p>No runs yet. Start a research run from the <strong>New run</strong> tab.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {runs.map((run) => (
        <div
          key={run.runId}
          className={styles.item}
          onClick={() => onSelect(run.runId, run.topic)}
        >
          <div className={styles.itemLeft}>
            <div className={styles.itemTopic}>{run.topic}</div>
            <div className={styles.itemMeta}>
              {formatTime(run.startedAt)}
              {run.finishedAt && (
                <> · {((run.finishedAt - run.startedAt) / 1000).toFixed(1)}s</>
              )}
            </div>
          </div>
          <div className={styles.itemRight}>
            <span className={`${styles.status} ${styles[run.status]}`}>
              {run.status}
            </span>
            <button className={styles.btn}>View →</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}