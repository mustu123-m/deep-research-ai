import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchReport } from "@/lib/api";
import { ReportView } from "@/components/ReportView";
import type { Report } from "@/types";
import styles from "./ReportPage.module.css";

export function ReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    fetchReport(runId)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return <div className={styles.state}>Loading report...</div>;
  if (error)   return <div className={styles.error}>✕ {error}</div>;
  if (!report) return <div className={styles.state}>No report found.</div>;

  return (
    <div>
      <button className={styles.back} onClick={() => navigate("/history")}>
        ← Back to history
      </button>
      <ReportView report={report} />
    </div>
  );
}