/* ============================================================
   Shot List form — behavior
   Renders shot cards, visual pickers, autosaves drafts to
   localStorage, and on submit: downloads a .xlsx + opens a
   pre-addressed email draft to the photographer.
   ============================================================ */

(function () {
  "use strict";

  const cfg = SHOTLIST_CONFIG;
  const STORAGE_KEY = "shotlist-draft-v1";

  let shotSeq = 0; // unique id source for radio-group names

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------- boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    $("#site-title").textContent = cfg.siteTitle;
    $("#company-name").textContent = cfg.companyName;
    $("#photographer-email").value = cfg.photographerEmail || "";

    const restored = restoreDraft();
    if (!restored) addShot();

    $("#add-shot").addEventListener("click", function () {
      if ($$(".shot-card").length >= cfg.maxShots) {
        alert("Maximum of " + cfg.maxShots + " shots per request.");
        return;
      }
      const card = addShot();
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      saveDraft();
    });

    $("#clear-form").addEventListener("click", function () {
      if (!confirm("Clear the whole form? This removes every shot and all project details.")) return;
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    });

    $("#shotlist-form").addEventListener("submit", function (e) {
      e.preventDefault();
      onSubmit();
    });

    // Autosave on any change
    $("#shotlist-form").addEventListener("input", debounce(saveDraft, 400));

    $("#success-close").addEventListener("click", function () {
      $("#success-overlay").hidden = true;
    });

    updateShotCount();
  });

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

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

      const hint = document.createElement("span");
      hint.className = "tile__hint";
      hint.textContent = opt.hint || "";

      label.append(input, art, caption, hint);
      wrap.appendChild(label);
    });
    return wrap;
  }

  /* ---------------- shot cards ---------------- */
  function addShot(prefill) {
    const id = ++shotSeq;
    const tpl = $("#shot-template");
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.shotId = id;

    // Mount visual pickers with per-card group names
    $(".mount-shot-type", card).appendChild(tileGroup(cfg.shotTypes, "shot-" + id + "-type"));
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

    $(".shot-remove", card).addEventListener("click", function () {
      if ($$(".shot-card").length === 1) {
        alert("A request needs at least one shot.");
        return;
      }
      card.remove();
      renumberShots();
      saveDraft();
    });

    $(".shot-duplicate", card).addEventListener("click", function () {
      if ($$(".shot-card").length >= cfg.maxShots) {
        alert("Maximum of " + cfg.maxShots + " shots per request.");
        return;
      }
      const copy = addShot(readShot(card));
      copy.scrollIntoView({ behavior: "smooth", block: "start" });
      saveDraft();
    });

    $("#shots").appendChild(card);
    if (prefill) writeShot(card, prefill);
    renumberShots();
    return card;
  }

  function renumberShots() {
    $$(".shot-card").forEach(function (card, i) {
      $(".shot-number", card).textContent = "Shot " + (i + 1);
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
      variations: $(".f-variations", card).value.trim(),
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
    $(".f-variations", card).value = s.variations || "";
    $(".f-retouching", card).value = s.retouching || "";
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

  /* ---------------- draft persistence ---------------- */
  function collectData() {
    return {
      companyName: cfg.companyName,
      project: $("#project-name").value.trim(),
      shootDate: $("#shoot-date").value,
      requestedBy: $("#requested-by").value.trim(),
      requesterEmail: $("#requester-email").value.trim(),
      photographerEmail: $("#photographer-email").value.trim(),
      notes: $("#general-notes").value.trim(),
      shots: $$(".shot-card").map(readShot),
    };
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
    } catch (e) {
      /* storage full or blocked — drafts are best-effort */
    }
  }

  function restoreDraft() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return false;
    }
    if (!data || !Array.isArray(data.shots) || data.shots.length === 0) return false;
    $("#project-name").value = data.project || "";
    $("#shoot-date").value = data.shootDate || "";
    $("#requested-by").value = data.requestedBy || "";
    $("#requester-email").value = data.requesterEmail || "";
    if (data.photographerEmail) $("#photographer-email").value = data.photographerEmail;
    $("#general-notes").value = data.notes || "";
    data.shots.forEach(function (s) {
      addShot(s);
    });
    return true;
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
    if (!data.requestedBy) {
      problems.push({ el: $("#requested-by"), msg: "Your name is required so the photographer knows who asked." });
    }
    if (!data.photographerEmail) {
      problems.push({ el: $("#photographer-email"), msg: "Photographer email is required." });
    }

    $$(".shot-card").forEach(function (card, i) {
      const s = data.shots[i];
      if (!s.sku && !s.description) {
        problems.push({ el: $(".f-description", card), msg: "Shot " + (i + 1) + ": add a SKU or product description." });
      }
      if (!s.shotType) {
        problems.push({ el: $(".mount-shot-type", card), msg: "Shot " + (i + 1) + ": pick a shot type." });
      }
    });

    if (problems.length) {
      problems.forEach(function (p) {
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

    const mailto = buildMailto(data, fileName);
    $("#success-reopen-email").href = mailto;
    $("#success-file-name").textContent = fileName;
    $("#success-overlay").hidden = false;

    // Give the download a beat to start before opening the mail client
    setTimeout(function () {
      window.location.href = mailto;
    }, 600);
  }

  function buildMailto(data, fileName) {
    const mustHaves = data.shots.filter(function (s) {
      return s.priority === "Must-have";
    }).length;

    const lines = [
      "Hi,",
      "",
      "A new photography shot list is ready for you.",
      "",
      "Project: " + data.project,
      data.shootDate ? "Requested shoot date: " + data.shootDate : null,
      "Requested by: " + data.requestedBy + (data.requesterEmail ? " (" + data.requesterEmail + ")" : ""),
      "Shots requested: " + data.shots.length + (mustHaves ? " (" + mustHaves + " must-have)" : ""),
      "",
      "The full shot list spreadsheet (" + fileName + ") just downloaded on my computer — I’m attaching it to this email.",
      data.notes ? "" : null,
      data.notes ? "Notes: " + data.notes.slice(0, 400) : null,
      "",
      "Thanks!",
    ].filter(function (l) {
      return l !== null;
    });

    return (
      "mailto:" +
      encodeURIComponent(data.photographerEmail) +
      "?subject=" +
      encodeURIComponent("Photography Shot List — " + data.project + " (" + data.shots.length + " shots)") +
      "&body=" +
      encodeURIComponent(lines.join("\r\n"))
    );
  }
})();
