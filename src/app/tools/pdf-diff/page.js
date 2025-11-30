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
  const pages = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();

    const lines = [];
    let currentLine = [];

    content.items.forEach((item, idx) => {
      const normalized = item.str.replace(/\s+/g, ' ').trim();
      if (!normalized) return;
      currentLine.push(normalized);

      // pdf.js marks the end of a visual line with hasEOL. If the last item on
      // the page never sets it, push whatever we have when we reach the end.
      if (item.hasEOL || idx === content.items.length - 1) {
        lines.push(currentLine.join(' '));
        currentLine = [];
      }
    });

    pages.push(lines.join('\n'));
    if (onProgress) {
      onProgress({ loaded: pageIndex, total: pdf.numPages, phase: 'pages' });
    }
  }

  return pages;
}

const normalizeText = (value) => value.replace(/\s+/g, ' ').trim();

function splitIntoLines(value) {
  return value
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function isSimilarText(a, b, threshold = 0.9) {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  if (!normalizedA || !normalizedB) return normalizedA === normalizedB;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length) || 1;
  const similarity = 1 - distance / maxLength;

  return similarity >= threshold;
}

function computeNewText(latestPages, outdatedPages) {
  return latestPages.reduce((acc, pageText, pageIndex) => {
    const latestLines = splitIntoLines(pageText);
    const outdatedLines = splitIntoLines(outdatedPages[pageIndex] || '');
    const seenOnPage = new Set();

    // Track which outdated lines have already been paired to avoid
    // undercounting or overcounting when sentences repeat.
    const usedOutdated = new Set();

    const uniqueOnPage = latestLines.filter((line) => {
      const deduped = normalizeText(line).toLowerCase();
      if (seenOnPage.has(deduped)) return false;
      seenOnPage.add(deduped);

      if (!outdatedLines.length) return true;

      // Pair each line with its best match to avoid a single similar
      // sentence suppressing multiple differences on the page.
      let bestMatchIndex = -1;
      let bestSimilarity = 0;

      outdatedLines.forEach((outdatedLine, idx) => {
        if (usedOutdated.has(idx)) return;
        const normalizedOutdated = normalizeText(outdatedLine);
        const normalizedLatest = normalizeText(line);
        if (!normalizedLatest || !normalizedOutdated) return;
        const distance = levenshteinDistance(
          normalizedLatest,
          normalizedOutdated
        );
        const maxLength = Math.max(
          normalizedLatest.length,
          normalizedOutdated.length,
          1
        );
        const similarity = 1 - distance / maxLength;
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatchIndex = idx;
        }
      });

      // Require a stronger similarity score before treating lines as the same
      // to avoid missing small but meaningful edits.
      const isMatch = bestSimilarity >= 0.94;
      if (isMatch && bestMatchIndex !== -1) usedOutdated.add(bestMatchIndex);
      return !isMatch;
    });

    if (!uniqueOnPage.length) return acc;

    return [
      ...acc,
      {
        page: pageIndex + 1,
        example: uniqueOnPage[0],
        total: uniqueOnPage.length,
      },
    ];
  }, []);
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
      const [latestPages, outdatedPages] = await Promise.all([
        extractTextFromPdf(pdfjsLib, latestFile, (payload) =>
          setProgress((prev) => ({ ...prev, latest: payload }))
        ),
        extractTextFromPdf(pdfjsLib, outdatedFile, (payload) =>
          setProgress((prev) => ({ ...prev, outdated: payload }))
        ),
      ]);

      setStatus('Computing differences...');
      const uniqueByPage = computeNewText(latestPages, outdatedPages);
      setDifferences(uniqueByPage);
      setStatus(
        uniqueByPage.length ? 'Differences ready' : 'No new text detected'
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
      ? differences
          .map(
            ({ page, total, example }) =>
              `Page ${page}: ${total} new sentence${
                total === 1 ? '' : 's'
              }. Example: ${example}`
          )
          .join('\n\n')
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
                New text detected on {differences.length} page
                {differences.length === 1 ? '' : 's'}
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
              {differences.map(({ page, example, total }) => (
                <li key={`page-${page}`}>
                  <span className={styles.tag}>Page {page}</span>
                  <div className={styles.resultText}>
                    <p className={styles.muted}>
                      {total} new difference{total === 1 ? '' : 's'} on this page
                    </p>
                    <p>{example}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </main>
  );
}
