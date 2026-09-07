// motion.js — does this reader want less of it?
//
// One place, because the answer has to be the same in four files and because
// "reduced motion" on THIS site is a bigger question than a CSS transition.
//
// WHAT IT SWITCHES OFF, AND THE ARGUMENT FOR EACH
// -----------------------------------------------
//   the crossings   router.js commits outright instead of opening the paper
//   the stagger     site.css lands every entrance at its END state
//   the weather     deck.js holds the cloud loop on one frame: the print is a
//                   print rather than a slow pan behind the type
//   the card video  cards.js leaves the still up on hover
//   THE ANIMAL      main.js does not boot the engine at all
//
// The last one is the big call and it is deliberate. Mew wanders, flees the
// pointer, flails and sprays — an autonomously moving object crossing the
// reading, which is the canonical thing this media query exists to spare
// someone. A STILL mew was the alternative and is worse twice: it means a
// second behavioural mode threaded through the whole brain, and a character
// standing frozen in the middle of a page is a stranger picture than an honest
// absence. The site is already built to be correct without her — the engine is
// its own chunk precisely so that its absence is a page rather than a hole —
// so this costs the reader who asked for it nothing but the animal, and saves
// them 800 KB.
//
// Read ONCE, at import. It can change while the page is open, and reacting to
// that would mean tearing down a WebGL context and a physics sim mid-session
// for a preference almost nobody flips mid-visit. A reload is the correct
// answer and it is what every other site does.

export const reducedMotion =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
