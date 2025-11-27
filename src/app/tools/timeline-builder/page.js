/* eslint-disable @next/next/no-img-element */
'use client';

import {
  Download,
  FileUp,
  ImagePlus,
  Plus,
  RefreshCcw,
  Save,
  Trash,
  UploadCloud,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import localforage from 'localforage';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './page.module.css';

const METADATA_KEY = 'holocrontools.timeline.meta.v1';
const LEGACY_STORAGE_KEY = 'holocrontools.timeline.v1';
const IMAGE_PREFIX = 'holocrontools.timeline.image.';
const accentOptions = ['#ff3939', '#00ce00', '#ffce29', '#1a8bff'];
const viewModes = [
  { value: 'vertical', label: 'Top-down' },
  { value: 'horizontal', label: 'Line with stops' },
  { value: 'gallery', label: 'Photo gallery' },
];

function formatDate(input) {
  if (!input) return 'No date';
  const date = new Date(input);
  if (Number.isNaN(date)) return input;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

function createEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function AccentPicker({ value, onChange }) {
  const activeColor = value || accentOptions[0];

  return (
    <div className={styles.accentControls}>
      <div className={styles.colorInputRow}>
        <input
          type='color'
          value={activeColor}
          onChange={(e) => onChange(e.target.value)}
        />
        <span
          className={styles.accentPreview}
          style={{ backgroundColor: activeColor }}
          aria-hidden
        />
        <span className={styles.accentValue}>{activeColor.toUpperCase()}</span>
      </div>
      <div className={styles.paletteRow}>
        {accentOptions.map((color) => (
          <button
            key={color}
            type='button'
            className={`${styles.swatch} ${
              activeColor === color ? styles.swatchSelected : ''
            }`}
            style={{ background: color }}
            aria-label={`Use accent ${color}`}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TimelineBuilder() {
  const filePickerRef = useRef(null);
  const importPickerRef = useRef(null);
  const previewRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState({
    title: '',
    date: '',
    description: '',
    accent: accentOptions[0],
    image: '',
  });
  const [viewMode, setViewMode] = useState('vertical');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    localforage.config({ name: 'holocrontools' });

    const hydrate = async () => {
      try {
        let savedMetadata = await localforage.getItem(METADATA_KEY);

        if (!Array.isArray(savedMetadata)) {
          const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) {
            savedMetadata = JSON.parse(legacy);
          }
        }

        if (Array.isArray(savedMetadata) && isMounted) {
          const eventsWithImages = await Promise.all(
            savedMetadata.map(async (item) => {
              const storedImage = await localforage.getItem(`${IMAGE_PREFIX}${item.id}`);
              return {
                ...item,
                image: storedImage || item.image || '',
              };
            })
          );
          if (isMounted) {
            setEvents(eventsWithImages);
          }
        }
      } catch (error) {
        console.error('Failed to load saved timeline', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return;

    const persist = async () => {
      try {
        const metadataOnly = events.map(({ image, ...rest }) => rest);
        await localforage.setItem(METADATA_KEY, metadataOnly);

        const imageKeysToKeep = new Set(
          events.filter((item) => item.image).map((item) => `${IMAGE_PREFIX}${item.id}`)
        );

        const storeImages = events.map((item) => {
          const key = `${IMAGE_PREFIX}${item.id}`;
          if (!item.image) {
            return localforage.removeItem(key);
          }
          return localforage.setItem(key, item.image);
        });

        const cleanup = localforage.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(IMAGE_PREFIX) && !imageKeysToKeep.has(key))
              .map((key) => localforage.removeItem(key))
          )
        );

        await Promise.all([...storeImages, cleanup]);
        setStorageMessage('');
      } catch (error) {
        console.error('Failed to persist timeline', error);
        setStorageMessage(
          'Unable to save timeline locally. Please export to retain your data.'
        );
      }
    };

    persist();
  }, [events, isHydrated]);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      }),
    [events]
  );

  function handleDraftChange(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleDraftImage(files) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleDraftChange('image', event.target?.result || '');
    };
    reader.readAsDataURL(file);
  }

  function addEvent(event) {
    event.preventDefault();
    if (!draft.title.trim() && !draft.description.trim()) return;

    setEvents((prev) => [
      ...prev,
      {
        id: createEventId(),
        title: draft.title.trim() || 'Untitled entry',
        date: draft.date,
        description: draft.description.trim(),
        accent: draft.accent,
        image: draft.image,
      },
    ]);

    setDraft({
      title: '',
      date: '',
      description: '',
      accent: draft.accent,
      image: '',
    });
    if (filePickerRef.current) {
      filePickerRef.current.value = '';
    }
  }

  function updateEvent(id, field, value) {
    setEvents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function updateImage(id, files) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateEvent(id, 'image', event.target?.result || '');
    };
    reader.readAsDataURL(file);
  }

  function removeEvent(id) {
    setEvents((prev) => prev.filter((item) => item.id !== id));
  }

  function exportTimeline(format) {
    if (!events.length) return;

    if (format === 'json') {
      const payload = JSON.stringify(sortedEvents, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'timeline-export.json';
      link.click();
      URL.revokeObjectURL(url);
      setIsExportOpen(false);
      return;
    }

    const cleanup = prepareHorizontalExportLayout();
    if (!previewRef.current) return;
    setIsExportingImage(true);
    toPng(previewRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      style: { background: '#0b0e14' },
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'timeline-preview.png';
        link.click();
      })
      .catch((error) => console.error('Failed to export preview', error))
      .finally(() => {
        cleanup();
        setIsExportOpen(false);
        setIsExportingImage(false);
      });
  }

  function prepareHorizontalExportLayout() {
    if (viewMode !== 'horizontal' || !previewRef.current) {
      return () => {};
    }

    const surface = previewRef.current;
    const scroller = surface.querySelector(`.${styles.horizontalScroller}`);
    const track = scroller?.querySelector(`.${styles.horizontalTrack}`);

    if (!scroller || !track) {
      return () => {};
    }

    const originalSurfaceStyle = surface.getAttribute('style');
    const originalScrollerStyle = scroller.getAttribute('style');

    const contentWidth = track.scrollWidth;
    const contentHeight = track.scrollHeight;

    scroller.style.overflow = 'visible';
    scroller.style.width = `${contentWidth}px`;
    scroller.style.height = `${contentHeight}px`;

    surface.style.width = `${contentWidth + 32}px`;
    surface.style.height = `${contentHeight + 32}px`;

    return () => {
      if (originalSurfaceStyle) {
        surface.setAttribute('style', originalSurfaceStyle);
      } else {
        surface.removeAttribute('style');
      }

      if (originalScrollerStyle) {
        scroller.setAttribute('style', originalScrollerStyle);
      } else {
        scroller.removeAttribute('style');
      }
    };
  }

  function handleImport(files) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result || '[]');
        if (Array.isArray(parsed)) {
          setEvents(parsed);
        }
      } catch (error) {
        console.error('Unable to import timeline', error);
      }
    };
    reader.readAsText(file);
  }

  function resetTimeline() {
    setEvents([]);
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.kicker}>Timeline Builder</p>
          <h1>Build, save, and reload your story locally</h1>
          <p className={styles.lede}>
            Craft a visual sequence of photos, milestones, and notes. Everything
            stays in your browser—export a portable file to reload your progress
            anytime.
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.ghost}
            onClick={() => importPickerRef.current?.click()}
          >
            <FileUp size={18} /> Import save
          </button>
          <button
            className={styles.primary}
            onClick={() => setIsExportOpen(true)}
            disabled={!events.length}
          >
            <Download size={18} /> Export timeline
          </button>
          <input
            ref={importPickerRef}
            type='file'
            accept='application/json'
            onChange={(e) => handleImport(e.target.files)}
            className={styles.hiddenInput}
          />
        </div>
      </section>

      {storageMessage && (
        <div className={styles.storageWarning} role='status'>
          <UploadCloud size={18} />
          <div>
            <strong>Local save limited</strong>
            <p>{storageMessage}</p>
          </div>
        </div>
      )}

      <section className={styles.layout}>
        <form className={styles.form} onSubmit={addEvent}>
          <div className={styles.formHeader}>
            <h2>Create an entry</h2>
            <p>Drop in dates, captions, and an optional image.</p>
          </div>
          <label className={styles.label}>
            Title
            <input
              type='text'
              value={draft.title}
              onChange={(e) => handleDraftChange('title', e.target.value)}
              placeholder='Graduation day'
            />
          </label>
          <label className={styles.label}>
            Date
            <input
              type='date'
              value={draft.date}
              onChange={(e) => handleDraftChange('date', e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Description
            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) => handleDraftChange('description', e.target.value)}
              placeholder='Who was there? What happened?'
            />
          </label>
          <div className={styles.row}>
            <label className={styles.label}>
              Accent
              <AccentPicker
                value={draft.accent}
                onChange={(color) => handleDraftChange('accent', color)}
              />
            </label>

            <div className={styles.label}>
              Image (optional)
              <button
                type='button'
                className={styles.ghost}
                onClick={() => filePickerRef.current?.click()}
              >
                <ImagePlus size={18} /> Attach image
              </button>
              <input
                ref={filePickerRef}
                type='file'
                accept='image/*'
                className={styles.hiddenInput}
                onChange={(e) => handleDraftImage(e.target.files)}
              />
              {draft.image && (
                <p className={styles.hint}>Image ready to save.</p>
              )}
            </div>
          </div>
          <button type='submit' className={styles.primary}>
            <Plus size={18} /> Add to timeline
          </button>
        </form>

        <div className={styles.timeline}>
          <div className={styles.formHeader}>
            <h2>Timeline</h2>
            <p>Edit and preview your entries (oldest first).</p>
          </div>
          {!events.length && (
            <div className={styles.empty}>
              <UploadCloud size={42} />
              <p>Start adding items to see them here.</p>
            </div>
          )}
          <div className={styles.eventList}>
            {sortedEvents.map((item) => (
              <article key={item.id} className={styles.eventCard}>
                <div
                  className={styles.eventAccent}
                  style={{ backgroundColor: item.accent }}
                />
                <div className={styles.eventContent}>
                  <div className={styles.eventControls}>
                    <button
                      type='button'
                      className={styles.circle}
                      onClick={() => removeEvent(item.id)}
                      aria-label='Remove'
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                  <div className={styles.fields}>
                    <input
                      className={styles.inlineInput}
                      value={item.title}
                      onChange={(e) =>
                        updateEvent(item.id, 'title', e.target.value)
                      }
                    />
                    <input
                      className={styles.inlineInput}
                      type='date'
                      value={item.date}
                      onChange={(e) =>
                        updateEvent(item.id, 'date', e.target.value)
                      }
                    />
                  </div>
                  <textarea
                    className={styles.inlineText}
                    rows={2}
                    value={item.description}
                    onChange={(e) =>
                      updateEvent(item.id, 'description', e.target.value)
                    }
                    placeholder='Add notes'
                  />
                  <div className={styles.eventFooter}>
                    <label className={styles.colorLabel}>
                      Accent
                      <AccentPicker
                        value={item.accent}
                        onChange={(color) =>
                          updateEvent(item.id, 'accent', color)
                        }
                      />
                    </label>
                    <button
                      type='button'
                      className={styles.ghost}
                      onClick={() =>
                        document.getElementById(`img-${item.id}`)?.click()
                      }
                    >
                      <ImagePlus size={16} />
                      {item.image ? 'Replace' : 'Add'} image
                    </button>
                    <input
                      id={`img-${item.id}`}
                      type='file'
                      accept='image/*'
                      className={styles.hiddenInput}
                      onChange={(e) => updateImage(item.id, e.target.files)}
                    />
                  </div>
                </div>
                {item.image && (
                  <div className={styles.thumbnail}>
                    <img src={item.image} alt='Timeline item' />
                  </div>
                )}
              </article>
            ))}
          </div>
          {events.length > 0 && (
            <div className={styles.secondaryActions}>
              <button className={styles.ghost} onClick={resetTimeline}>
                <RefreshCcw size={16} /> Clear timeline
              </button>
              <p className={styles.hint}>Saved locally after every change.</p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.preview}>
        <div className={styles.previewHeader}>
          <div>
            <h2>Live preview</h2>
            <p>Your timeline, ordered chronologically where dates exist.</p>
          </div>
          <label className={styles.modePicker}>
            View mode
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
            >
              {viewModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          ref={previewRef}
          className={`${styles.previewSurface} ${
            styles[`${viewMode}Surface`] || ''
          }`}
        >
          {viewMode === 'vertical' && (
            <div className={styles.previewTrack}>
              {sortedEvents.map((item) => (
                <div key={item.id} className={styles.previewItem}>
                  <div
                    className={styles.previewDot}
                    style={{
                      borderColor: item.accent,
                      boxShadow: `0 0 0 6px ${item.accent}20`,
                    }}
                  />
                  <div className={styles.previewCard}>
                    <div className={styles.previewMeta}>
                      <span className={styles.previewDate}>
                        {formatDate(item.date)}
                      </span>
                      <span
                        className={styles.previewAccent}
                        style={{ background: item.accent }}
                      />
                    </div>
                    <h3>{item.title || 'Untitled'}</h3>
                    <p>
                      {item.description || 'Add details to flesh this out.'}
                    </p>
                    {item.image && (
                      <div className={styles.previewImageFrame}>
                        <img
                          className={styles.previewImage}
                          src={item.image}
                          alt='Timeline visual'
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'horizontal' && (
            <div className={styles.horizontalScroller}>
              <div className={styles.horizontalTrack}>
                <div className={styles.horizontalLine} />
                {sortedEvents.map((item, index) => (
                  <div key={item.id} className={styles.horizontalStop}>
                    <div
                      className={styles.stopMarker}
                      style={{
                        borderColor: item.accent,
                        boxShadow: `0 0 0 8px ${item.accent}14`,
                      }}
                    />
                    <div
                      className={`${styles.stopCard} ${
                        index % 2 ? styles.stopCardBelow : styles.stopCardAbove
                      }`}
                      style={{
                        borderTopColor: item.accent,
                        '--accent': item.accent,
                      }}
                    >
                      <div className={styles.previewMeta}>
                        <span className={styles.previewDate}>
                          {formatDate(item.date)}
                        </span>
                        <span
                          className={styles.previewAccent}
                          style={{ background: item.accent }}
                        />
                      </div>
                      <h3>{item.title || 'Untitled'}</h3>
                      <p>
                        {item.description || 'Add details to flesh this out.'}
                      </p>
                      {item.image && (
                        <div className={styles.previewImageFrame}>
                          <img
                            className={styles.previewImage}
                            src={item.image}
                            alt='Timeline visual'
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'gallery' && (
            <div className={styles.galleryGrid}>
              {sortedEvents.map((item, index) => (
                <figure
                  key={item.id}
                  className={`${styles.galleryItem} ${
                    index % 2 ? styles.galleryFlip : ''
                  }`}
                >
                  <div
                    className={styles.galleryImageFrame}
                    style={{ borderColor: item.accent }}
                  >
                    {item.image ? (
                      <img
                        className={styles.galleryImage}
                        src={item.image}
                        alt={item.title || 'Timeline visual'}
                      />
                    ) : (
                      <div
                        className={styles.galleryPlaceholder}
                        style={{ color: item.accent }}
                      >
                        <UploadCloud size={26} />
                        <span>No image</span>
                      </div>
                    )}
                  </div>
                  <figcaption className={styles.galleryCaption}>
                    <span
                      className={styles.previewAccent}
                      style={{ background: item.accent }}
                    />
                    <div>
                      <h4>{item.title || 'Untitled'}</h4>
                      <p>{formatDate(item.date)}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {!sortedEvents.length && (
            <div className={styles.emptyPreview}>
              <Save size={22} />
              <p>Add entries to see the timeline preview.</p>
            </div>
          )}
        </div>
      </section>

      {isExportOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsExportOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Export timeline</h3>
              <p>
                Choose your format. We will export exactly what you see in the
                preview.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.primary}
                onClick={() => exportTimeline('json')}
                disabled={!events.length}
              >
                <Download size={18} /> Export JSON
              </button>
              <button
                className={styles.ghost}
                onClick={() => exportTimeline('png')}
                disabled={!events.length || isExportingImage}
              >
                <Save size={18} />{' '}
                {isExportingImage ? 'Rendering...' : 'Export PNG'}
              </button>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.closeButton}
                type='button'
                onClick={() => setIsExportOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
