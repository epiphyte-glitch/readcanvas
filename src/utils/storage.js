/**
 * Persistent storage layer using IndexedDB.
 * 
 * Schema:
 *   - documents: stored extracted text, footnotes, metadata per file
 *   - workspaces: canvas nodes, connections, view state per document
 *   - history: reading trail entries per document
 *   - meta: app-level state (last opened document, preferences)
 */

const DB_NAME = 'readcanvas';
const DB_VERSION = 2;

const STORES = {
  documents: 'documents',
  workspaces: 'workspaces',
  history: 'history',
  meta: 'meta',
  files: 'files',       // raw PDF/binary storage
};

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORES.documents)) {
        const docStore = db.createObjectStore(STORES.documents, { keyPath: 'id' });
        docStore.createIndex('name', 'name', { unique: false });
        docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.workspaces)) {
        const wsStore = db.createObjectStore(STORES.workspaces, { keyPath: 'documentId' });
        wsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.history)) {
        db.createObjectStore(STORES.history, { keyPath: 'documentId' });
      }

      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }

      // v2: raw file storage (ArrayBuffer / Blob)
      if (!db.objectStoreNames.contains(STORES.files)) {
        db.createObjectStore(STORES.files, { keyPath: 'documentId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function tx(storeName, mode = 'readonly') {
  const db = await openDb();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Document operations ────────────────────────────────────────

export async function saveDocument(doc) {
  const store = await tx(STORES.documents, 'readwrite');
  const record = {
    ...doc,
    updatedAt: Date.now(),
  };
  return reqToPromise(store.put(record));
}

export async function getDocument(id) {
  const store = await tx(STORES.documents);
  return reqToPromise(store.get(id));
}

export async function listDocuments() {
  const store = await tx(STORES.documents);
  const all = await reqToPromise(store.getAll());
  return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function deleteDocument(id) {
  const docStore = await tx(STORES.documents, 'readwrite');
  await reqToPromise(docStore.delete(id));

  // Also clean up workspace, history, and raw file
  const wsStore = await tx(STORES.workspaces, 'readwrite');
  await reqToPromise(wsStore.delete(id));

  const hStore = await tx(STORES.history, 'readwrite');
  await reqToPromise(hStore.delete(id));

  const fStore = await tx(STORES.files, 'readwrite');
  await reqToPromise(fStore.delete(id));
}

// ─── Workspace operations (nodes, connections, view) ────────────

export async function saveWorkspace(documentId, workspace) {
  const store = await tx(STORES.workspaces, 'readwrite');
  return reqToPromise(store.put({
    documentId,
    nodes: workspace.nodes,
    connections: workspace.connections,
    viewOffset: workspace.viewOffset,
    viewZoom: workspace.viewZoom,
    updatedAt: Date.now(),
  }));
}

export async function getWorkspace(documentId) {
  const store = await tx(STORES.workspaces);
  return reqToPromise(store.get(documentId));
}

// ─── History operations ─────────────────────────────────────────

export async function saveHistory(documentId, entries) {
  const store = await tx(STORES.history, 'readwrite');
  return reqToPromise(store.put({
    documentId,
    entries: entries.slice(-500), // cap at 500 entries
    updatedAt: Date.now(),
  }));
}

export async function getHistory(documentId) {
  const store = await tx(STORES.history);
  const record = await reqToPromise(store.get(documentId));
  return record?.entries || [];
}

// ─── Meta operations ────────────────────────────────────────────

export async function setMeta(key, value) {
  const store = await tx(STORES.meta, 'readwrite');
  return reqToPromise(store.put({ key, value, updatedAt: Date.now() }));
}

export async function getMeta(key) {
  const store = await tx(STORES.meta);
  const record = await reqToPromise(store.get(key));
  return record?.value ?? null;
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Generate a stable document ID from filename + size.
 * Two uploads of the same file get the same workspace.
 */
export function makeDocumentId(filename, textLength) {
  const raw = `${filename}::${textLength}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `doc_${Math.abs(hash).toString(36)}`;
}

// ─── Raw file operations ────────────────────────────────────────

export async function saveFile(documentId, arrayBuffer) {
  const store = await tx(STORES.files, 'readwrite');
  return reqToPromise(store.put({ documentId, data: arrayBuffer, updatedAt: Date.now() }));
}

export async function getFile(documentId) {
  const store = await tx(STORES.files);
  const record = await reqToPromise(store.get(documentId));
  return record?.data ?? null;
}

export async function deleteFile(documentId) {
  const store = await tx(STORES.files, 'readwrite');
  return reqToPromise(store.delete(documentId));
}

/**
 * Debounced save — returns a function that delays saving until
 * the user stops making changes for `delay` ms.
 */
export function createDebouncedSaver(saveFn, delay = 800) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => saveFn(...args), delay);
  };
}
