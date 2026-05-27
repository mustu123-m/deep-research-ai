import type { Step, RunStatus, RunMeta } from "@/types";
import styles from "./PipelineProgress.module.css";

interface Props {
  topic: string;
  status: RunStatus;
  steps: Step[];
  meta: RunMeta | null;
}

const ICONS: Record<string, string> = {
  search: "⌕", list: "≡", cpu: "◈",
  check: "✓", layers: "◎", file: "◎", circle: "○",
};

export function PipelineProgress({ topic, status, steps, meta }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.topic}>{topic}</span>
        <span className={`${styles.status} ${styles[status]}`}>{status}</span>
      </div>

      <div className={styles.steps}>
        {steps.map((step, i) => (
          <div key={step.node}>
            <div className={styles.step}>
              <div className={`${styles.icon} ${styles[step.state]}`}>
                {ICONS[step.icon] ?? "○"}
              </div>
              <div className={styles.body}>
                <div className={styles.stepName}>{step.label}</div>
                <div
                  className={`${styles.stepSummary} ${
                    step.state === "running" ? styles.live : ""
                  }`}
                >
                  {step.summary}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && <div className={styles.connector} />}
          </div>
        ))}
      </div>

      {meta && (
        <div className={styles.meta}>
          <MetaItem label="Duration" value={`${(meta.duration_ms / 1000).toFixed(1)}s`} />
          <MetaItem label="Summaries" value={String(meta.summaries)} />
          <MetaItem label="Claims" value={String(meta.claims)} />
          <MetaItem
            label="Confidence"
            value={`${Math.round(meta.confidence * 100)}%`}
            accent
          />
        </div>
      )}
    </div>
  );
}

function MetaItem({
  label, value, accent = false,
}: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={`${styles.metaValue} ${accent ? styles.accent : ""}`}>
        {value}
      </span>
    </div>
  );
}