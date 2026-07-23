// glbHeadless.js
// loads the real mew.glb through three's GLTFLoader inside plain node.
//
// the model carries an embedded png (the painted face), and GLTFLoader's image
// path reaches for `self.URL.createObjectURL` + `createImageBitmap`, neither of
// which exist in node. none of the headless checks care about pixels -- they
// exercise geometry, the skeleton and the pose stack -- so strip the material
// side out of the json before parsing rather than shimming half a browser.
//
// geometry, skin, weights and morph targets are untouched.

import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function stripImages(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  const jsonLen = dv.getUint32(12, true);
  const jsonBytes = new Uint8Array(arrayBuffer, 20, jsonLen);
  const json = JSON.parse(new TextDecoder().decode(jsonBytes));

  if (!json.images && !json.textures) return arrayBuffer;
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const m of json.materials || []) {
    const p = m.pbrMetallicRoughness;
    if (p) delete p.baseColorTexture;
    delete m.normalTexture;
    delete m.emissiveTexture;
    delete m.occlusionTexture;
  }

  // re-emit the json chunk, padded to 4 bytes with spaces as the spec wants.
  // the binary chunk is reused verbatim: dropping the image bufferView would
  // renumber every accessor, so the png just stays in the buffer unreferenced.
  let out = new TextEncoder().encode(JSON.stringify(json));
  const pad = (4 - (out.length % 4)) % 4;
  if (pad) {
    const p = new Uint8Array(out.length + pad).fill(0x20);
    p.set(out);
    out = p;
  }
  const binOffset = 20 + jsonLen;
  const binLen = dv.getUint32(binOffset, true);
  const bin = new Uint8Array(arrayBuffer, binOffset + 8, binLen);

  const total = 12 + 8 + out.length + 8 + bin.length;
  const buf = new ArrayBuffer(total);
  const o = new DataView(buf);
  const u8 = new Uint8Array(buf);
  o.setUint32(0, 0x46546c67, true);
  o.setUint32(4, 2, true);
  o.setUint32(8, total, true);
  o.setUint32(12, out.length, true);
  o.setUint32(16, 0x4e4f534a, true);
  u8.set(out, 20);
  o.setUint32(20 + out.length, bin.length, true);
  o.setUint32(24 + out.length, 0x004e4942, true);
  u8.set(bin, 28 + out.length);
  return buf;
}

export function loadGlbHeadless(path) {
  const buf = readFileSync(path);
  const ab = stripImages(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(ab, "", resolve, reject);
  });
}
