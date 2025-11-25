import { FileDiff, Highlighter, ShieldCheck } from "lucide-react";
import styles from "../tool-page.module.css";

export default function PdfDiffPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.pill}>PDF Difference Viewer</p>
          <h1>See the exact change between two PDFs</h1>
          <p>
            Load two documents, highlight visual and text deltas, and export a
            shareable report. Everything runs in your browser—no uploads to any
            server.
          </p>
        </div>
        <div className={styles.panel}>
          <h3>Planned experience</h3>
          <p>
            Side-by-side view with layered highlights, downloadable diff
            summaries, and the ability to save sessions locally.
          </p>
          <div className={styles.pillRow}>
            <span className={styles.pill}>Local compare</span>
            <span className={styles.pill}>Exportable reports</span>
            <span className={styles.pill}>No accounts</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>What we&apos;re building</h2>
        <div className={styles.list}>
          <article className={styles.card}>
            <FileDiff />
            <div>
              <h3>Visual + text diffs</h3>
              <p>
                Detect layout shifts, changed images, and updated text without
                leaving the page.
              </p>
            </div>
          </article>
          <article className={styles.card}>
            <Highlighter />
            <div>
              <h3>Shareable highlights</h3>
              <p>
                Export a JSON or PDF summary of changes so you can reload the
                session or pass it along.
              </p>
            </div>
          </article>
          <article className={styles.card}>
            <ShieldCheck />
            <div>
              <h3>Private by default</h3>
              <p>
                All rendering happens locally. If we ever call an API, it will
                be optional and clearly labeled.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
