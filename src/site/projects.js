// projects.js — the work, and the colour system that identifies it.
//
// ORDER
// -----
// The gate shows them in this order and the order is a judgement: the shipped,
// commissioned tool that is in daily use goes first, the ongoing engine second,
// the case study last. Nothing here is sorted by date.
//
// THE IDENTITY RULE
// -----------------
// Cerulean is the constant. It is the site's ink, it is the air in every
// plate this press ever pulls, and no project may have it. What a project owns
// is the SECOND ink -- one variable in a fixed process, which is a system rather
// than a palette. It is also the only way three differently-coloured frames can
// live on a sheet whose whole discipline is "one or two inks": you never see
// more than one of them at a time, because the gate shows one frame at a time.
//
// A project's plate is a whole night in miniature -- the same 19:00-to-01:00 run
// as the sheet, compressed into one frame, pulled in that project's pair. Every
// piece of work gets its own night.

export const PROJECTS = [
  {
    slug: "usb-provisioning",
    n: "01",
    title: "glyph auto detection engine",
    sub: "batch engraving + encryption tooling · rcmp",
    kind: "SYSTEMS TOOLING · COMMISSIONED",
    year: "2025",
    // ONE SENTENCE, WITH THE NUMBER IN IT.
    // This used to be a gate caption -- read while standing in front of one
    // project, with nothing competing for the attention. It is a CARD in a list
    // now, and someone is deciding in a few seconds which of three to open, so
    // the job changed: not "what is this worth" but "what is this, and why is it
    // hard". The argument still lives on the sheet it opens.
    line: "Reverse-engineered a laser cutter's undocumented project format so 10,000 drives could be engraved and encrypted without anyone typing a serial by hand.",
    skills: "POWERSHELL · BITLOCKER / XTS-AES · WINDOWS STORAGE APIS · PYTHON · HUNGARIAN ASSIGNMENT · OPERATOR SOP",
    inkA: "#16305C",   // deep navy: the sky of this sheet
    ink: "#23262B",    // near-black
    inkName: "NAVY&nbsp;+&nbsp;BLACK",
    inkWhy: "the colour of the hardware it writes to"
  },
  {
    // "let me be a flower" (../VisualAudialExperience), shown by instruction as
    // a page named for what it is rather than for the film: no title of its own
    // on the site, every scene named instead (pages/motion-graphics.js). It took
    // closet's slot, which was scrapped on 2026-09-25.
    slug: "motion-graphics",
    n: "02",
    title: "experimental motion graphics",
    sub: "a vertical visual-audio piece · rendered live in the browser",
    kind: "MOTION GRAPHICS · WEBGL + WEB AUDIO",
    year: "2026",
    // PLACEHOLDER PROSE, like the other two: the owner rewrites it in the editor
    line: "A vertical piece for phones, every frame drawn live by its own shader and scored by code — shown here as each of its scenes, and the whole of it.",
    skills: "WEBGL2 · GLSL · RAYMARCHING · POST-EFFECT CHAINS · WEB AUDIO · BLENDER CYCLES · PHOTOGRAMMETRY · OPENCV TRACKING",
    // THE TWO INKS THE PIECE ENGRAVES IN. Its eye and its flower are cut as burin
    // lines in ultramarine with a second ink in crimson laid out of register on
    // the wet rims (iris.js, story.js ENGRAVE): the piece's own pair, and the only
    // red this site prints.
    inkA: "#1F24D6",   // ultramarine
    ink: "#B3122E",    // crimson
    inkName: "ULTRAMARINE&nbsp;+&nbsp;CRIMSON",
    inkWhy: "the two inks the piece engraves its eye and its flower in"
  },
  {
    slug: "iclicker",
    n: "03",
    title: "iclicker",
    sub: "classroom participation · security case study",
    kind: "SECURITY · CASE STUDY",
    year: "2025",
    line: "A classroom attendance system that asks the device being measured to grade itself, and trusts the answer. Written up as a case study, not a tool.",
    skills: "REVERSE ENGINEERING · CLIENT-SIDE TRUST · MV3 EXTENSIONS · DISCLOSURE",
    inkA: "#3576C4",   // his blue
    ink: "#4FAEA6",    // his teal
    inkName: "BLUE&nbsp;+&nbsp;TEAL",
    inkWhy: "the system's own colour, used to describe the system"
  }
];

export const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug) || null;
