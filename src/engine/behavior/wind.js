// wind.js
// THE BLAST OF HER OWN HYPER BEAM, as a field: how hard it blows, and how
// unsteadily, as a function of time since the shot. Pure and headless, like
// fx/beamShape.js, so the tests can hold it to its shape.
//
// By instruction (2026-10-04): after the shot she should look "pushed back by
// immense winds", body parts "waving and unsteady", like an anime character
// gripping a pole while an enemy's attack throws air across the frame. The
// owner chose "hold ground, slight slide": she is shoved back about half her
// height and then strains in place while it batters her.
//
// ONE FIELD, MANY READERS -- the structural choice. The wind is not a pose
// someone authored onto each limb; it is one quantity the brain publishes
// (`world.wind`), and every part that would feel air reads it in its own
// physics:
//
//   behavior/brain.js     the push and the strain: an anchor that slides back
//                         and a near-critical hold toward it, plus the gusts'
//                         shove around it
//   pose/bodyPose.js      gust TORQUE on her orientation spring -- the brace is
//                         a muscle, so a gust knocks her and the muscle hauls
//                         her back, and the unsteadiness is inertia, not noise
//                         drawn on
//   pose/tailChain.js     AIR VELOCITY in the tail's anisotropic drag: the
//                         strand streams and flutters because a slender thing
//                         in a fast flow does
//   pose/limbPose.js      the limbs pushed further into the streamlined pose
//                         and fluttering, each at its own rate
//   pose/earSprings.js    ears pressed flat, their underdamped springs flapping
//                         on the gusts
//   pose/faceMorphs.js    a squint into it
//
// THE SHAPE OF IT. A blast front first (it arrives over a few hundredths of a
// second and overshoots), held through the beam with gusts in it, and dying on
// an exponential once the beam starts to go -- so it lingers a breath past the
// beam, the way air keeps moving after whatever moved it has stopped.

import { makeNoise1d2 } from "../../utils/math.js";

export function createWind(atk) {
  const W = atk.wind;
  const nA = makeNoise1d2(711), nB = makeNoise1d2(712), nC = makeNoise1d2(713);
  const holdEnd = atk.expandS + atk.sustainS;

  /**
   * @param t  seconds since the shot
   * @returns  { k, gust, cross } -- k the strength 0..~1.5 (0 = still air),
   *           gust and cross the turbulence along and across the flow, -1..1
   *           (zero-mean: a gust is a change in the wind, not more of it)
   */
  function at(t) {
    if (!(t >= 0)) return { k: 0, gust: 0, cross: 0 };
    let k = Math.min(1, t / W.riseS);
    k *= 1 + W.blast * Math.exp(-t / W.blastS);
    if (t > holdEnd) k *= Math.exp(-(t - holdEnd) / W.decayS);
    const f = t * W.gustHz;
    const gust = nA(f) * 0.65 + nB(f * 2.7 + 5.1) * 0.35;
    const cross = nC(f * 1.6 + 2.3);
    return { k, gust, cross };
  }

  /** when the air has gone still: k under 1% of full */
  const endS = holdEnd + W.decayS * Math.log(100 * (1 + W.blast));

  return { at, endS };
}
