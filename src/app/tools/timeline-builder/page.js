/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ArrowDown,
  ArrowUp,
  Download,
  FileUp,
  ImagePlus,
  Plus,
  RefreshCcw,
  Save,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

const STORAGE_KEY = "holocrontools.timeline.v1";

function createEventId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TimelineBuilder() {
  const filePickerRef = useRef(null);
  const importPickerRef = useRef(null);
  const [events, setEvents] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.error("Failed to parse saved timeline", error);
    }
    return [];
  });
  const [draft, setDraft] = useState({
    title: "",
    date: "",
    description: "",
    accent: "#00deff",
    image: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

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
      handleDraftChange("image", event.target?.result || "");
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
        title: draft.title.trim() || "Untitled entry",
        date: draft.date,
        description: draft.description.trim(),
        accent: draft.accent,
        image: draft.image,
      },
    ]);

    setDraft({ title: "", date: "", description: "", accent: draft.accent, image: "" });
    if (filePickerRef.current) {
      filePickerRef.current.value = "";
    }
  }

  function updateEvent(id, field, value) {
    setEvents((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function updateImage(id, files) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateEvent(id, "image", event.target?.result || "");
    };
    reader.readAsDataURL(file);
  }

  function removeEvent(id) {
    setEvents((prev) => prev.filter((item) => item.id !== id));
  }

  function moveEvent(id, direction) {
    setEvents((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  function exportTimeline() {
    const payload = JSON.stringify(events, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "timeline-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(files) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result || "[]");
        if (Array.isArray(parsed)) {
          setEvents(parsed);
        }
      } catch (error) {
        console.error("Unable to import timeline", error);
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
          <button className={styles.ghost} onClick={() => importPickerRef.current?.click()}>
            <FileUp size={18} /> Import save
          </button>
          <button className={styles.primary} onClick={exportTimeline} disabled={!events.length}>
            <Download size={18} /> Export timeline
          </button>
          <input
            ref={importPickerRef}
            type="file"
            accept="application/json"
            onChange={(e) => handleImport(e.target.files)}
            className={styles.hiddenInput}
          />
        </div>
      </section>

      <section className={styles.layout}>
        <form className={styles.form} onSubmit={addEvent}>
          <div className={styles.formHeader}>
            <h2>Create an entry</h2>
            <p>Drop in dates, captions, and an optional image.</p>
          </div>
          <label className={styles.label}>
            Title
            <input
              type="text"
              value={draft.title}
              onChange={(e) => handleDraftChange("title", e.target.value)}
              placeholder="Graduation day"
            />
          </label>
          <label className={styles.label}>
            Date
            <input
              type="date"
              value={draft.date}
              onChange={(e) => handleDraftChange("date", e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Description
            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) => handleDraftChange("description", e.target.value)}
              placeholder="Who was there? What happened?"
            />
          </label>
          <div className={styles.row}>
            <label className={styles.label}>
              Accent
              <input
                type="color"
                value={draft.accent}
                onChange={(e) => handleDraftChange("accent", e.target.value)}
              />
            </label>
            <div className={styles.label}>
              Image (optional)
              <button
                type="button"
                className={styles.ghost}
                onClick={() => filePickerRef.current?.click()}
              >
                <ImagePlus size={18} /> Attach image
              </button>
              <input
                ref={filePickerRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={(e) => handleDraftImage(e.target.files)}
              />
              {draft.image && <p className={styles.hint}>Image ready to save.</p>}
            </div>
          </div>
          <button type="submit" className={styles.primary}>
            <Plus size={18} /> Add to timeline
          </button>
        </form>

        <div className={styles.timeline}>
          <div className={styles.formHeader}>
            <h2>Timeline</h2>
            <p>Reorder, edit, and preview your entries.</p>
          </div>
          {!events.length && (
            <div className={styles.empty}>
              <UploadCloud size={42} />
              <p>Start adding items to see them here.</p>
            </div>
          )}
          <div className={styles.eventList}>
            {events.map((item, index) => (
              <article key={item.id} className={styles.eventCard}>
                <div
                  className={styles.eventAccent}
                  style={{ backgroundColor: item.accent }}
                />
                <div className={styles.eventContent}>
                  <div className={styles.eventControls}>
                    <div className={styles.eventActions}>
                      <button
                        type="button"
                        className={styles.circle}
                        onClick={() => moveEvent(item.id, "up")}
                        aria-label="Move up"
                        disabled={index === 0}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.circle}
                        onClick={() => moveEvent(item.id, "down")}
                        aria-label="Move down"
                        disabled={index === events.length - 1}
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.circle}
                      onClick={() => removeEvent(item.id)}
                      aria-label="Remove"
                    >
                      <RefreshCcw size={16} />
                    </button>
                  </div>
                  <div className={styles.fields}>
                    <input
                      className={styles.inlineInput}
                      value={item.title}
                      onChange={(e) => updateEvent(item.id, "title", e.target.value)}
                    />
                    <input
                      className={styles.inlineInput}
                      type="date"
                      value={item.date}
                      onChange={(e) => updateEvent(item.id, "date", e.target.value)}
                    />
                  </div>
                  <textarea
                    className={styles.inlineText}
                    rows={2}
                    value={item.description}
                    onChange={(e) => updateEvent(item.id, "description", e.target.value)}
                    placeholder="Add notes"
                  />
                  <div className={styles.eventFooter}>
                    <label className={styles.colorLabel}>
                      Accent
                      <input
                        type="color"
                        value={item.accent}
                        onChange={(e) => updateEvent(item.id, "accent", e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      className={styles.ghost}
                      onClick={() => document.getElementById(`img-${item.id}`)?.click()}
                    >
                      <ImagePlus size={16} />
                      {item.image ? "Replace" : "Add"} image
                    </button>
                    <input
                      id={`img-${item.id}`}
                      type="file"
                      accept="image/*"
                      className={styles.hiddenInput}
                      onChange={(e) => updateImage(item.id, e.target.files)}
                    />
                  </div>
                </div>
                {item.image && (
                  <div className={styles.thumbnail}>
                    <img src={item.image} alt="Timeline item" />
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
          <h2>Live preview</h2>
          <p>Your timeline, ordered chronologically where dates exist.</p>
        </div>
        <div className={styles.previewTrack}>
          {sortedEvents.map((item) => (
            <div key={item.id} className={styles.previewItem}>
              <div className={styles.previewDot} style={{ borderColor: item.accent }} />
              <div className={styles.previewCard}>
                <div className={styles.previewMeta}>
                  <span className={styles.previewDate}>{item.date || "No date"}</span>
                  <span className={styles.previewAccent} style={{ background: item.accent }} />
                </div>
                <h3>{item.title || "Untitled"}</h3>
                <p>{item.description || "Add details to flesh this out."}</p>
                {item.image && (
                  <img className={styles.previewImage} src={item.image} alt="Timeline visual" />
                )}
              </div>
            </div>
          ))}
          {!sortedEvents.length && (
            <div className={styles.emptyPreview}>
              <Save size={22} />
              <p>Add entries to see the timeline preview.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
