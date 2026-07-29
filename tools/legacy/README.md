# retired tooling

nothing in here runs as part of the current build. kept for provenance and
because the maths in some of it is worth stealing.

| file | what it was | why it is here |
| --- | --- | --- |
| `build_mew.py` + `meshkit.py` + `faceref.py` | the v3.7 pipeline: an all-quad mew authored from scratch in pure numpy, with a painted face texture and blink/squint/smile morphs | superseded when the owner brought in the meshy model (`mewNew.glb`). the mesh it builds is no longer shipped |
| `check_model.py` | the v3.7 model gate (all-quad topology, morph coverage, uv orientation) | most of its assertions are about a mesh that no longer exists. its successor is `tools/check_mew.py` |
| `rig_new.py` + `segment_mew.py` | the first attempt at auto-rigging the meshy model | this is the rig the owner reported as broken: it bound by inverse distance to every bone, so an ear twitch warped the muzzle, the arm region swallowed part of the skull, and the neck line landed above the cheeks. replaced by `tools/mewparts.py` + `tools/rig_mew.py` |
| `split_foot.py` | narrowest-waist limb splitter; produced `mewNew_split.glb` | **its output was broken.** the split left 18 non-manifold edges — a doubled surface welded back onto itself — which defeats every topological operation downstream. that file has been deleted; the build now reads the clean, perfectly manifold `mewNew.glb` and `tools/meshsurgery.py` does the splitting |
| `tailshape.py` | re-routed the meshy tail along a new centreline with rotation-minimising frames, so it trailed backward instead of sticking out sideways | it fixed the DIRECTION but could not move the ATTACHMENT: the tail is welded to the right hip at x +0.60, so a third of it still read as part of the body. it was also a lumpy tube -- 53 vertices over 64 rings, some rings holding one vertex. `tools/tailbuild.py` deletes it outright and grows a new one out of the butt instead. the RMF maths here is worth stealing |
| `build_mew_blender_v1.py` | the original blender script (v1 model) | historical |
| `mew_sketchfab_original.glb`, `mew_v1_current.glb` | the models those scripts produced | historical |

these scripts `sys.path.insert` their own directory and import `glbtool`, which
now lives one level up in `tools/`. to run one, add `tools/` to `PYTHONPATH`.
