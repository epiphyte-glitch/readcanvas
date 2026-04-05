import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker. Vite will handle the URL resolution.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Quickly read page count from a PDF without full extraction.
 * Returns { totalPages, arrayBuffer } — the buffer is reused for rendering.
 */
export async function getPdfPageCount(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  // Pass a *copy* to pdf.js — getDocument transfers the buffer to the worker,
  // detaching the original. We keep the original for storage.
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  if (onProgress) {
    loadingTask.onProgress = ({ loaded, total }) => {
      if (total > 0) onProgress({ loaded, total });
    };
  }
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  await pdf.destroy();
  return { totalPages, arrayBuffer };
}

/**
 * Extract structured text from a PDF file.
 * Returns an array of page objects: { pageNumber, text, footnotes[] }
 *
 * Footnotes are detected by common patterns:
 *   - Superscript numbers followed by text at page bottom
 *   - Lines matching /^\d+\s+\w/
 */
export async function extractPdfText(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    // Sort items by vertical position (top to bottom)
    const items = textContent.items
      .filter(item => item.str.trim().length > 0)
      .map(item => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        fontSize: item.transform[0],
        height: item.height,
      }))
      .sort((a, b) => b.y - a.y); // PDF coords: y increases upward

    // Heuristic: items in the bottom 20% with small font are likely footnotes
    const mainFontSize = detectMainFontSize(items);
    const footnoteThresholdY = pageHeight * 0.25;

    const mainItems = [];
    const footnoteItems = [];

    for (const item of items) {
      if (item.y < footnoteThresholdY && item.fontSize < mainFontSize * 0.9) {
        footnoteItems.push(item);
      } else {
        mainItems.push(item);
      }
    }

    // Reconstruct text with line detection
    const mainText = reconstructText(mainItems);
    const footnoteText = reconstructText(footnoteItems);

    // Parse footnotes from the footnote region
    const footnotes = parseFootnotes(footnoteText);

    pages.push({
      pageNumber: i,
      text: mainText,
      footnoteText,
      footnotes,
    });

    if (onProgress) {
      onProgress({ current: i, total: totalPages });
    }
  }

  return { pages, totalPages };
}

/**
 * Detect the most common font size (likely body text)
 */
function detectMainFontSize(items) {
  const sizes = {};
  for (const item of items) {
    const rounded = Math.round(item.fontSize * 10) / 10;
    sizes[rounded] = (sizes[rounded] || 0) + item.text.length;
  }
  let maxLen = 0;
  let mainSize = 12;
  for (const [size, len] of Object.entries(sizes)) {
    if (len > maxLen) {
      maxLen = len;
      mainSize = parseFloat(size);
    }
  }
  return mainSize;
}

/**
 * Reconstruct readable text from positioned items.
 * Groups items into lines based on Y-position proximity.
 */
function reconstructText(items) {
  if (items.length === 0) return '';

  // Group into lines (items within 2px of same Y)
  const lines = [];
  let currentLine = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const prevY = currentLine[0].y;
    if (Math.abs(items[i].y - prevY) < 3) {
      currentLine.push(items[i]);
    } else {
      lines.push(currentLine);
      currentLine = [items[i]];
    }
  }
  lines.push(currentLine);

  // Sort each line by X position, join
  return lines
    .map(line => {
      line.sort((a, b) => a.x - b.x);
      return line.map(item => item.text).join(' ');
    })
    .join('\n');
}

/**
 * Parse footnote text into structured footnotes.
 * Handles patterns like:
 *   1. Some footnote text
 *   1 Some footnote text
 *   [1] Some footnote text
 */
function parseFootnotes(text) {
  if (!text.trim()) return [];

  const footnotes = [];
  const regex = /(?:^|\n)\s*\[?(\d+)\]?[.\s]+(.+?)(?=(?:\n\s*\[?\d+\]?[.\s])|\n\n|$)/gs;
  let match;

  while ((match = regex.exec(text)) !== null) {
    footnotes.push({
      number: parseInt(match[1]),
      text: match[2].trim(),
    });
  }

  // If regex didn't catch anything, try splitting by number patterns
  if (footnotes.length === 0 && /\d/.test(text)) {
    const parts = text.split(/(?=\d+[\s.])/);
    for (const part of parts) {
      const m = part.match(/^(\d+)[.\s]+(.+)/s);
      if (m) {
        footnotes.push({
          number: parseInt(m[1]),
          text: m[2].trim(),
        });
      }
    }
  }

  return footnotes;
}

/**
 * Flatten pages into a single text string with page markers
 */
export function flattenPages(pages) {
  return pages
    .map(p => `— Page ${p.pageNumber} —\n\n${p.text}`)
    .join('\n\n');
}

/**
 * Collect all footnotes across pages into a single map
 */
export function collectFootnotes(pages) {
  const map = {};
  for (const page of pages) {
    for (const fn of page.footnotes) {
      map[fn.number] = {
        text: fn.text,
        page: page.pageNumber,
        // We'll attempt to parse author/year from the text
        ...parseReference(fn.text),
      };
    }
  }
  return map;
}

/**
 * Try to extract author and year from a reference string.
 * Handles patterns like:
 *   "Smith, J. (2019). Title..."
 *   "Smith 2019"
 *   "J. Smith, Title (Publisher, 2019)"
 */
function parseReference(text) {
  const yearMatch = text.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  // Try "LastName, Initial." or "Initial. LastName" at start
  let author = null;
  const authorMatch = text.match(
    /^([A-Z][a-zé]+(?:\s+(?:and|&)\s+[A-Z][a-zé]+)?(?:,?\s+[A-Z]\.?)?)/
  );
  if (authorMatch) {
    author = authorMatch[1].trim();
  }

  return { author, year };
}
