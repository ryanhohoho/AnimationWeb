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
    slug: "closet",
    n: "02",
    title: "closet",
    sub: "outfit generation engine · learned aesthetic judge",
    kind: "ONGOING · ALGORITHM",
    year: "2026—",
    line: "Outfit generation that optimises for interest rather than similarity, because maximising similarity collapses a wardrobe to one shawl in 24 of 24 outfits.",
    skills: "CLIP IMAGE EMBEDDINGS · DEEPSETS SET ENCODER · CONSTRAINT SEARCH · VLM INTAKE · PGVECTOR · FASTAPI · SWIFTUI",
    // TWO NEUTRAL GREYS THAT ARE NOT NEUTRAL IN THE CAN, for the same reason
    // the home sheet's blue is not a blue in the can: the press puts the paper
    // into everything it prints. Bone is warm — OKLCh h 94, C 0.0096 — and it is
    // the LIGHTEST PIXEL OF EVERY SKY on this site, because zero coverage is
    // bare stock. On the three blue sheets that is a warm ground under a cool
    // ink and it is the whole reason they look printed rather than rendered.
    //
    // On this one there is no cool ink to play against. Measured, the greyscale
    // page came out warm from end to end — highlights C 0.0094 at h 94, mids
    // 0.0074 at h 95, shadows 0.0043 at h 98 — which is not greyscale, it is
    // cream monochrome, and the paper was the only thing colouring it.
    //
    // So the greys are pulled a few points cool to spend the paper's warmth
    // rather than sit in it. Measured after: mids 0.0046, shadows 0.0028. Pulled
    // FURTHER and it overshoots — at twice this the shadows come back at 0.0081
    // in blue, which is a split tone and a different page again.
    inkA: "#2C2D31",   // prints as near-neutral black
    ink: "#78797B",    // prints as near-neutral mid grey
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
    line: "A classroom attendance system that asks the device being measured to grade itself, and trusts the answer. Written up as a case study, not a tool.",
    skills: "REVERSE ENGINEERING · CLIENT-SIDE TRUST · MV3 EXTENSIONS · DISCLOSURE",
    inkA: "#3576C4",   // his blue
    ink: "#4FAEA6",    // his teal
    inkName: "BLUE&nbsp;+&nbsp;TEAL",
    inkWhy: "the system's own colour, used to describe the system"
  }
];

export const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug) || null;
