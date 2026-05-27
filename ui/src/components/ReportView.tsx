import type { Report } from "@/types";
import styles from "./ReportView.module.css";

interface Props { report: Report; }

// Only render URLs that are real, working links
// Filters out example.com placeholders and malformed URLs
function isValidUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes("example.com")) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Show just the domain + path, not the full ugly URL
function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 1
      ? u.pathname.substring(0, 40) + (u.pathname.length > 40 ? "..." : "")
      : "";
    return u.hostname + path;
  } catch {
    return url;
  }
}

function SourcePill({ url }: { url: string }) {
  if (!isValidUrl(url)) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.sourcePill}
      title={url}
    >
      {formatUrl(url)}
    </a>
  );
}

export function ReportView({ report }: Props) {
  const meta = report.metadata;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.topic}>{report.topic}</span>
        <span className={styles.badge}>report ready</span>
      </div>

      {/* Metadata bar */}
      {meta && (
        <div className={styles.metaBar}>
          <MetaBadge label="Confidence" value={`${Math.round(meta.overall_confidence * 100)}%`} accent />
          <MetaBadge label="Verified claims" value={String(meta.verified_claims)} />
          <MetaBadge label="Disputed claims" value={String(meta.disputed_claims)} />
          <MetaBadge label="Contradictions" value={String(meta.contradictions_found)} />
        </div>
      )}

      {/* Introduction */}
      {report.introduction && (
        <p className={styles.intro}>{report.introduction}</p>
      )}

      {/* Consensus / disagreements */}
      {meta?.consensus && (
        <div className={styles.callout}>
          <span className={styles.calloutLabel}>Consensus</span>
          <p className={styles.calloutText}>{meta.consensus}</p>
        </div>
      )}
      {meta?.disagreements && (
        <div className={`${styles.callout} ${styles.calloutAmber}`}>
          <span className={styles.calloutLabel}>Areas of disagreement</span>
          <p className={styles.calloutText}>{meta.disagreements}</p>
        </div>
      )}

      {/* Sections */}
      {report.sections.map((section, i) => {
        const validSources = (section.sources ?? []).filter(isValidUrl);
        return (
          <div key={i} className={styles.section}>
            <h2 className={styles.sectionHeading}>{section.heading}</h2>
            <p className={styles.sectionContent}>{section.content}</p>
            {section.notes && (
              <div className={styles.sectionNote}>{section.notes}</div>
            )}
            {validSources.length > 0 && (
              <div className={styles.sources}>
                {validSources.map((url) => (
                  <SourcePill key={url} url={url} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Conclusion */}
      {report.conclusion && (
        <div className={styles.conclusion}>
          <span className={styles.conclusionLabel}>Conclusion</span>
          <p className={styles.conclusionText}>{report.conclusion}</p>
        </div>
      )}

      {/* All sources — only valid URLs, deduplicated */}
      {(() => {
        const validSources = (report.sources_cited ?? []).filter(isValidUrl);
        if (validSources.length === 0) return null;
        return (
          <div className={styles.allSources}>
            <span className={styles.allSourcesLabel}>Sources cited</span>
            <div className={styles.sourcesList}>
              {validSources.map((url) => (
                <SourcePill key={url} url={url} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function MetaBadge({
  label, value, accent = false,
}: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={styles.metaBadge}>
      <span className={styles.metaBadgeLabel}>{label}</span>
      <span className={`${styles.metaBadgeValue} ${accent ? styles.accent : ""}`}>
        {value}
      </span>
    </div>
  );
}