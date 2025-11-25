import Link from 'next/link';
import {
  FileDiff,
  LayoutList,
  ShieldCheck,
  UploadCloud,
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
    href: '/tools/pdf-diff',
  },
  {
    title: 'Timeline Builder',
    description:
      'Drop in photos, captions, and milestones to craft a vivid, scrollable timeline you can save to disk and reload anytime.',
    status: 'Constructing',
    accent: palette.green,
    icon: LayoutList,
    href: '/tools/timeline-builder',
  },
  {
    title: 'Holocron Vault',
    description:
      'A screen to manage your saved files, import exports from other tools, and keep your local workspace tidy.',
    status: 'Constructing',
    accent: palette.aqua,
    icon: ShieldCheck,
    href: '/tools/holocron-vault',
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

const dataFlow = [
  {
    title: 'No databases—ever',
    description:
      'Your work lives in local storage by default. Export it whenever you want a portable backup.',
    accent: palette.red,
  },
  {
    title: 'Portable saves',
    description:
      'Download a single file to recreate your session after clearing cookies or switching devices.',
    accent: palette.yellow,
  },
  {
    title: 'Offline-friendly',
    description:
      'Most features run without a network connection. API calls only happen when you explicitly opt in.',
    accent: palette.forest,
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
              <Link key={tool.title} href={tool.href} className={styles.toolLink}>
                <article
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
                </article>
              </Link>
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
      <section className={styles.dataFlow} id='data-flow'>
        <div className={styles.sectionHeader}>
          <h2>Data flow</h2>
          <p>Local storage first, with optional exports for peace of mind.</p>
        </div>
        <div className={styles.dataGrid}>
          {dataFlow.map((item) => (
            <article key={item.title} className={styles.dataCard}>
              <div
                className={styles.dataAccent}
                style={{ backgroundColor: item.accent }}
              />
              <div className={styles.dataCopy}>
                <p className={styles.dataLabel}>Local-first</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <UploadCloud
                className={styles.dataIcon}
                size={42}
                strokeWidth={1.75}
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
