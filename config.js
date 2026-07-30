/* ============================================================
   Shot List — site configuration
   Edit this file to change the photographer email, company
   name, or any of the selectable options below. No other file
   needs to change.
   ============================================================ */

const SHOTLIST_CONFIG = {
  companyName: "ATG",
  siteTitle: "Photography Shot List",

  // Maximum shots per request (soft guard against runaway forms)
  maxShots: 50,

  /* ----------------------------------------------------------
     Shot Type options, grouped. Each group renders as a labeled
     cluster of tiles inside the Shot Type section.
     ---------------------------------------------------------- */
  shotTypeGroups: [
    {
      label: "Studio",
      options: [
        {
          value: "Product On-White",
          hint: "Clean product on a plain white background",
          svg: '<svg viewBox="0 0 64 48"><rect x="23" y="9" width="18" height="27" rx="2"/><line x1="14" y1="41" x2="50" y2="41"/></svg>',
        },
        {
          value: "On-White in Case",
          hint: "Product shown inside its case or tray, on white",
          svg: '<svg viewBox="0 0 64 48"><rect x="13" y="7" width="38" height="34" rx="3"/><rect x="25" y="15" width="14" height="19" rx="1.5"/></svg>',
        },
        {
          value: "Detail / Macro",
          hint: "Extreme close-up of a specific feature or texture",
          svg: '<svg viewBox="0 0 64 48"><circle cx="27" cy="19" r="11"/><line x1="35" y1="27" x2="48" y2="40"/><circle cx="27" cy="19" r="3.5" class="fill"/></svg>',
        },
        {
          value: "360 Spin",
          hint: "Full rotation set for interactive spin viewers",
          svg: '<svg viewBox="0 0 64 48"><rect x="26" y="12" width="12" height="16" rx="2"/><path d="M14 34c0 5 8 8 18 8s18-3 18-8"/><path d="M50 34c0-5-8-8-18-8s-18 3-18 8"/><path d="M46 30l4 4-6 2"/></svg>',
        },
        {
          value: "Packaging",
          hint: "Boxed / packaged product, flaps or label visible",
          svg: '<svg viewBox="0 0 64 48"><rect x="18" y="18" width="28" height="22" rx="1.5"/><path d="M18 18l-8-7M46 18l8-7M18 18h28"/><line x1="32" y1="18" x2="32" y2="40"/></svg>',
        },
      ],
    },
    {
      label: "Lifestyle & In-Use",
      options: [
        {
          value: "In-Use / Environmental",
          hint: "Product being used in a real setting",
          svg: '<svg viewBox="0 0 64 48"><rect x="27" y="8" width="12" height="18" rx="2"/><path d="M20 34c0-5 4-8 8-8h8c4 0 8 3 8 8v7H20z"/></svg>',
        },
        {
          value: "Lifestyle",
          hint: "Scene-driven image with people / environment",
          svg: '<svg viewBox="0 0 64 48"><rect x="9" y="7" width="46" height="34" rx="3"/><circle cx="22" cy="17" r="4"/><path d="M9 37l13-11 9 7 10-9 14 13"/></svg>',
        },
      ],
    },
    {
      label: "Group & Scale",
      options: [
        {
          value: "Group / Family",
          hint: "Multiple products or full line shown together",
          svg: '<svg viewBox="0 0 64 48"><rect x="10" y="18" width="12" height="22" rx="1.5"/><rect x="26" y="10" width="12" height="30" rx="1.5"/><rect x="42" y="22" width="12" height="18" rx="1.5"/></svg>',
        },
        {
          value: "Scale / Comparison",
          hint: "Product next to a reference object for size",
          svg: '<svg viewBox="0 0 64 48"><rect x="14" y="14" width="16" height="26" rx="1.5"/><line x1="44" y1="8" x2="44" y2="40"/><line x1="40" y1="12" x2="48" y2="12"/><line x1="41" y1="19" x2="47" y2="19"/><line x1="40" y1="26" x2="48" y2="26"/><line x1="41" y1="33" x2="47" y2="33"/></svg>',
        },
      ],
    },
    {
      label: "Retail",
      options: [
        {
          value: "POG / MOD",
          hint: "Planogram / merchandising view — product on shelf",
          svg: '<svg viewBox="0 0 64 48"><line x1="10" y1="22" x2="54" y2="22"/><line x1="10" y1="40" x2="54" y2="40"/><rect x="14" y="10" width="9" height="12"/><rect x="27" y="10" width="9" height="12"/><rect x="18" y="28" width="9" height="12"/><rect x="34" y="28" width="12" height="12"/></svg>',
        },
        {
          value: "Other",
          hint: "Something else — describe it in the notes",
          svg: '<svg viewBox="0 0 64 48"><rect x="12" y="9" width="40" height="30" rx="3" stroke-dasharray="5 4"/><circle cx="24" cy="24" r="1.6" class="fill"/><circle cx="32" cy="24" r="1.6" class="fill"/><circle cx="40" cy="24" r="1.6" class="fill"/></svg>',
        },
      ],
    },
  ],

  /* ----------------------------------------------------------
     Angle / View options
     ---------------------------------------------------------- */
  angles: [
    {
      value: "Front, straight-on",
      hint: "Camera level, facing the front of the product",
      svg: '<svg viewBox="0 0 64 48"><rect x="22" y="10" width="20" height="28" rx="2"/><line x1="27" y1="18" x2="37" y2="18"/><line x1="27" y1="24" x2="37" y2="24"/></svg>',
    },
    {
      value: "3/4 hero angle",
      hint: "Classic angled view — front and one side visible",
      svg: '<svg viewBox="0 0 64 48"><path d="M22 16l12-6 10 5v18l-12 6-10-5z"/><path d="M22 16l10 5 12-6M32 21v18"/></svg>',
    },
    {
      value: "Top-down (overhead)",
      hint: "Shot from directly above, looking down",
      svg: '<svg viewBox="0 0 64 48"><rect x="20" y="20" width="24" height="20" rx="2"/><line x1="32" y1="4" x2="32" y2="15"/><path d="M28 11l4 4 4-4"/></svg>',
    },
    {
      value: "Side profile",
      hint: "Camera level with the side of the product",
      svg: '<svg viewBox="0 0 64 48"><rect x="34" y="10" width="12" height="28" rx="2"/><line x1="8" y1="24" x2="26" y2="24"/><path d="M20 20l6 4-6 4"/></svg>',
    },
    {
      value: "Rear view",
      hint: "Back of the product facing the camera",
      svg: '<svg viewBox="0 0 64 48"><rect x="22" y="14" width="20" height="24" rx="2"/><path d="M22 9a14 8 0 0 1 20 0"/><path d="M42 9l1-5M42 9l-5 1"/></svg>',
    },
    {
      value: "Low angle",
      hint: "Camera below the product, looking up",
      svg: '<svg viewBox="0 0 64 48"><path d="M18 12h28l-6 22H24z"/><line x1="32" y1="44" x2="32" y2="37"/><path d="M28 41l4-4 4 4"/></svg>',
    },
    {
      value: "High angle",
      hint: "Camera above the product, angled down",
      svg: '<svg viewBox="0 0 64 48"><path d="M24 14h16l6 22H18z"/><line x1="32" y1="4" x2="32" y2="11"/><path d="M28 7l4 4 4-4"/></svg>',
    },
    {
      value: "Close-up, slight angle",
      hint: "Tight crop with a small tilt for depth",
      svg: '<svg viewBox="0 0 64 48"><rect x="8" y="6" width="48" height="36" rx="3"/><path d="M26 42V20l22-8v30"/></svg>',
    },
    {
      value: "Over-shoulder / 45°",
      hint: "From behind a shoulder at roughly 45 degrees",
      svg: '<svg viewBox="0 0 64 48"><circle cx="17" cy="30" r="6"/><path d="M7 46c1-6 5-9 10-9s9 3 10 9"/><rect x="36" y="10" width="16" height="20" rx="2"/></svg>',
    },
    {
      value: "Detail-specific",
      hint: "Focus on one named feature — say which in notes",
      svg: '<svg viewBox="0 0 64 48"><rect x="12" y="12" width="24" height="28" rx="2"/><circle cx="40" cy="18" r="9"/><line x1="46" y1="25" x2="54" y2="33"/></svg>',
    },
    {
      value: "Other",
      hint: "Something else — describe it in the notes",
      svg: '<svg viewBox="0 0 64 48"><rect x="12" y="9" width="40" height="30" rx="3" stroke-dasharray="5 4"/><circle cx="24" cy="24" r="1.6" class="fill"/><circle cx="32" cy="24" r="1.6" class="fill"/><circle cx="40" cy="24" r="1.6" class="fill"/></svg>',
    },
  ],

  /* ----------------------------------------------------------
     Orientation options
     ---------------------------------------------------------- */
  orientations: [
    {
      value: "Horizontal",
      hint: "Landscape — wider than tall",
      svg: '<svg viewBox="0 0 64 48"><rect x="10" y="14" width="44" height="20" rx="2"/></svg>',
    },
    {
      value: "Vertical",
      hint: "Portrait — taller than wide",
      svg: '<svg viewBox="0 0 64 48"><rect x="22" y="6" width="20" height="36" rx="2"/></svg>',
    },
    {
      value: "Square",
      hint: "1:1 — equal width and height",
      svg: '<svg viewBox="0 0 64 48"><rect x="16" y="8" width="32" height="32" rx="2"/></svg>',
    },
  ],

  /* ----------------------------------------------------------
     Intended Use options (multi-select)
     ---------------------------------------------------------- */
  intendedUses: [
    {
      value: "Print",
      hint: "Catalogs, packaging, printed collateral",
      svg: '<svg viewBox="0 0 64 48"><rect x="14" y="18" width="36" height="16" rx="2"/><path d="M20 18V8h24v10"/><rect x="22" y="30" width="20" height="12"/></svg>',
    },
    {
      value: "Website",
      hint: "Brand site pages and banners",
      svg: '<svg viewBox="0 0 64 48"><rect x="9" y="8" width="46" height="32" rx="3"/><line x1="9" y1="16" x2="55" y2="16"/><circle cx="15" cy="12" r="1.4" class="fill"/><circle cx="20" cy="12" r="1.4" class="fill"/></svg>',
    },
    {
      value: "Social Media",
      hint: "Instagram, Facebook, TikTok posts",
      svg: '<svg viewBox="0 0 64 48"><path d="M14 8h36a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H26l-10 8v-8h-2a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z"/><path d="M26 20c0-3 2.4-5 5-5 1.6 0 2.6 1 3 2 .4-1 1.4-2 3-2 2.6 0 5 2 5 5 0 4-8 8-8 8s-8-4-8-8z"/></svg>',
    },
    {
      value: "Ecommerce",
      hint: "Amazon, retailer listings, product pages",
      svg: '<svg viewBox="0 0 64 48"><path d="M10 8h7l6 24h24l5-17H21"/><circle cx="27" cy="40" r="3.5"/><circle cx="47" cy="40" r="3.5"/></svg>',
    },
  ],

  /* ----------------------------------------------------------
     Priority options
     ---------------------------------------------------------- */
  priorities: [
    {
      value: "Must-have",
      hint: "Required — the shoot fails without it",
      tone: "high",
      svg: '<svg viewBox="0 0 64 48"><line x1="20" y1="6" x2="20" y2="42"/><path d="M20 9h24l-6 8 6 8H20"/></svg>',
    },
    {
      value: "Nice-to-have",
      hint: "Wanted, but the shoot succeeds without it",
      tone: "mid",
      svg: '<svg viewBox="0 0 64 48"><path d="M32 40s-16-9-16-19c0-6 4.5-9 8.5-9 3.5 0 6 2 7.5 4.5C33.5 14 36 12 39.5 12c4 0 8.5 3 8.5 9 0 10-16 19-16 19z"/></svg>',
    },
    {
      value: "If time allows",
      hint: "Bonus shot for leftover studio time",
      tone: "low",
      svg: '<svg viewBox="0 0 64 48"><circle cx="32" cy="24" r="16"/><path d="M32 14v10l7 5"/></svg>',
    },
  ],
};

// Allow Node-based tests to import this config
if (typeof module !== "undefined" && module.exports) {
  module.exports = SHOTLIST_CONFIG;
}
