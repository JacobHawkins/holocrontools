import { Archive, Import, ShieldCheck, Upload } from "lucide-react";
import styles from "../tool-page.module.css";

export default function HolocronVaultPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.pill}>Holocron Vault</p>
          <h1>Manage the files that power your local tools</h1>
          <p>
            Import exports from other Holocrontools screens, clean up local
            storage, and keep your offline workspace organized.
          </p>
        </div>
        <div className={styles.panel}>
          <h3>Planned experience</h3>
          <p>
            A single place to see your saved files, verify integrity, and
            rehydrate any tool with a click.
          </p>
          <div className={styles.pillRow}>
            <span className={styles.pill}>Local inventory</span>
            <span className={styles.pill}>Quick restore</span>
            <span className={styles.pill}>Portable backups</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Roadmap notes</h2>
        <div className={styles.list}>
          <article className={styles.card}>
            <Upload />
            <div>
              <h3>Unified import</h3>
              <p>
                Drag-and-drop saved JSON files to repopulate any Holocrontools
                experience instantly.
              </p>
            </div>
          </article>
          <article className={styles.card}>
            <Archive />
            <div>
              <h3>Local housekeeping</h3>
              <p>
                See how much space each tool is using in local storage and clear
                entries you no longer need.
              </p>
            </div>
          </article>
          <article className={styles.card}>
            <ShieldCheck />
            <div>
              <h3>Private by default</h3>
              <p>
                Nothing leaves your device unless you choose. Exports are yours
                to share, remix, or delete.
              </p>
            </div>
          </article>
          <article className={styles.card}>
            <Import />
            <div>
              <h3>Inter-tool awareness</h3>
              <p>
                Move assets between tools—PDF reports into the vault, timeline
                files back into the builder—without a server in sight.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
