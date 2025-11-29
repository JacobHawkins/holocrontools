'use client';

import { useEffect, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  FileDiff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import styles from './pdf.module.css';
import { useEffectOnce } from './use-effect-once';

let pdfjsLibPromise;

async function loadPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf').then((module) => {
      const pdfjs = module.default ?? module;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      return pdfjs;
    });
  }

  return pdfjsLibPromise;
}

const formatDuration = (ms) => {
  if (!ms || Number.isNaN(ms)) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
};

async function extractTextFromPdf(pdfjs, file, onProgress) {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  if (onProgress) {
    loadingTask.onProgress = ({ loaded, total }) =>
      onProgress({ loaded, total, phase: 'loading' });
  }
  const pdf = await loadingTask.promise;
  let text = '';

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    text += `${content.items.map((item) => item.str).join(' ')}\n`;
    if (onProgress) {
      onProgress({ loaded: pageIndex, total: pdf.numPages, phase: 'pages' });
    }
  }

  return text;
}

function computeNewText(latestText, outdatedText) {
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();
  const splitIntoSentences = (value) =>
    value
      .split(/(?<=[.!?])\s+|\n+/)
      .map(normalize)
      .filter(Boolean);

  const latestSentences = splitIntoSentences(latestText);
  const outdatedSentences = new Set(splitIntoSentences(outdatedText));
  const unique = latestSentences.filter(
    (sentence) => !outdatedSentences.has(sentence)
  );

  const seen = new Set();
  return unique.filter((entry) => {
    const deduped = entry.toLowerCase();
    if (seen.has(deduped)) return false;
    seen.add(deduped);
    return true;
  });
}

