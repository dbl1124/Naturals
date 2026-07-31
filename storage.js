/* ============================================================
   Draft storage
   Two ways to keep an unfinished shot list:

   1. Autosave to IndexedDB — survives closing the tab, tied to
      this browser. Reference images are stored as raw bytes, not
      base64 strings, so big lists don't blow past storage limits
      the way localStorage would.
   2. A draft file (.json) the requestor downloads and re-opens
      later, or emails to a colleague to finish. Images ride
      along inside it as data URLs.

   Exposes: window.ShotlistStorage
   ============================================================ */

(function (global) {
  "use strict";

  const DB_NAME = "shotlist";
  const DB_VERSION = 1;
  const STORE = "drafts";
  const KEY = "current";

  const FILE_MARKER = "shotlist-draft";
  const FILE_VERSION = 1;

  /* ---------------- base64 <-> bytes ---------------- */
  function dataUrlToBytes(dataUrl) {
    const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToDataUrl(bytes, mime) {
    // Chunked — String.fromCharCode.apply blows the stack on big arrays.
    let bin = "";
    const CHUNK = 0x8000;
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, arr.subarray(i, i + CHUNK));
    }
    return "data:" + (mime || "image/jpeg") + ";base64," + btoa(bin);
  }

  /* ---------------- shape conversion ---------------- */
  // In memory each reference image is { name, dataUrl, w, h }.
  // On disk we swap the data URL for raw bytes.
  function toStored(data) {
    return Object.assign({}, data, {
      shots: (data.shots || []).map(function (s) {
        return Object.assign({}, s, {
          refImages: (s.refImages || []).map(function (img) {
            return { name: img.name, w: img.w, h: img.h, bytes: dataUrlToBytes(img.dataUrl) };
          }),
        });
      }),
    });
  }

  function fromStored(data) {
    return Object.assign({}, data, {
      shots: (data.shots || []).map(function (s) {
        return Object.assign({}, s, {
          refImages: (s.refImages || []).map(function (img) {
            return { name: img.name, w: img.w, h: img.h, dataUrl: bytesToDataUrl(img.bytes) };
          }),
        });
      }),
    });
  }

  /* ---------------- IndexedDB ---------------- */
  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB is not available in this browser"));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error("IndexedDB blocked by another tab")); };
    });
  }

  function saveDraft(data) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const record = { savedAt: new Date().toISOString(), data: toStored(data) };
        const t = db.transaction(STORE, "readwrite");
        t.objectStore(STORE).put(record, KEY);
        t.oncomplete = function () { db.close(); resolve(record.savedAt); };
        t.onerror = function () { db.close(); reject(t.error); };
        t.onabort = function () { db.close(); reject(t.error); };
      });
    });
  }

  function loadDraft() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const t = db.transaction(STORE, "readonly");
        const req = t.objectStore(STORE).get(KEY);
        t.oncomplete = function () {
          db.close();
          const rec = req.result;
          if (!rec || !rec.data) { resolve(null); return; }
          resolve({ savedAt: rec.savedAt, data: fromStored(rec.data) });
        };
        t.onerror = function () { db.close(); reject(t.error); };
        t.onabort = function () { db.close(); reject(t.error); };
      });
    });
  }

  function clearDraft() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const t = db.transaction(STORE, "readwrite");
        t.objectStore(STORE).delete(KEY);
        t.oncomplete = function () { db.close(); resolve(); };
        t.onerror = function () { db.close(); reject(t.error); };
        t.onabort = function () { db.close(); reject(t.error); };
      });
    });
  }

  /* ---------------- draft files ---------------- */
  function toDraftFile(data) {
    const payload = {
      _type: FILE_MARKER,
      version: FILE_VERSION,
      savedAt: new Date().toISOString(),
      data: data, // data URLs are already JSON-safe
    };
    return new Blob([JSON.stringify(payload)], { type: "application/json" });
  }

  function parseDraftFile(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      throw new Error("That file isn't a saved shot list draft (it isn't valid JSON).");
    }
    if (!payload || payload._type !== FILE_MARKER) {
      throw new Error("That file isn't a saved shot list draft.");
    }
    if (payload.version > FILE_VERSION) {
      throw new Error("That draft was saved by a newer version of this form.");
    }
    if (!payload.data || !Array.isArray(payload.data.shots)) {
      throw new Error("That draft file looks damaged — no shots found in it.");
    }
    return payload.data;
  }

  global.ShotlistStorage = {
    saveDraft: saveDraft,
    loadDraft: loadDraft,
    clearDraft: clearDraft,
    toDraftFile: toDraftFile,
    parseDraftFile: parseDraftFile,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.ShotlistStorage;
  }
})(typeof window !== "undefined" ? window : globalThis);
