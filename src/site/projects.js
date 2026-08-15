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
    title: "usb provisioning cli",
    sub: "batch engraving + encryption tooling · rcmp",
    kind: "SYSTEMS TOOLING · COMMISSIONED",
    year: "2025",
    // The gate caption is a lede, not a summary. One sentence that says what
    // the work is worth; the argument is on the sheet it opens.
    line: "Two command-line tools that took the manual step out of an RCMP hardware pipeline: asset numbers are no longer typed into the engraver pocket by pocket, and drives are no longer encrypted one at a time.",
    skills: "POWERSHELL · BITLOCKER / XTS-AES · WINDOWS STORAGE APIS · PYTHON · HUNGARIAN ASSIGNMENT · OPERATOR SOP",
    inkA: "#16305C",   // deep navy: the sky of this sheet
    ink: "#23262B",    // near-black
    inkName: "NAVY&nbsp;+&nbsp;BLACK",
    inkWhy: "the colour of the hardware it writes to"
  },
  {
    slug: "closet",
    n: "02",
    title: "closet",
    sub: "outfit generation engine · learned aesthetic judge",
    kind: "ONGOING · ALGORITHM",
    year: "2026—",
    line: "Every wardrobe app maximises similarity under fixed weights and a fixed piece count, so it collapses to the closet's average item — one shawl in 24 of 24 outfits, measured. This one picks a statement piece first and adds a piece only while it contributes more than it costs. Then the harder half: a judge that can tell whether the result is any good.",
    skills: "CLIP IMAGE EMBEDDINGS · DEEPSETS SET ENCODER · CONSTRAINT SEARCH · VLM INTAKE · PGVECTOR · FASTAPI · SWIFTUI",
    inkA: "#2E2E2E",   // a greyscale sky
    ink: "#7A7A78",    // mid grey
    inkName: "TWO&nbsp;GREYS",
    // No colour at all, and that is the accurate one: his own wardrobe board
    // measures 0.106 mean saturation. The project about how clothes go together
    // is printed in the value range he actually dresses in.
    inkWhy: "no chroma — the value range his own wardrobe measures at"
  },
  {
    slug: "iclicker",
    n: "03",
    title: "iclicker",
    sub: "classroom participation · security case study",
    kind: "SECURITY · CASE STUDY",
    year: "2025",
    line: "An industry-standard attendance system, adopted institution-wide, that asks the machine being measured to grade itself — and then sends that machine the answer to its own check. A study of what a participation mark is actually evidence of.",
    skills: "REVERSE ENGINEERING · CLIENT-SIDE TRUST · MV3 EXTENSIONS · DISCLOSURE",
    inkA: "#3576C4",   // his blue
    ink: "#4FAEA6",    // his teal
    inkName: "BLUE&nbsp;+&nbsp;TEAL",
    inkWhy: "the system's own colour, used to describe the system"
  }
];

export const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug) || null;
