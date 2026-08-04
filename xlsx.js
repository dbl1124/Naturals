/* ============================================================
   Minimal .xlsx writer — no external libraries.
   An .xlsx file is a ZIP of XML parts; entries are stored
   uncompressed, which every version of Excel accepts.
   Exposes: buildShotListXlsx(data) -> Uint8Array
   ============================================================ */

(function (global) {
  "use strict";

  /* ---------------- CRC32 (required by the ZIP format) ------ */
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  /* ---------------- ZIP container (stored entries) ---------- */
  function encodeUtf8(str) {
    return new TextEncoder().encode(str);
  }

  function buildZip(entries) {
    // entries: [{ name: string, data: Uint8Array }]
    // Fixed timestamp keeps output deterministic (2026-01-01 12:00).
    const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
    const DOS_TIME = 12 << 11;

    const chunks = [];
    const central = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = encodeUtf8(entry.name);
      const data = entry.data;
      const crc = crc32(data);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true); // version needed
      local.setUint16(6, 0, true); // flags
      local.setUint16(8, 0, true); // method: stored
      local.setUint16(10, DOS_TIME, true);
      local.setUint16(12, DOS_DATE, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      local.setUint16(28, 0, true); // extra length

      chunks.push(new Uint8Array(local.buffer), nameBytes, data);

      const cent = new DataView(new ArrayBuffer(46));
      cent.setUint32(0, 0x02014b50, true);
      cent.setUint16(4, 20, true); // version made by
      cent.setUint16(6, 20, true); // version needed
      cent.setUint16(8, 0, true);
      cent.setUint16(10, 0, true);
      cent.setUint16(12, DOS_TIME, true);
      cent.setUint16(14, DOS_DATE, true);
      cent.setUint32(16, crc, true);
      cent.setUint32(20, data.length, true);
      cent.setUint32(24, data.length, true);
      cent.setUint16(28, nameBytes.length, true);
      cent.setUint16(30, 0, true);
      cent.setUint16(32, 0, true);
      cent.setUint16(34, 0, true);
      cent.setUint16(36, 0, true);
      cent.setUint32(38, 0, true);
      cent.setUint32(42, offset, true);
      central.push(new Uint8Array(cent.buffer), nameBytes);

      offset += 30 + nameBytes.length + data.length;
    }

    let centralSize = 0;
    for (const c of central) centralSize += c.length;

    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(8, entries.length, true);
    eocd.setUint16(10, entries.length, true);
    eocd.setUint32(12, centralSize, true);
    eocd.setUint32(16, offset, true);

    let total = offset + centralSize + 22;
    const out = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    for (const c of central) {
      out.set(c, pos);
      pos += c.length;
    }
    out.set(new Uint8Array(eocd.buffer), pos);
    return out;
  }

  function dataUrlToBytes(dataUrl) {
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if (typeof atob === "function") {
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(b64, "base64")); // Node (tests)
  }

  /* ---------------- XML helpers ------------------------------ */
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      // Strip control chars Excel rejects
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }

  function colLetter(n) {
    // 1 -> A, 2 -> B, ...
    let s = "";
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function strCell(ref, styleId, text) {
    const t = String(text == null ? "" : text);
    if (t === "") return '<c r="' + ref + '" s="' + styleId + '"/>';
    return (
      '<c r="' + ref + '" s="' + styleId + '" t="inlineStr"><is><t xml:space="preserve">' +
      esc(t) +
      "</t></is></c>"
    );
  }

  function numCell(ref, styleId, n) {
    return '<c r="' + ref + '" s="' + styleId + '"><v>' + n + "</v></c>";
  }

  /* ---------------- Workbook parts ---------------------------- */
  function contentTypesXml(hasImages) {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      (hasImages ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : "") +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      (hasImages
        ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
        : "") +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      "</Types>"
    );
  }

  const ROOT_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const WORKBOOK =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Shot List" sheetId="1" r:id="rId1"/></sheets>' +
    "</workbook>";

  const WORKBOOK_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    "</Relationships>";

  const SHEET1_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>' +
    "</Relationships>";

  /* Style ids used by the sheet builder:
     0 default | 1 title | 2 subtitle | 3 note | 4 section band
     5 column header | 6 body text (wrap) | 7 body centered
     8 notes label (bold) */
  const STYLES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    "<fonts count=\"6\">" +
    '<font><sz val="11"/><name val="Arial"/></font>' +
    '<font><b/><sz val="11"/><name val="Arial"/></font>' +
    '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>' +
    '<font><i/><sz val="10"/><color rgb="FF5B6572"/><name val="Arial"/></font>' +
    '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF1F4468"/><name val="Arial"/></font>' +
    "</fonts>" +
    '<fills count="5">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4468"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF3A76AD"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFE1ECF6"/></patternFill></fill>' +
    "</fills>" +
    '<borders count="2">' +
    "<border><left/><right/><top/><bottom/><diagonal/></border>" +
    '<border><left style="thin"><color rgb="FFC9D6E2"/></left><right style="thin"><color rgb="FFC9D6E2"/></right><top style="thin"><color rgb="FFC9D6E2"/></top><bottom style="thin"><color rgb="FFC9D6E2"/></bottom><diagonal/></border>' +
    "</borders>" +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="9">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>' +
    '<xf numFmtId="0" fontId="1" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>' +
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1" indent="1"/></xf>' +
    '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>' +
    "</cellXfs>" +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    "</styleSheet>";

  /* ---------------- Sheet builder ----------------------------- */
  const HEADERS = [
    "Shot #",
    "SKU Number",
    "Product Description",
    "Shot Type",
    "Angle / View",
    "Props / Styling Notes",
    "Key Features to Highlight",
    "Reference / Example Link",
    "Orientation",
    "Intended Use",
    "Priority",
    "Retouching / Notes",
    "Reference Images",
  ];

  /* ---- inline reference thumbnails ----
     Excel has no true in-cell picture: images are floating shapes
     anchored to a cell. They sit in the last column so the wide
     column never pushes the spec columns off screen, and only on a
     shot group's first row so a 225-row group isn't 225 copies. */
  const EMU_PER_PX = 9525;
  const THUMB_W = 108;     // display box per thumbnail, px
  const THUMB_H = 112;
  const THUMB_GAP = 6;
  const THUMB_PAD = 4;
  const MAX_INLINE = 4;    // matches the form's per-shot upload cap
  const IMAGE_COL = HEADERS.length;            // 1-based: last column
  const IMAGE_ROW_PT = Math.round((THUMB_H + THUMB_PAD * 2) * 0.75); // px -> points

  // wide enough for MAX_INLINE thumbs; Excel widths are ~7px per unit
  const IMAGE_COL_WIDTH =
    Math.ceil((THUMB_PAD * 2 + MAX_INLINE * THUMB_W + (MAX_INLINE - 1) * THUMB_GAP - 5) / 7);

  const COL_WIDTHS = [8, 16, 30, 22, 22, 32, 30, 28, 14, 24, 15, 32, IMAGE_COL_WIDTH];

  function buildSheetXml(data) {
    const lastCol = colLetter(HEADERS.length); // M
    const rows = [];
    const merges = [];

    // Row 1 — title
    const title = (data.companyName ? data.companyName + " " : "") + "PHOTOGRAPHY SHOT LIST";
    rows.push('<row r="1" ht="32" customHeight="1">' + strCell("A1", 1, title.toUpperCase()) + "</row>");
    merges.push("A1:" + lastCol + "1");

    // Row 2 — project info line
    const info = [];
    info.push("Project: " + (data.project || "—"));
    if (data.requesterEmail) info.push("Requested by: " + data.requesterEmail);
    rows.push('<row r="2" ht="22" customHeight="1">' + strCell("A2", 2, info.join("   |   ")) + "</row>");
    merges.push("A2:" + lastCol + "2");

    // Row 3 — note
    rows.push(
      '<row r="3" ht="18" customHeight="1">' +
        strCell("A3", 3, "One row = one final shot. Submitted via the online shot list form on " + (data.submittedOn || "") + ".") +
        "</row>"
    );
    merges.push("A3:" + lastCol + "3");

    // Row 4 — section bands (mirrors the original workbook)
    const sections = [
      ["A", "C", "PRODUCT & SHOT"],
      ["D", "E", "CREATIVE DIRECTION"],
      ["F", "H", "SHOT DETAILS"],
      ["I", "J", "DELIVERABLE"],
      ["K", "L", "PRIORITY & POST"],
      ["M", "M", "REFERENCE"],
    ];
    let r4 = '<row r="4" ht="18" customHeight="1">';
    for (const [c1, c2, label] of sections) {
      r4 += strCell(c1 + "4", 4, label);
      merges.push(c1 + "4:" + c2 + "4");
    }
    r4 += "</row>";
    rows.push(r4);

    // Row 5 — column headers
    let r5 = '<row r="5" ht="30" customHeight="1">';
    HEADERS.forEach(function (h, i) {
      r5 += strCell(colLetter(i + 1) + "5", 5, h);
    });
    r5 += "</row>";
    rows.push(r5);

    // Rows 6+ — one row per finished image. SKUs and angles multiply,
    // so a shot covering 75 SKUs from 3 angles becomes rows 7.1 … 7.225
    // and the photographer gets a checklist. SKU-major order keeps each
    // product's angles together, which is how a set actually runs.
    const centeredCols = new Set([1, 9, 11]); // Shot #, Orientation, Priority
    const placements = []; // { row, images } for the drawing part
    let rowIdx = 6;
    (data.shots || []).forEach(function (shot, i) {
      const imgCount = (shot.refImages || []).length;
      const skuList = shot.skus && shot.skus.length ? shot.skus : [""];
      const angleList = shot.angles && shot.angles.length ? shot.angles : [""];
      const combos = [];
      skuList.forEach(function (sku) {
        angleList.forEach(function (angle) { combos.push([sku, angle]); });
      });
      const multi = combos.length > 1;

      combos.forEach(function (combo, j) {
        const sku = combo[0];
        // Thumbnails ride the group's first row only
        const carriesImages = j === 0 && imgCount > 0;
        if (carriesImages) {
          placements.push({ row: rowIdx, images: shot.refImages.slice(0, MAX_INLINE) });
        }
        const values = [
          multi ? i + 1 + "." + (j + 1) : i + 1,
          sku,
          shot.description,
          shot.shotType,
          combo[1],
          shot.props,
          shot.features,
          shot.referenceLink,
          shot.orientation,
          Array.isArray(shot.intendedUse) ? shot.intendedUse.join(", ") : shot.intendedUse,
          shot.priority,
          shot.retouching,
          "", // the pictures float over this cell
        ];
        let row =
          '<row r="' + rowIdx + '"' +
          (carriesImages ? ' ht="' + IMAGE_ROW_PT + '" customHeight="1"' : "") +
          ">";
        values.forEach(function (v, c) {
          const ref = colLetter(c + 1) + rowIdx;
          const style = centeredCols.has(c + 1) ? 7 : 6;
          if (c === 0 && !multi) {
            row += numCell(ref, style, Number(v));
          } else {
            row += strCell(ref, style, v);
          }
        });
        row += "</row>";
        rows.push(row);
        rowIdx++;
      });
    });

    // Optional general notes block
    if (data.notes) {
      rowIdx++; // blank spacer row
      rows.push('<row r="' + rowIdx + '">' + strCell("A" + rowIdx, 8, "General Notes:") + "</row>");
      merges.push("A" + rowIdx + ":" + "C" + rowIdx);
      rowIdx++;
      rows.push('<row r="' + rowIdx + '" ht="40" customHeight="1">' + strCell("A" + rowIdx, 6, data.notes) + "</row>");
      merges.push("A" + rowIdx + ":" + lastCol + rowIdx);
    }

    let cols = "<cols>";
    COL_WIDTHS.forEach(function (w, i) {
      cols += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    });
    cols += "</cols>";

    let mergeXml = "";
    if (merges.length) {
      mergeXml = '<mergeCells count="' + merges.length + '">';
      merges.forEach(function (m) {
        mergeXml += '<mergeCell ref="' + m + '"/>';
      });
      mergeXml += "</mergeCells>";
    }

    const xml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      cols +
      "<sheetData>" +
      rows.join("") +
      "</sheetData>" +
      mergeXml +
      (placements.length ? '<drawing r:id="rId1"/>' : "") +
      "</worksheet>";

    return { xml: xml, placements: placements };
  }

  /* ---------------- drawing part (the inline thumbnails) ------- */
  function buildDrawing(placements) {
    const anchors = [];
    const media = [];

    placements.forEach(function (p) {
      p.images.forEach(function (img, i) {
        const id = media.length + 1;
        media.push(img);

        const natW = img.w || THUMB_W;
        const natH = img.h || THUMB_H;
        const scale = Math.min(THUMB_W / natW, THUMB_H / natH, 1);
        const w = Math.max(1, Math.round(natW * scale));
        const h = Math.max(1, Math.round(natH * scale));

        // centre each thumb in its slot so mixed shapes stay tidy
        const slotX = THUMB_PAD + i * (THUMB_W + THUMB_GAP);
        const offX = slotX + Math.round((THUMB_W - w) / 2);
        const offY = THUMB_PAD + Math.round((THUMB_H - h) / 2);
        const cx = w * EMU_PER_PX;
        const cy = h * EMU_PER_PX;

        anchors.push(
          "<xdr:oneCellAnchor>" +
            "<xdr:from>" +
              "<xdr:col>" + (IMAGE_COL - 1) + "</xdr:col>" +
              "<xdr:colOff>" + offX * EMU_PER_PX + "</xdr:colOff>" +
              "<xdr:row>" + (p.row - 1) + "</xdr:row>" +
              "<xdr:rowOff>" + offY * EMU_PER_PX + "</xdr:rowOff>" +
            "</xdr:from>" +
            '<xdr:ext cx="' + cx + '" cy="' + cy + '"/>' +
            "<xdr:pic>" +
              '<xdr:nvPicPr><xdr:cNvPr id="' + (id + 1) + '" name="' + esc(img.name || "reference") + '"/><xdr:cNvPicPr/></xdr:nvPicPr>' +
              '<xdr:blipFill><a:blip r:embed="rId' + id + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
              '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
              '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>' +
            "</xdr:pic>" +
            "<xdr:clientData/>" +
          "</xdr:oneCellAnchor>"
        );
      });
    });

    const xml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      anchors.join("") +
      "</xdr:wsDr>";

    let rels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    media.forEach(function (_, i) {
      rels +=
        '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image' + (i + 1) + '.jpeg"/>';
    });
    rels += "</Relationships>";

    return { xml: xml, rels: rels, media: media };
  }

  /* ---------------- Public API -------------------------------- */
  function buildShotListXlsx(data) {
    const sheet = buildSheetXml(data);
    const hasImages = sheet.placements.length > 0;
    const drawing = hasImages ? buildDrawing(sheet.placements) : null;

    const entries = [
      { name: "[Content_Types].xml", data: encodeUtf8(contentTypesXml(hasImages)) },
      { name: "_rels/.rels", data: encodeUtf8(ROOT_RELS) },
      { name: "xl/workbook.xml", data: encodeUtf8(WORKBOOK) },
      { name: "xl/_rels/workbook.xml.rels", data: encodeUtf8(WORKBOOK_RELS) },
      { name: "xl/styles.xml", data: encodeUtf8(STYLES) },
      { name: "xl/worksheets/sheet1.xml", data: encodeUtf8(sheet.xml) },
    ];

    if (hasImages) {
      entries.push(
        { name: "xl/worksheets/_rels/sheet1.xml.rels", data: encodeUtf8(SHEET1_RELS) },
        { name: "xl/drawings/drawing1.xml", data: encodeUtf8(drawing.xml) },
        { name: "xl/drawings/_rels/drawing1.xml.rels", data: encodeUtf8(drawing.rels) }
      );
      drawing.media.forEach(function (img, i) {
        entries.push({ name: "xl/media/image" + (i + 1) + ".jpeg", data: dataUrlToBytes(img.dataUrl) });
      });
    }

    return buildZip(entries);
  }

  global.buildShotListXlsx = buildShotListXlsx;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildShotListXlsx: buildShotListXlsx };
  }
})(typeof window !== "undefined" ? window : globalThis);
