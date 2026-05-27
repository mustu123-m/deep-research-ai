import { useState } from "react";
import { useResearch } from "@/hooks/useResearch";
import { SearchForm } from "@/components/SearchForm";
import { PipelineProgress } from "@/components/PipelineProgress";
import { ReportView } from "@/components/ReportView";
import styles from "./Home.module.css";

export function Home() {
  const [topic, setTopic] = useState("");
  const { run, runId, status, steps, meta, report, error, loading } = useResearch();

  const handleSubmit = (t: string) => {
    setTopic(t);
    run(t);
  };

  return (
    <div>
      <SearchForm onSubmit={handleSubmit} loading={loading} />

      {error && <div className={styles.error}>✕ {error}</div>}

      {runId && (
        <PipelineProgress
          topic={topic}
          status={status}
          steps={steps}
          meta={meta}
        />
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}