# Holocrontools

Holocrontools is a local-first collection of browser tools. There is no
database, no account system, and no hidden storage. Everything lives in your
browser until you choose to export it. The goal is to build small, useful tools
people can rely on—even if their network is flaky or turned off.

## Principles

- **Local storage first.** Session data is cached in the browser. Clearing your
  storage is always your choice, and you can reload a saved file to restore a
  session instantly.
- **Portable saves.** Every tool will support exporting a single file you can
  keep, share, or bring back later. Losing cookies should never lose your work.
- **Free and ad-free.** No paywalls, no tracking pixels, and no logins.
- **Public domain mindset.** Use anything here as inspiration. Treat content,
  copy, and ideas as CC0/public domain unless noted otherwise.

## Current tools

- **PDF Difference Viewer** – Compare two PDFs locally and export a change
  report.
- **Timeline Builder** – Assemble a visual sequence of milestones with inline
  images and notes, saved directly to your device.
- **Holocron Vault** – A forthcoming place to manage exports from the other
  tools and keep local storage tidy.

## Developing locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to see the site.

## Hosting

The project is built as a static-friendly Next.js site and is deployed to
Render. API calls will only be added when absolutely necessary and will be
clearly labeled in the UI.
