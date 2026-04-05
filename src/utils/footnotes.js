/**
 * Parse text content and split into text segments and footnote markers.
 * Handles [1], [2] style references in the body text.
 */
export function parseTextWithFootnotes(text) {
  const parts = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'footnote', number: parseInt(match[1]) });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

/**
 * Build a search query for a footnote reference.
 * Prioritizes author + title + year for academic search.
 */
export function buildSearchQuery(footnote) {
  const parts = [];
  if (footnote.author) parts.push(footnote.author);
  if (footnote.year) parts.push(String(footnote.year));
  if (parts.length === 0) {
    // Fallback: use first ~60 chars of the text
    parts.push(footnote.text.slice(0, 60));
  }
  return parts.join(' ');
}

/**
 * Generate a URL for searching a footnote on various platforms.
 */
export function getSearchUrl(footnote, platform = 'scholar') {
  const query = encodeURIComponent(buildSearchQuery(footnote));

  const platforms = {
    scholar: `https://scholar.google.com/scholar?q=${query}`,
    openlibrary: `https://openlibrary.org/search?q=${query}`,
    worldcat: `https://www.worldcat.org/search?q=${query}`,
    google: `https://www.google.com/search?q=${query}`,
  };

  return platforms[platform] || platforms.scholar;
}
