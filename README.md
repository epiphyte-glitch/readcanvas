# ReadCanvas

A spatial reading environment that turns books into explorable knowledge canvases.

Upload a PDF, and ReadCanvas extracts the text into a lightweight, interactive surface. Footnotes become clickable portals. You can annotate, embed images, link ideas together, and trace your path through the text — all on an infinite canvas.

## The idea

Books are linear. Reading is not. When you hit a footnote, you want to follow it immediately — check the source, pull up related material, jot a thought. Most readers force you back into the scroll. ReadCanvas gives you a spatial workspace instead.

- **Footnotes as hyperlinks** — click a reference and it expands into a card you can drag, search, and connect
- **Text extraction** — PDFs are heavy; ReadCanvas pulls the text out and renders it as DOM, keeping things fast
- **Annotation cards** — drop notes anywhere on the canvas, link them to passages or to each other
- **Image embeds** — paste URLs or clipboard images alongside your reading
- **Reading trail** — every interaction is logged so you can retrace your journey through a book
- **Persistent state** — your workspace, annotations, and reading history survive page reloads (IndexedDB)
- **Document library** — switch between previously opened books, each with its own saved workspace
- **Search integration** — one-click search for any footnote on Google Scholar, Open Library, WorldCat

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The app loads with a demo text about the history of marginalia. Upload your own PDF to start reading.

## Project structure

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Main orchestrator with persistence
├── components/
│   ├── Toolbar.jsx           # Top action bar with save indicator
│   ├── TextPanel.jsx         # Main reading panel with clickable footnotes
│   ├── FootnoteCard.jsx      # Expandable footnote with multi-platform search
│   ├── AnnotationCard.jsx    # User notes
│   ├── ImageCard.jsx         # Image embeds (URL or clipboard paste)
│   ├── ConnectionLines.jsx   # SVG links between nodes
│   ├── HistoryPanel.jsx      # Reading trail sidebar
│   ├── UploadModal.jsx       # PDF/text upload with progress
│   └── DocumentLibrary.jsx   # Saved documents browser
├── hooks/
│   ├── useCanvas.js          # Pan, zoom, drag interactions
│   ├── useReadingHistory.js  # Reading trail state
│   └── useAutoSave.js        # Debounced auto-save to IndexedDB
├── utils/
│   ├── pdf.js                # PDF text extraction via pdf.js
│   ├── footnotes.js          # Footnote parsing and search URL building
│   └── storage.js            # IndexedDB persistence layer
└── styles/
    ├── reset.css             # Base reset
    └── tokens.js             # Design tokens (colors, fonts, spacing)
```

## Canvas interactions

| Action | Input |
|--------|-------|
| Pan | Drag background |
| Zoom | Scroll wheel |
| Move card | Drag card header |
| Add note | Toolbar → Add Note → click canvas |
| Link cards | Toolbar → Link → click two cards |
| Expand footnote | Click `[n]` in text |
| Search reference | Click "Search ↗" on footnote card |

## Roadmap

- [ ] Text selection → annotation linking
- [ ] Multi-page side-by-side view
- [x] Persistent canvas state (IndexedDB)
- [ ] Collaborative annotations
- [ ] EPUB support
- [ ] AI-powered footnote enrichment
- [ ] Export canvas as knowledge graph

## Tech

- React 19 + Vite
- pdf.js for text extraction
- IndexedDB for persistent state (documents, workspaces, reading history)
- No CSS framework — vanilla CSS with design tokens

## License

MIT
