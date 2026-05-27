import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHistory } from "@/lib/api";
import { HistoryList } from "@/components/HistoryList";
import type { HistoryRun } from "@/types";

export function History() {
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory()
      .then(setRuns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (runId: string, _topic: string) => {
    navigate(`/report/${runId}`);
  };

  return (
    <HistoryList
      runs={runs}
      onSelect={handleSelect}
      loading={loading}
      error={error}
    />
  );
}