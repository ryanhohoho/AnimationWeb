// projects.js — the work, and the colour system that identifies it.
//
// ORDER
// -----
// The projects card shows them in this order, and so do the arrow keys on a
// sheet, and the order is the owner's (2026-09-26): the motion graphics first,
// then the USB tooling and its confidential other half, then the case study.
// It was set in the editor as CSS `order` on the list at first, which the
// arrow keys could not see; it lives here now. Nothing is sorted by date.
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
    // "let me be a flower" (../VisualAudialExperience), shown by instruction as
    // a page named for what it is rather than for the film: no title of its own
    // on the site, every scene named instead (pages/motion-graphics.js). It took
    // closet's slot, which was scrapped on 2026-09-25.
    slug: "motion-graphics",
    n: "01",
    title: "Digital Motion graphics",
    sub: "a vertical visual-audio piece · rendered live in the browser",
    kind: "BLENDER · WEBGL + JAVASCRIPT",
    year: "2026",
    // PLACEHOLDER PROSE, like the other two: the owner rewrites it in the editor
    line: "Work-in-progress.\n\nExperimenting by combining programming and various different mediums to create digital interpretive media.",
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
    slug: "usb-provisioning",
    n: "02",
    title: "Laser Processing",
    sub: "batch engraving + encryption tooling · rcmp",
    kind: "PYTHON · TYPESCRIPT · REACT",
    year: "2025",
    // ONE SENTENCE, WITH THE NUMBER IN IT.
    // This used to be a gate caption -- read while standing in front of one
    // project, with nothing competing for the attention. It is a CARD in a list
    // now, and someone is deciding in a few seconds which of three to open, so
    // the job changed: not "what is this worth" but "what is this, and why is it
    // hard". The argument still lives on the sheet it opens.
    line: "Automatic serial population directly connected to company database. Outputs laser-engraving files for every new company device in British Columbia.",
    skills: "PYTHON · TYPESCRIPT · REACT · WINDOWS STORAGE APIS · HUNGARIAN ASSIGNMENT",
    inkA: "#16305C",   // deep navy: the sky of this sheet
    ink: "#23262B",    // near-black
    inkName: "NAVY&nbsp;+&nbsp;BLACK",
    inkWhy: "the colour of the hardware it writes to"
  },
  {
    // CONFIDENTIAL BY DESIGN (2026-09-26). The encryption side of the same RCMP
    // pipeline the USB sheet shows the engraving side of: the page says what
    // the work was and what the role was, and locks the rest, the way a studio
    // portfolio marks work under NDA (pages/rcmp-encryption.js). Every fact on
    // it is one the site already states elsewhere; nothing new is disclosed.
    slug: "rcmp-encryption",
    n: "03",
    title: "Softshield",
    sub: "drive encryption at fleet scale · rcmp · confidential",
    kind: "PROTECTED B · C · C++ · POWERSHELL",
    year: "2026",
    // PLACEHOLDER PROSE, drafted from the site's own copy: the owner rewrites it
    line: "Modifies private encryption protocol by reading and writing on encrypted drives. CLI for disk inspection and automatic disk malformation detection.",
    skills: "C  · C++  · POWERSHELL  · OTHER",
    // THE USB SHEET'S NAVY, WITH THE DETAIL PRINTED OUT: the same family as
    // the work beside it, and a cool redaction grey as the second ink
    inkA: "#16305C",   // deep navy
    ink: "#7D8594",    // redaction grey
    inkName: "NAVY&nbsp;+&nbsp;GREY",
    inkWhy: "the USB sheet's navy, with the detail printed out"
  },
  {
    slug: "iclicker",
    n: "04",
    title: "iclicker",
    sub: "classroom participation · security case study",
    kind: "DEVTOOLS · JAVASCRIPT",
    year: "2025",
    line: "Work in progress.",
    skills: "REVERSE ENGINEERING · CLIENT-SIDE TRUST · MV3 EXTENSIONS · DISCLOSURE",
    inkA: "#3576C4",   // his blue
    ink: "#4FAEA6",    // his teal
    inkName: "BLUE&nbsp;+&nbsp;TEAL",
    inkWhy: "the system's own colour, used to describe the system"
  }
];

export const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug) || null;