export default function PdfDiffPage() {
  const [latestFile, setLatestFile] = useState(null);
  const [outdatedFile, setOutdatedFile] = useState(null);
  const [differences, setDifferences] = useState([]);
  const [status, setStatus] = useState('Waiting for files');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [progress, setProgress] = useState({ latest: null, outdated: null });
  const [pdfjsLib, setPdfjsLib] = useState(null);

  useEffectOnce(() => {
    loadPdfJs()
      .then((lib) => {
        setPdfjsLib(lib);
      })
      .catch((err) => {
        console.error('Failed to load pdfjs', err);
        setError(
          'PDF engine failed to load. Please refresh and try again, or use a different browser.'
        );
      });
  });

  useEffect(() => {
    let timer;
    if (isProcessing) {
      const start = performance.now();
      timer = setInterval(() => setElapsedMs(performance.now() - start), 300);
    } else {
      setElapsedMs(0);
    }
    return () => clearInterval(timer);
  }, [isProcessing]);

  const eta = useMemo(() => {
    const totalLoaded = [progress.latest, progress.outdated]
      .filter(Boolean)
      .reduce((sum, entry) => sum + (entry.loaded || 0), 0);
    const totalSize = [progress.latest, progress.outdated]
      .filter(Boolean)
      .reduce((sum, entry) => sum + (entry.total || 0), 0);

    if (!totalLoaded || !totalSize) return 'estimating';
    const percent = totalLoaded / totalSize;
    if (!percent || percent <= 0) return 'estimating';
    const remaining = elapsedMs * (1 / percent - 1);
    return `${formatDuration(Math.max(remaining, 1000))}`;
  }, [elapsedMs, progress.latest, progress.outdated]);

  const handleCompare = async () => {
    if (!latestFile || !outdatedFile || !pdfjsLib) return;
    setError(null);
    setIsProcessing(true);
    setStatus('Extracting text...');
    setDifferences([]);
    setProgress({ latest: null, outdated: null });

    try {
      const [latestText, outdatedText] = await Promise.all([
        extractTextFromPdf(pdfjsLib, latestFile, (payload) =>
          setProgress((prev) => ({ ...prev, latest: payload }))
        ),
        extractTextFromPdf(pdfjsLib, outdatedFile, (payload) =>
          setProgress((prev) => ({ ...prev, outdated: payload }))
        ),
      ]);

      setStatus('Computing differences...');
      const uniqueText = computeNewText(latestText, outdatedText);
      setDifferences(uniqueText);
      setStatus(
        uniqueText.length ? 'Differences ready' : 'No new text detected'
      );
    } catch (err) {
      setError('We couldn’t process those PDFs. Please try different files.');
      setStatus('Something went wrong');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const header = 'PDF Diff Export';
    const timestamp = new Date().toISOString();
    const contents = differences.length
      ? differences.map((item, index) => `${index + 1}. ${item}`).join('\n\n')
      : 'No new text detected in the latest PDF.';

    const blob = new Blob(
      [
        `${header}\nGenerated: ${timestamp}\n\nItems unique to the latest PDF:\n\n${contents}\n`,
      ],
      {
        type: 'text/plain;charset=utf-8',
      }
    );

    saveAs(blob, 'pdf-text-diff.txt');
  };

  const canCompare = latestFile && outdatedFile && !isProcessing && !!pdfjsLib;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.pill}>PDF Text Difference</p>
          <h1>Find what changed between two PDFs</h1>
          <p>
            Upload the latest and outdated versions of a PDF to isolate new
            text. We focus purely on content differences—no previews, no
            markup—so you can export a clean checklist.
          </p>
        </div>
        <div className={styles.panel}>
          <div className={styles.cardHeader}>
            <FileDiff />
          </div>
          <p className={styles.muted}>
            Drop two PDFs, start the comparison, and watch the progress in real
            time. We’ll surface only the sentences that appear in the latest
            document.
          </p>
          <div className={styles.metricRow}>
            <div className={styles.metric}>
              <Clock size={16} />
              <div>
                <p className={styles.muted}>Elapsed</p>
                <strong>{formatDuration(elapsedMs)}</strong>
              </div>
            </div>
            <div className={styles.metric}>
              <RefreshCw size={16} />
              <div>
                <p className={styles.muted}>ETA</p>
                <strong>{eta}</strong>
              </div>
            </div>
            <div className={styles.metric}>
              <ShieldCheck size={16} />
              <div>
                <p className={styles.muted}>Privacy</p>
                <strong>Local only</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.muted}>Upload</p>
            <h2>Choose your files</h2>
          </div>
          <Upload />
        </div>
        <div className={styles.inputGrid}>
          <label className={styles.fileInput}>
            <span>Latest PDF</span>
            <input
              type='file'
              accept='application/pdf'
              onChange={(event) =>
                setLatestFile(event.target.files?.[0] || null)
              }
            />
            <p className={styles.muted}>
              {latestFile
                ? latestFile.name
                : 'Drop or browse for the most recent version'}
            </p>
          </label>
          <label className={styles.fileInput}>
            <span>Outdated PDF</span>
            <input
              type='file'
              accept='application/pdf'
              onChange={(event) =>
                setOutdatedFile(event.target.files?.[0] || null)
              }
            />
            <p className={styles.muted}>
              {outdatedFile
                ? outdatedFile.name
                : 'Drop or browse for the older version'}
            </p>
          </label>
        </div>
        <div className={styles.ctaRow}>
          <button
            type='button'
            className={styles.primaryButton}
            onClick={handleCompare}
            disabled={!canCompare}
          >
            {isProcessing ? (
              <>
                <Loader2 className={styles.spin} size={16} /> Comparing
              </>
            ) : (
              <>
                {' '}
                <FileDiff size={16} /> Compare{' '}
              </>
            )}
          </button>
          <p className={styles.status}>
            <span className={styles.pill}>{status}</span>
            {error && <span className={styles.errorText}>{error}</span>}
          </p>
        </div>
        <div className={styles.progressGrid}>
          {['latest', 'outdated'].map((key) => {
            const info = progress[key];
            const label = key === 'latest' ? 'Latest PDF' : 'Outdated PDF';
            const loaded = info?.loaded || 0;
            const total = info?.total || 0;
            const percent = total
              ? Math.min(100, Math.round((loaded / total) * 100))
              : 0;
            return (
              <div key={key} className={styles.progressCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.muted}>{label}</p>
                    <strong>{info ? `${percent}%` : 'Not started'}</strong>
                  </div>
                  {info ? <CheckCircle2 /> : <Clock />}
                </div>
                <div className={styles.progressBar}>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <p className={styles.muted}>
                  {info?.phase === 'pages'
                    ? `${loaded} of ${total} pages processed`
                    : info?.phase === 'loading'
                    ? `${Math.round(loaded / 1024)} KB of ${Math.round(
                        total / 1024
                      )} KB loaded`
                    : 'Awaiting file'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.muted}>Results</p>
            <h2>New text found</h2>
          </div>
          <ArrowDownToLine />
        </div>
        {differences.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.muted}>
              Upload two PDFs and run a comparison to see what the latest
              contains that the outdated version does not.
            </p>
          </div>
        ) : (
          <div className={styles.resultsBox}>
            <div className={styles.ctaRow}>
              <p className={styles.muted}>
                {differences.length} new sentences detected
              </p>
              <button
                type='button'
                className={styles.secondaryButton}
                onClick={handleExport}
              >
                <ArrowDownToLine size={16} /> Export .txt
              </button>
            </div>
            <ol className={styles.diffList}>
              {differences.map((item, index) => (
                <li key={item + index}>
                  <span className={styles.tag}>{index + 1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}
