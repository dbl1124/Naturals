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
        ? '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
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

  function workbookXml(hasImages) {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      "<sheets>" +
      '<sheet name="Shot List" sheetId="1" r:id="rId1"/>' +
      (hasImages ? '<sheet name="Reference Images" sheetId="2" r:id="rId3"/>' : "") +
      "</sheets>" +
      "</workbook>"
    );
  }

  function workbookRelsXml(hasImages) {
    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      (hasImages
        ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
        : "") +
      "</Relationships>"
    );
  }

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
  ];

  const COL_WIDTHS = [8, 16, 30, 22, 22, 32, 30, 28, 14, 24, 15, 32];

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
    if (data.photographerEmail) info.push("Photographer: " + data.photographerEmail);
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

    // Rows 6+ — one row per shot
    const centeredCols = new Set([1, 9, 11]); // Shot #, Orientation, Priority
    let rowIdx = 6;
    (data.shots || []).forEach(function (shot, i) {
      const imgCount = (shot.refImages || []).length;
      const refText =
        (shot.referenceLink || "") +
        (imgCount
          ? (shot.referenceLink ? "  —  " : "") +
            imgCount + " image" + (imgCount > 1 ? "s" : "") + " attached (see “Reference Images” tab)"
          : "");
      const values = [
        i + 1,
        shot.sku,
        shot.description,
        shot.shotType,
        shot.angle,
        shot.props,
        shot.features,
        refText,
        shot.orientation,
        Array.isArray(shot.intendedUse) ? shot.intendedUse.join(", ") : shot.intendedUse,
        shot.priority,
        shot.retouching,
      ];
      let row = '<row r="' + rowIdx + '">';
      values.forEach(function (v, c) {
        const ref = colLetter(c + 1) + rowIdx;
        const style = centeredCols.has(c + 1) ? 7 : 6;
        if (c === 0 && v !== "" && v != null && isFinite(Number(v))) {
          row += numCell(ref, style, Number(v));
        } else {
          row += strCell(ref, style, v);
        }
      });
      row += "</row>";
      rows.push(row);
      rowIdx++;
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

    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      cols +
      "<sheetData>" +
      rows.join("") +
      "</sheetData>" +
      mergeXml +
      "</worksheet>"
    );
  }

  /* ---------------- Reference Images sheet -------------------- */
  const EMU_PER_PX = 9525;
  const ROW_PX = 20; // default row height at 15pt
  const IMG_MAX_W = 380; // display width in the sheet, px

  // Lays out every uploaded reference image on its own worksheet:
  // a bold label row per image, the picture anchored just below it.
  function buildImagesParts(images) {
    const sheetRows = [];
    const anchors = [];

    sheetRows.push('<row r="1" ht="32" customHeight="1">' + strCell("A1", 1, "REFERENCE IMAGES") + "</row>");
    let rowIdx = 3;

    images.forEach(function (img, i) {
      const label = "Shot " + img.shotNo + (img.name ? " — " + img.name : "");
      sheetRows.push('<row r="' + rowIdx + '">' + strCell("B" + rowIdx, 8, label) + "</row>");

      const scale = Math.min(1, IMG_MAX_W / (img.w || IMG_MAX_W));
      const dispW = Math.max(1, Math.round((img.w || IMG_MAX_W) * scale));
      const dispH = Math.max(1, Math.round((img.h || IMG_MAX_W) * scale));

      anchors.push(
        "<xdr:oneCellAnchor>" +
          "<xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>" + rowIdx + "</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>" +
          '<xdr:ext cx="' + dispW * EMU_PER_PX + '" cy="' + dispH * EMU_PER_PX + '"/>' +
          "<xdr:pic>" +
          '<xdr:nvPicPr><xdr:cNvPr id="' + (i + 2) + '" name="' + esc(label) + '"/><xdr:cNvPicPr/></xdr:nvPicPr>' +
          '<xdr:blipFill><a:blip r:embed="rId' + (i + 1) + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
          '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + dispW * EMU_PER_PX + '" cy="' + dispH * EMU_PER_PX + '"/></a:xfrm>' +
          '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>' +
          "</xdr:pic>" +
          "<xdr:clientData/>" +
          "</xdr:oneCellAnchor>"
      );

      rowIdx += Math.ceil(dispH / ROW_PX) + 3; // room for the picture + a gap
    });

    const sheetXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      '<cols><col min="1" max="1" width="3" customWidth="1"/><col min="2" max="2" width="60" customWidth="1"/></cols>' +
      "<sheetData>" + sheetRows.join("") + "</sheetData>" +
      '<mergeCells count="1"><mergeCell ref="A1:F1"/></mergeCells>' +
      '<drawing r:id="rId1"/>' +
      "</worksheet>";

    const drawingXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      anchors.join("") +
      "</xdr:wsDr>";

    let drawingRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    images.forEach(function (_, i) {
      drawingRels +=
        '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image' + (i + 1) + '.jpeg"/>';
    });
    drawingRels += "</Relationships>";

    const sheetRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>' +
      "</Relationships>";

    return { sheetXml: sheetXml, drawingXml: drawingXml, drawingRels: drawingRels, sheetRels: sheetRels };
  }

  /* ---------------- Public API -------------------------------- */
  function buildShotListXlsx(data) {
    // Gather uploaded reference images across all shots
    const images = [];
    (data.shots || []).forEach(function (shot, i) {
      (shot.refImages || []).forEach(function (img) {
        images.push({ shotNo: i + 1, name: img.name, dataUrl: img.dataUrl, w: img.w, h: img.h });
      });
    });
    const hasImages = images.length > 0;

    const entries = [
      { name: "[Content_Types].xml", data: encodeUtf8(contentTypesXml(hasImages)) },
      { name: "_rels/.rels", data: encodeUtf8(ROOT_RELS) },
      { name: "xl/workbook.xml", data: encodeUtf8(workbookXml(hasImages)) },
      { name: "xl/_rels/workbook.xml.rels", data: encodeUtf8(workbookRelsXml(hasImages)) },
      { name: "xl/styles.xml", data: encodeUtf8(STYLES) },
      { name: "xl/worksheets/sheet1.xml", data: encodeUtf8(buildSheetXml(data)) },
    ];

    if (hasImages) {
      const parts = buildImagesParts(images);
      entries.push(
        { name: "xl/worksheets/sheet2.xml", data: encodeUtf8(parts.sheetXml) },
        { name: "xl/worksheets/_rels/sheet2.xml.rels", data: encodeUtf8(parts.sheetRels) },
        { name: "xl/drawings/drawing1.xml", data: encodeUtf8(parts.drawingXml) },
        { name: "xl/drawings/_rels/drawing1.xml.rels", data: encodeUtf8(parts.drawingRels) }
      );
      images.forEach(function (img, i) {
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
