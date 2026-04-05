import JSZip from 'jszip';

/**
 * Extract structured text from an EPUB file.
 * Returns the same shape as pdf.js: { pages, totalPages }
 * where pages = [{ pageNumber, text, footnoteText, footnotes[] }]
 */
export async function extractEpubText(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Locate the OPF file via META-INF/container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Invalid EPUB: missing META-INF/container.xml');

  const containerXml = await containerFile.async('string');
  const opfPath = parseContainerXml(containerXml);

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);

  const opfXml = await opfFile.async('string');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const { manifest, spine } = parseOpf(opfXml);

  const pages = [];
  let pageNumber = 1;

  for (let i = 0; i < spine.length; i++) {
    const item = manifest[spine[i]];
    if (!item || !item.mediaType?.includes('html')) continue;

    // Resolve path relative to OPF directory
    const href = item.href.startsWith('/') ? item.href.slice(1) : opfDir + item.href;
    const chapterFile = zip.file(href) || zip.file(decodeURIComponent(href));
    if (!chapterFile) continue;

    const html = await chapterFile.async('string');
    const { text, footnotes } = extractFromHtml(html);

    if (text.trim()) {
      const footnoteText = footnotes.map(f => `${f.number}. ${f.text}`).join('\n');
      pages.push({ pageNumber, text, footnoteText, footnotes });
      pageNumber++;
    }

    if (onProgress) onProgress({ current: i + 1, total: spine.length });
  }

  if (pages.length === 0) throw new Error('No readable content found in EPUB');

  return { pages, totalPages: pages.length };
}

// ── OPF / container parsing ──────────────────────────────────────────────────

function parseContainerXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return doc.querySelector('rootfile')?.getAttribute('full-path') || 'OEBPS/content.opf';
}

function parseOpf(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  const manifest = {};
  doc.querySelectorAll('manifest item').forEach(item => {
    manifest[item.getAttribute('id')] = {
      href: item.getAttribute('href'),
      mediaType: item.getAttribute('media-type'),
    };
  });

  const spine = [];
  doc.querySelectorAll('spine itemref').forEach(ref => {
    const id = ref.getAttribute('idref');
    if (id) spine.push(id);
  });

  return { manifest, spine };
}

// ── HTML text + footnote extraction ─────────────────────────────────────────

function extractFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Remove non-content elements
  doc.querySelectorAll('script, style, nav').forEach(el => el.remove());

  // Collect footnote elements before stripping them from the tree.
  // EPUB3 uses epub:type="footnote"/"endnote"; EPUB2 often uses class names.
  const footnoteEls = [
    ...doc.querySelectorAll('[epub\\:type="footnote"]'),
    ...doc.querySelectorAll('[epub\\:type="endnote"]'),
    // Fall back to class-based heuristics
    ...doc.querySelectorAll('.footnote, .endnote, .fn, .note'),
  ];

  // Deduplicate (an element may match multiple selectors)
  const seen = new Set();
  const uniqueFootnoteEls = footnoteEls.filter(el => {
    if (seen.has(el)) return false;
    seen.add(el);
    return true;
  });

  const footnotes = [];
  let autoNumber = 1;

  uniqueFootnoteEls.forEach(el => {
    const raw = el.textContent.trim();
    if (!raw) return;

    // Try to peel off a leading number marker
    const numMatch = raw.match(/^(\d+)[.\s)\]]+/);
    const number = numMatch ? parseInt(numMatch[1]) : autoNumber++;
    const text = numMatch ? raw.slice(numMatch[0].length).trim() : raw;

    footnotes.push({ number, text });
    el.remove(); // strip from main text
  });

  // Replace noteref anchors with [n] markers in the main text
  doc.querySelectorAll('[epub\\:type="noteref"], a.footnote-ref, a.noteref').forEach(a => {
    const num = a.textContent.trim().replace(/[^0-9]/g, '');
    const marker = doc.createTextNode(num ? `[${num}]` : '');
    a.replaceWith(marker);
  });

  const text = nodeToText(doc.body || doc.documentElement);
  return { text, footnotes };
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li', 'tr', 'br', 'blockquote', 'section', 'article',
  'aside', 'header', 'footer', 'figure', 'figcaption',
]);

function nodeToText(root) {
  const parts = [];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent;
      if (t) parts.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    if (BLOCK_TAGS.has(tag)) parts.push('\n');

    for (const child of node.childNodes) walk(child);

    if (BLOCK_TAGS.has(tag)) parts.push('\n');
  }

  walk(root);
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Collect footnotes from all pages into a single map (same as collectFootnotes in pdf.js)
 */
export function collectEpubFootnotes(pages) {
  const map = {};
  for (const page of pages) {
    for (const fn of page.footnotes) {
      if (!map[fn.number]) {
        map[fn.number] = {
          text: fn.text,
          page: page.pageNumber,
          ...parseReference(fn.text),
        };
      }
    }
  }
  return map;
}

function parseReference(text) {
  const yearMatch = text.match(/\b(1[5-9]\d{2}|20[0-2]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;

  let author = null;
  const authorMatch = text.match(
    /^([A-Z][a-zé]+(?:\s+(?:and|&)\s+[A-Z][a-zé]+)?(?:,?\s+[A-Z]\.?)?)/
  );
  if (authorMatch) author = authorMatch[1].trim();

  return { author, year };
}
