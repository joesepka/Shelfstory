import { BASE } from "./basePath";
// Per-company deck branding. Add a company here + drop its logo in public/brand/<key>/
// and every deck slide picks it up — no renderer changes.
//
// FONTS — read this before changing `display`:
//   Anything in `display` must survive a PowerPoint export on a machine that may not have
//   the font. The stack always ends in "Arial Black", which ships with Office on Windows
//   AND Mac, so the worst case is a heavy grotesque rather than a substituted body font.
//   To use a company's real font, put the .ttf/.otf first in the stack, install it on the
//   machines that will present, and turn on font embedding when saving the .pptx.
//   See docs in public/brand/README.md.

export const BRANDS = {
  /* THE DEMO CLIENT'S PAIR (Joe, 2026-08-20). Same stroke language across both so the label
     switch reads as one house: Northwind is three flat gusts, Drift is two softer wisps. */
  northwind: {
    name: "Northwind Brewing Co.",
    short: "Northwind",
    logo: `${BASE}/brand/northwind/logo.png`,
    logoWhite: `${BASE}/brand/northwind/logo-white.png`,
    ink: "#0A0A0A",
    accent: "#3E6C7E",
    accentDeep: "#2C5566",
    accentPale: "#EEF4F7",
    display: '"Poppins", "Gilroy", "Arial Black", "Helvetica Neue", Arial, sans-serif',
    displayTracking: "-0.5px",
    headerStyle: "rule",
  },

  drift: {
    name: "Drift",
    short: "Drift",
    logo: `${BASE}/brand/drift/logo.png`,
    logoWhite: `${BASE}/brand/drift/logo-white.png`,
    ink: "#0A0A0A",
    accent: "#7FB0C4",
    accentDeep: "#3E6C7E",
    accentPale: "#F1F7FA",
    display: '"Poppins", "Gilroy", "Arial Black", "Helvetica Neue", Arial, sans-serif',
    displayTracking: "-0.4px",
    headerStyle: "rule",
  },

  blindcorner: {
    name: "Blind Corner Brewery",
    short: "Blind Corner",
    logo: `${BASE}/brand/blindcorner/logo.png`,
    logoWhite: `${BASE}/brand/blindcorner/logo-white.png`,
    // sampled straight out of logo.png — #EDB3B0 is the lettermark circle
    ink: "#0A0A0A",
    accent: "#EDB3B0",
    accentDeep: "#D98F8A",
    accentPale: "#FCF1F0",
    // heavy, tight, all-caps display — mimics their blackout wordmark
    display: '"Blind Corner Display", "Poppins", "Gilroy", "Arial Black", "Helvetica Neue", Arial, sans-serif',
    displayTracking: "-0.5px",
    headerStyle: "rule",   // "rule" | "band" | "dark"
  },

  torch: {
    name: "Torch",
    short: "Torch",
    logo: `${BASE}/brand/torch/logo.png`,
    logoWhite: null,
    // sampled straight out of logo.png — coral wordmark, gold flame
    ink: "#0A0A0A",
    accent: "#F29D97",       // light coral, the bar fill
    accentDeep: "#E05050",   // the wordmark coral
    accentPale: "#FDEEEA",
    gold: "#E0C060",         // the flame — sparing use: markers, small accents
    display: '"Poppins", "Gilroy", "Arial Black", "Helvetica Neue", Arial, sans-serif',
    displayTracking: "-0.5px",
    headerStyle: "rule",
  },

  // demo / fallback when a company has no brand entry yet
  _default: {
    name: "ShelfStory",
    short: "ShelfStory",
    logo: null,
    ink: "#1b201a",
    accent: "#cfe0d4",
    accentDeep: "#2f6b46",
    accentPale: "#eef4ee",
    display: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
    displayTracking: "-0.5px",
    headerStyle: "rule",
  },
};

// chart colors are the APP's, shared across every company so the deck always
// reconciles with what's on screen (green = cases, blue = accounts, indigo = ROS line)
export const DECK_CHART = {
  casesLo: "#C8E0CD", casesHi: "#1F7846",
  acctsLo: "#DDE3F2", acctsHi: "#3B4A86",
  rosLine: "#4A5AC4",
  forecast: "#5B6BD0",
  up: "#2E7D52", down: "#C0564E",
  rule: "#E3E3E3", ruleLt: "#EFEFEF", grey: "#6E6E6E", grey2: "#9A9A9A",
};

export const brandOf = key => BRANDS[key] || BRANDS._default;
