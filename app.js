/* ============================================================
   Shot List form — behavior
   Renders shot cards, visual pickers, reference image uploads,
   and on submit downloads a single .xlsx with every shot and
   its reference images embedded.
   The form always starts blank — nothing is persisted.
   ============================================================ */

(function () {
  "use strict";

  const cfg = SHOTLIST_CONFIG;
  const MAX_REF_IMAGES = 4;

  let shotSeq = 0; // unique id source for radio-group names

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    $("#site-title").textContent = cfg.siteTitle;
    $("#company-name").textContent = cfg.companyName;

    // Drafts from older versions of this form are no longer used
    try { localStorage.removeItem("shotlist-draft-v1"); } catch (e) { /* ignore */ }

    addShot();

    $("#add-shot").addEventListener("click", function () {
      if ($$(".shot-card").length >= cfg.maxShots) {
        alert("Maximum of " + cfg.maxShots + " shots per request.");
        return;
      }
      const card = addShot();
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#clear-form").addEventListener("click", function () {
      if (!confirm("Clear the whole form? This removes every shot and all project details.")) return;
      window.location.reload();
    });

    $("#shotlist-form").addEventListener("submit", function (e) {
      e.preventDefault();
      onSubmit();
    });

    $("#success-close").addEventListener("click", function () {
      $("#success-overlay").hidden = true;
    });

    updateShotCount();
  });

  /* ---------------- pickers ---------------- */
  function tileGroup(options, groupName, opts) {
    const multi = opts && opts.multi;
    const wrap = document.createElement("div");
    wrap.className = "tile-grid" + (opts && opts.small ? " tile-grid--small" : "");
    options.forEach(function (opt) {
      const label = document.createElement("label");
      label.className = "tile" + (opt.tone ? " tile--" + opt.tone : "");
      label.title = opt.hint || "";

      const input = document.createElement("input");
      input.type = multi ? "checkbox" : "radio";
      input.name = groupName;
      input.value = opt.value;
      input.className = "tile__input";

      const art = document.createElement("span");
      art.className = "tile__art";
      art.innerHTML = opt.svg;

      const caption = document.createElement("span");
      caption.className = "tile__label";
      caption.textContent = opt.value;

      label.append(input, art, caption);
      wrap.appendChild(label);
    });
    return wrap;
  }

  // Shot types render as labeled clusters ("Studio", "Lifestyle & In-Use"…)
  // that all share one radio group.
  function groupedTiles(groups, groupName) {
    const wrap = document.createElement("div");
    wrap.className = "tile-groups";
    groups.forEach(function (g) {
      const block = document.createElement("div");
      block.className = "tile-group";
      const label = document.createElement("p");
      label.className = "tile-group__label";
      label.textContent = g.label;
      block.appendChild(label);
      block.appendChild(tileGroup(g.options, groupName));
      wrap.appendChild(block);
    });
    return wrap;
  }

  /* ---------------- reference image uploads ---------------- */
  function initRefUpload(card) {
    const fileInput = $(".f-ref-files", card);
    $(".ref-add", card).addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      const files = Array.from(fileInput.files);
      fileInput.value = "";
      (function next(i) {
        if (i >= files.length) {
          renderRefThumbs(card);
          return;
        }
        if (card._refImages.length >= MAX_REF_IMAGES) {
          alert("Up to " + MAX_REF_IMAGES + " reference images per shot.");
          renderRefThumbs(card);
          return;
        }
        const file = files[i];
        if (!file.type || file.type.indexOf("image/") !== 0) {
          next(i + 1);
          return;
        }
        shrinkImage(file, function (img) {
          if (img) card._refImages.push(img);
          next(i + 1);
        });
      })(0);
    });
  }

  // Downscale to keep the resulting .xlsx a reasonable size.
  function shrinkImage(file, done) {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = function () {
      const MAX_EDGE = 1200;
      const scale = Math.min(1, MAX_EDGE / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.max(1, Math.round(im.naturalWidth * scale));
      const h = Math.max(1, Math.round(im.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // transparent PNGs get a white backing
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(im, 0, 0, w, h);
      URL.revokeObjectURL(url);
      done({ name: file.name, dataUrl: canvas.toDataURL("image/jpeg", 0.82), w: w, h: h });
    };
    im.onerror = function () {
      URL.revokeObjectURL(url);
      done(null);
    };
    im.src = url;
  }

  function renderRefThumbs(card) {
    const box = $(".ref-thumbs", card);
    box.innerHTML = "";
    card._refImages.forEach(function (img, i) {
      const thumb = document.createElement("span");
      thumb.className = "ref-thumb";
      thumb.title = img.name;

      const pic = document.createElement("img");
      pic.src = img.dataUrl;
      pic.alt = img.name;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "ref-thumb__del";
      del.textContent = "✕";
      del.title = "Remove " + img.name;
      del.addEventListener("click", function () {
        card._refImages.splice(i, 1);
        renderRefThumbs(card);
      });

      thumb.append(pic, del);
      box.appendChild(thumb);
    });
  }

  /* ---------------- shot cards ---------------- */
  function addShot(prefill) {
    const id = ++shotSeq;
    const tpl = $("#shot-template");
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.shotId = id;
    card._refImages = [];

    // Mount visual pickers with per-card group names
    $(".mount-shot-type", card).appendChild(groupedTiles(cfg.shotTypeGroups, "shot-" + id + "-type"));
    $(".mount-angle", card).appendChild(tileGroup(cfg.angles, "shot-" + id + "-angle"));
    $(".mount-orientation", card).appendChild(
      tileGroup(cfg.orientations, "shot-" + id + "-orientation", { small: true })
    );
    $(".mount-intended-use", card).appendChild(
      tileGroup(cfg.intendedUses, "shot-" + id + "-use", { multi: true, small: true })
    );
    $(".mount-priority", card).appendChild(
      tileGroup(cfg.priorities, "shot-" + id + "-priority", { small: true })
    );

    initRefUpload(card);

    $(".shot-remove", card).addEventListener("click", function () {
      if ($$(".shot-card").length === 1) {
        alert("A request needs at least one shot.");
        return;
      }
      card.remove();
      renumberShots();
    });

    $(".shot-duplicate", card).addEventListener("click", function () {
      if ($$(".shot-card").length >= cfg.maxShots) {
        alert("Maximum of " + cfg.maxShots + " shots per request.");
        return;
      }
      const copy = addShot(readShot(card));
      copy.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $(".shot-collapse", card).addEventListener("click", function () {
      collapseShot(card);
    });

    $(".shot-next", card).addEventListener("click", function () {
      if ($$(".shot-card").length >= cfg.maxShots) {
        alert("Maximum of " + cfg.maxShots + " shots per request.");
        return;
      }
      collapseShot(card);
      const next = addShot();
      next.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $(".shot-summary", card).addEventListener("click", function () {
      expandShot(card);
    });

    $("#shots").appendChild(card);
    if (prefill) writeShot(card, prefill);
    renumberShots();
    return card;
  }

  /* ---------------- collapse / expand ---------------- */
  function collapseShot(card) {
    const s = readShot(card);
    const idx = $$(".shot-card").indexOf(card) + 1;

    $(".shot-summary__num", card).textContent = "Shot " + idx;
    $(".shot-summary__title", card).textContent =
      s.description || s.sku || "(no product yet)";

    const meta = [
      s.shotType,
      s.angle,
      s.orientation,
      (s.intendedUse || []).join(", "),
      s.priority,
      s.refImages.length ? "📎 " + s.refImages.length + " ref" + (s.refImages.length > 1 ? "s" : "") : "",
    ].filter(Boolean);
    $(".shot-summary__meta", card).innerHTML = meta
      .map(function (m) {
        return "<span>" + escapeHtml(m) + "</span>";
      })
      .join('<span class="dot">·</span>');

    card.classList.add("shot-card--collapsed");
    $(".shot-summary", card).hidden = false;
  }

  function expandShot(card) {
    card.classList.remove("shot-card--collapsed");
    $(".shot-summary", card).hidden = true;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function renumberShots() {
    $$(".shot-card").forEach(function (card, i) {
      $(".shot-number", card).textContent = "Shot " + (i + 1);
      $(".shot-summary__num", card).textContent = "Shot " + (i + 1);
    });
    updateShotCount();
  }

  function updateShotCount() {
    const n = $$(".shot-card").length;
    $("#shot-count").textContent = n + (n === 1 ? " shot" : " shots");
  }

  function readShot(card) {
    const picked = function (suffix) {
      const el = $('input[name$="-' + suffix + '"]:checked', card);
      return el ? el.value : "";
    };
    const pickedAll = function (suffix) {
      return $$('input[name$="-' + suffix + '"]:checked', card).map(function (el) {
        return el.value;
      });
    };
    return {
      sku: $(".f-sku", card).value.trim(),
      description: $(".f-description", card).value.trim(),
      shotType: picked("type"),
      angle: picked("angle"),
      props: $(".f-props", card).value.trim(),
      features: $(".f-features", card).value.trim(),
      referenceLink: $(".f-reference", card).value.trim(),
      refImages: card._refImages.slice(),
      orientation: picked("orientation"),
      intendedUse: pickedAll("use"),
      priority: picked("priority"),
      retouching: $(".f-retouching", card).value.trim(),
    };
  }

  function writeShot(card, s) {
    $(".f-sku", card).value = s.sku || "";
    $(".f-description", card).value = s.description || "";
    $(".f-props", card).value = s.props || "";
    $(".f-features", card).value = s.features || "";
    $(".f-reference", card).value = s.referenceLink || "";
    $(".f-retouching", card).value = s.retouching || "";
    card._refImages = (s.refImages || []).slice();
    renderRefThumbs(card);
    const check = function (suffix, value) {
      if (!value) return;
      const el = $('input[name$="-' + suffix + '"][value="' + CSS.escape(value) + '"]', card);
      if (el) el.checked = true;
    };
    check("type", s.shotType);
    check("angle", s.angle);
    check("orientation", s.orientation);
    check("priority", s.priority);
    (s.intendedUse || []).forEach(function (v) {
      check("use", v);
    });
  }

  /* ---------------- data ---------------- */
  function collectData() {
    return {
      companyName: cfg.companyName,
      project: $("#project-name").value.trim(),
      requesterEmail: $("#requester-email").value.trim(),
      notes: $("#general-notes").value.trim(),
      shots: $$(".shot-card").map(readShot),
    };
  }

  /* ---------------- validation ---------------- */
  function validate(data) {
    const problems = [];
    $$(".invalid").forEach(function (el) {
      el.classList.remove("invalid");
    });

    if (!data.project) {
      problems.push({ el: $("#project-name"), msg: "Project name is required." });
    }
    if (!data.requesterEmail) {
      problems.push({ el: $("#requester-email"), msg: "Your email is required so the photographer knows who to reply to." });
    }

    $$(".shot-card").forEach(function (card, i) {
      const s = data.shots[i];
      if (!s.sku && !s.description) {
        problems.push({ el: $(".f-description", card), card: card, msg: "Shot " + (i + 1) + ": add a SKU or product description." });
      }
      if (!s.shotType) {
        problems.push({ el: $(".mount-shot-type", card), card: card, msg: "Shot " + (i + 1) + ": pick a shot type." });
      }
    });

    if (problems.length) {
      problems.forEach(function (p) {
        if (p.card) expandShot(p.card); // surface problems hidden in collapsed shots
        p.el.classList.add("invalid");
      });
      const box = $("#error-box");
      box.hidden = false;
      box.innerHTML =
        "<strong>Almost there — please fix:</strong><ul>" +
        problems.map(function (p) {
          return "<li>" + p.msg + "</li>";
        }).join("") +
        "</ul>";
      problems[0].el.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    $("#error-box").hidden = true;
    return true;
  }

  /* ---------------- submit ---------------- */
  function slug(s) {
    return (s || "shotlist").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "shotlist";
  }

  function onSubmit() {
    const data = collectData();
    if (!validate(data)) return;

    const now = new Date();
    data.submittedOn = now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const bytes = buildShotListXlsx(data);
    const fileName =
      "Shot_List_" + slug(data.project) + "_" + now.toISOString().slice(0, 10) + ".xlsx";

    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 30000);

    $("#success-file-name").textContent = fileName;
    $("#success-overlay").hidden = false;
  }
})();
