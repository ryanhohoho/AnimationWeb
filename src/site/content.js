// content.js — WHAT THE SHEET SAYS
//
// One file, because the words are the thing most likely to change and they
// should never be hunted for across four page modules. Everything here is prose
// the owner would actually say out loud.
//
// THE RULE ON TONE, and it is a real constraint rather than a preference:
// ONE SENTENCE PER ROLE, ONE SENTENCE PER PROJECT, and a number in it wherever
// there is a number to give. Someone reading this is deciding in about forty
// seconds whether to keep reading, and adjectives cost them time while numbers
// buy them certainty. "Improved workflow efficiency" is a sentence anyone can
// write about anything. "10,000-drive rollout" is not.
//
// Lowercase where it is casual, sentence case where it is a claim. No buzzwords,
// no "passionate", no stacked adjectives. If a line needs a second sentence it
// belongs on the project's own sheet, not here.

export const PROFILE = {
  name: "RYAN HO",
  greeting: "hey, i'm",
  // Two sentences of substance, one of personality. The last one is true and is
  // also the only explanation this site ever offers of the animal on it.
  bio: [
    "Systems developer. I reverse-engineer undocumented file formats and automate the hardware nobody wants to do by hand — right now for the <em>RCMP</em>.",
    "I study Computer Science and Biology at <em>UBC</em>. The Mew wandering around this page is procedurally animated — no keyframes anywhere, just springs and a small brain."
  ],
  hint: "press → to continue"
};

// ── the work history ────────────────────────────────────────────────────────
// Reverse chronological, hardcoded in that order. Nothing sorts this: the order
// IS the judgement, and the two RCMP rows are deliberately separate because they
// are two different jobs and the promotion is part of what they say.
export const EXPERIENCE = [
  {
    org: "Royal Canadian Mounted Police",
    role: "Junior Software Developer",
    loc: "Burnaby, BC",
    when: "Oct 2025 — Present",
    what: "Reverse-engineered xTool's undocumented .xcs laser format and wrote a generator that lays serials onto physical jig coordinates, replacing a camera alignment that failed on a 75-pocket fixture for a 10,000-drive rollout."
  },
  {
    org: "Royal Canadian Mounted Police",
    role: "Information Technology Technician",
    loc: "Burnaby, BC",
    when: "Oct 2024 — Oct 2025",
    what: "Built a 2,900-line PowerShell tool that formats and BitLocker-encrypts hot-plugged drives unattended; it replaced a manual per-drive process and has provisioned several thousand."
  },
  {
    org: "Free Geek Vancouver",
    role: "Computer Technician",
    loc: "Vancouver, BC",
    when: "Nov 2021 — Nov 2022",
    what: "Built a PXE-boot jig that runs supervised KillDisk on ten machines at once, and stripped, tested and imaged 200+ donated machines for reuse."
  }
];

// ── how to reach him ────────────────────────────────────────────────────────
// PLACEHOLDER, AND SAID SO. The email is real, off the resume. The two handles
// are not known to this repository and are marked `placeholder: true` so they
// render as visibly unset rather than as a plausible guess — a portfolio that
// links a wrong GitHub is worse than one that links none. Fill in `url` and
// `shown` and delete the flag.
export const SOCIALS = [
  { label: "Email",    shown: "ryanho499@gmail.com",  url: "mailto:ryanho499@gmail.com" },
  { label: "GitHub",   shown: "github.com/…",         url: "https://github.com/",       placeholder: true },
  { label: "LinkedIn", shown: "linkedin.com/in/…",    url: "https://linkedin.com/in/",  placeholder: true }
];

// ── the card media ──────────────────────────────────────────────────────────
// PLACEHOLDERS, from the reference folder, transcoded to card size — a 6-second
// 640px clip at about 0.5 MB rather than the source's 5 MB, because a preview is
// a glance and not a film. Drop a real `card-<slug>.mp4` / `.webp` in
// src/assets/media/ and it is picked up on the next build with nothing else to
// change; the names are the whole interface.
const CARD = import.meta.glob("../assets/media/card-*.{webp,png,jpg,mp4,webm}",
  { eager: true, query: "?url", import: "default" });

const pick = (slug, exts) => {
  for (const e of exts) {
    for (const [k, v] of Object.entries(CARD)) {
      if (k.endsWith(`/card-${slug}.${e}`)) return v;
    }
  }
  return null;
};
export const cardStill = (slug) => pick(slug, ["webp", "png", "jpg"]);
export const cardVideo = (slug) => pick(slug, ["mp4", "webm"]);
