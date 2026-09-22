# Chat2PDF

Turn exported WhatsApp chats into beautiful, screenshot-style PDFs — entirely in your browser. Nothing is ever uploaded to a server.

## Features

- 📄 Drag-and-drop upload of a WhatsApp `.txt` export
- 🧠 Robust parser: multiline messages, system events, media placeholders, emoji/Unicode senders (including Sinhala/Tamil), both the Android (`date, time - Sender: text`) and iOS (`[date, time] Sender: text`) export formats
- 🎨 Full visual customization: per-participant bubble/text colors (with automatic contrast-safe text color), fonts, bubble radius/spacing/width, chat header, and background (built-in patterns or your own image)
- 📆 Flexible date splitting: no splitting, every N days, or a custom date range — with automatic sub-pagination so no image ever gets unreasonably tall (and no bubble is ever split in half)
- 🖼️ High-resolution PNG export per page, plus a combined PDF export (image-size, A4, Letter, or custom paper, portrait/landscape)
- 📊 Chat statistics panel (message counts, date range, most active participant, etc.)
- 🔒 Privacy-first: parsing, rendering, and PDF generation all happen client-side; nothing about your chat ever leaves your device

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

### Run the parser test suite

```bash
npm test
```

## Trying it out

A sample chat you can paste into a `.txt` file to try the app:

```text
10/09/2019, 15:54 - Emma: Hi
10/09/2019, 16:04 - Harry: Where are you?
10/09/2019, 16:04 - Emma: I'm heading to home
10/09/2019, 16:04 - Emma: Where're you now?
10/09/2019, 16:04 - Harry: On the train
```

## How it works

```text
.txt file
   │  (Browser File API — never leaves the device)
   ▼
WhatsApp parser (src/parser)
   │  → ChatMessage[] + detected participants
   ▼
Chat settings (colors, fonts, background, header…)
   ▼
Date-based splitting (src/utils/splitUtils.ts)
   │  → one group per day / N days / custom range
   ▼
Height-based pagination (src/pdf/imageGenerator.ts)
   │  → off-screen render + measure, binary-search split
   │    so no page exceeds the configured max height
   ▼
High-res capture (html-to-image) → PNG per page
   ▼
PDF assembly (src/pdf/pdfGenerator.ts, jsPDF) → downloadable PDF
```

Everything above runs in the browser's main thread using the DOM, React, and Canvas — there is no backend and no network request involving your chat's contents.

## Project structure

```text
src/
├── components/         # Presentational + composed UI (chat renderer, settings panels, export UI)
├── parser/              # WhatsApp .txt parser + date utilities (fully unit-tested)
├── pdf/                 # Off-screen rendering, height pagination, and PDF assembly
├── state/               # Default settings, presets, and context scaffolding
├── types/               # Shared TypeScript types (chat, participant, settings)
├── utils/               # Color/contrast, file, formatting, and date-splitting helpers
├── App.tsx              # Application shell: upload flow + editor layout
└── main.tsx             # Entry point
```

## Performance

Two things were tuned specifically for large chats and fast exports:

1. **Parsing runs in a Web Worker** (`src/parser/parser.worker.ts`), not the main thread. A 30MB export is hundreds of thousands of lines, and running that parse loop synchronously on the UI thread is exactly what triggers the browser's "page unresponsive" warning. The worker receives the `File` directly (so the 30MB of text is never copied between threads — the worker reads its own bytes), parses it, and reports progress back so the upload screen can show a real percentage instead of freezing.
2. **Image/PDF generation avoids redundant work**:
   - Height-based pagination measures every message's position in a **single** off-screen render per date-group, rather than repeatedly mounting candidate slices to binary-search for a page break. For a group that splits into, say, 5 pages, that's 1 mount instead of dozens.
   - Multiple pages render **concurrently** (a small worker pool, not one-at-a-time), which noticeably speeds up multi-page exports.
   - Each rendered page records its own pixel dimensions at capture time, so building the final PDF never has to reload and re-decode every image just to read its width/height.
   - Capture format defaults to **JPEG** (configurable, with a quality slider) instead of PNG — chat screenshots are mostly solid colors and text, so JPEG encodes/decodes markedly faster and produces smaller files at a quality cost that's usually imperceptible. Lossless PNG stays available in Export settings.
   - Resolution (pixel ratio) is also configurable from Export settings — dropping to 1x or 1.5x is the single biggest lever if you want faster turnaround on a very long chat and don't need print-grade sharpness.

If you're still working with genuinely enormous chats (multi-hundred-thousand messages), the remaining cost is inherent: every page still has to go through a real browser layout + canvas capture, and that's fundamentally proportional to how many pages you're generating. Splitting into smaller date ranges via "Custom date range" before generating is the most effective way to keep any single generation run fast.

## Notes & known trade-offs

- **Built-in backgrounds** are generated with plain CSS gradients rather than shipping any WhatsApp-owned artwork, so the app has zero external/binary asset dependencies.
- **Height-based pagination** works by rendering candidate pages off-screen and measuring their real height, then binary-searching for the largest number of messages that still fit — this is correctness-first rather than the fastest possible approach; very large chats (tens of thousands of messages) will take some time to paginate since each candidate is a real DOM measurement.
- **"Download all images"** triggers sequential browser downloads (staggered to avoid the browser blocking them) rather than zipping them, to avoid adding a zip dependency; the PDF export is the recommended way to get everything in one file.
- **UI preferences** (theme, output size, font, bubble style) are persisted to `localStorage` for convenience. The chat text you upload is **never** written to `localStorage` or any other persistent storage.
