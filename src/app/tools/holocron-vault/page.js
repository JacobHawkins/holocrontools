import {
  Archive,
  Check,
  Clock,
  Download,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import styles from './holocron-vault.module.css';

export default function HolocronVaultPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.pill}>Holocron Vault</p>
          <h1>Simple guidance for your exported files</h1>
          <p>
            This page explains where your downloads land and how to keep them
            organized. Everything saves to your default download folder so you
            can stay in control.
          </p>
        </div>
        <div className={styles.panel}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.muted}>Vault usage</p>
            </div>
            <Download />
          </div>
          <p className={styles.muted}>
            All exports from Holocrontools save directly to your browser&apos;s
            default download directory. Use these notes as your quick checklist
            for sharing or archiving.
          </p>
          <div className={styles.metricRow}>
            <div className={styles.metric}>
              <Clock size={16} />
              <div>
                <p className={styles.muted}>Location</p>
                <strong>~/Downloads</strong>
              </div>
            </div>
            <div className={styles.metric}>
              <ShieldCheck size={16} />
              <div>
                <p className={styles.muted}>Privacy</p>
                <strong>Stays on-device</strong>
              </div>
            </div>
            <div className={styles.metric}>
              <Check size={16} />
              <div>
                <p className={styles.muted}>Ready to share</p>
                <strong>.txt / .json / .pdf</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
