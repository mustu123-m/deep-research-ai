import { useState } from "react";
import styles from "./SearchForm.module.css";

const EXAMPLES = [
  "Impact of AI on job market 2025",
  "Future of quantum computing",
  "Climate tech investment trends",
  "Remote work productivity research",
];

interface Props {
  onSubmit: (topic: string) => void;
  loading: boolean;
}

export function SearchForm({ onSubmit, loading }: Props) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) onSubmit(topic.trim());
  };

  return (
    <div className={styles.card}>
      <p className={styles.label}>What do you want to research?</p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.input}
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Impact of AI on job market 2025"
          disabled={loading}
          autoFocus
        />
        <button
          className={styles.btn}
          type="submit"
          disabled={loading || !topic.trim()}
        >
          {loading ? "Starting..." : "Run pipeline"}
        </button>
      </form>
      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            className={styles.chip}
            onClick={() => setTopic(ex)}
            disabled={loading}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}