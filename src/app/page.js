import {
  FileDiff,
  LayoutList,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wand2,
} from 'lucide-react';
import styles from './page.module.css';

const palette = {
  red: '#ff3939',
  green: '#00ce00',
  yellow: '#ffce29',
  aqua: '#00deff',
  forest: '#007b4a',
};

const tools = [
  {
    title: 'PDF Difference Viewer',
    description:
      'Load two PDFs, highlight visual and text deltas, and export a diff report—all without leaving your browser.',
    status: 'Constructing',
    accent: palette.red,
    icon: FileDiff,
    tags: [],
  },
  {
    title: 'Timeline Builder',
    description:
      'Drop in photos, captions, and milestones to craft a vivid, scrollable timeline you can save to disk and reload anytime.',
    status: 'Constructing',
    accent: palette.green,
    icon: LayoutList,
    tags: [],
  },
  {
    title: 'Holocron Vault',
    description:
      'A screen to manage your saved files, import exports from other tools, and keep your local workspace tidy.',
    status: 'Constructing',
    accent: palette.aqua,
    icon: ShieldCheck,
    tags: [],
  },
];

const principles = [
  {
    title: 'Local-first by design',
    description:
      'Everything runs in your browser. Storage is local, exports are portable, and nothing leaves your device unless you choose it.',
    accent: palette.green,
  },
  {
    title: 'Free. Free from Ads. Free from Accounts.',
    description:
      'The goal here is simple: useful tools that respect your privacy. No sign-ups, no tracking, no backdoors—just you and your work.',
    accent: palette.yellow,
  },
  {
    title: 'Ready for productivity',
    description:
      'The priority here is having the right tool for the right job. I hope to keep building tools that help you get things done, without distractions or bloat.',
    accent: palette.aqua,
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>
          Holocrontools
          <span className={styles.titleGlow}>simple + useful</span>
        </h1>
      </section>

      <section className={styles.tools} id='tools'>
        <div className={styles.sectionHeader}>
          <h2>Tools</h2>
        </div>
        <div className={styles.toolGrid}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <article
                key={tool.title}
                className={styles.toolCard}
                style={{ borderColor: tool.accent }}
              >
                <div className={styles.toolHeader}>
                  <div
                    className={styles.iconWrap}
                    style={{ backgroundColor: tool.accent }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <p
                      className={styles.toolStatus}
                      style={{ color: tool.accent }}
                    >
                      {tool.status}
                    </p>
                    <h3>{tool.title}</h3>
                  </div>
                </div>
                <p className={styles.toolCopy}>{tool.description}</p>
                <div className={styles.tagRow}>
                  {tool.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.principles} id='principles'>
        <div className={styles.sectionHeader}>
          <h2>Built for peace of mind</h2>
          <p>
            Zero databases. Portable saves. Friendly defaults that protect your
            work.
          </p>
        </div>
        <div className={styles.principleGrid}>
          {principles.map((item) => (
            <article key={item.title} className={styles.principleCard}>
              <div
                className={styles.principleAccent}
                style={{ backgroundColor: item.accent }}
              />
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className={styles.heroCard}>
        <div>
          <p className={styles.heroCardLabel}>Data flow</p>
          <h3>Local storage + optional exports</h3>
          <p className={styles.heroCardCopy}>
            Session state is cached in your browser. Need a fresh start after a
            cookie wipe? Reload your saved file and you&apos;re back in seconds.
          </p>
          <div className={styles.heroBadges}>
            <span style={{ backgroundColor: palette.red }}>No DBs</span>
            <span style={{ backgroundColor: palette.green }}>
              Offline-friendly
            </span>
            <span style={{ backgroundColor: palette.yellow }}>
              Shareable saves
            </span>
          </div>
        </div>
        <UploadCloud className={styles.heroIcon} size={88} strokeWidth={1.5} />
      </div>
    </div>
  );
}
