// Building kit for Arry's World: assembles houses, halls and rooms from the Quaternius
// Medieval Village MegaKit (CC0) as instanced pieces on a 2 metre grid.
export const KIT_PIECES = `Wall_Plaster_Straight Wall_Plaster_Window_Wide_Flat Wall_Plaster_Window_Wide_Round Wall_Plaster_Window_Thin_Round Wall_Plaster_Door_Flat Wall_Plaster_Door_Round Wall_Plaster_WoodGrid
Wall_UnevenBrick_Straight Wall_UnevenBrick_Window_Wide_Flat Wall_UnevenBrick_Window_Wide_Round Wall_UnevenBrick_Door_Flat Wall_UnevenBrick_Door_Round Wall_Arch
Window_Wide_Flat1 Window_Wide_Round1 Window_Thin_Round1 Door_1_Flat WindowShutters_Wide_Flat_Open Corner_Exterior_Wood
Roof_RoundTiles_4x4 Roof_RoundTiles_4x6 Roof_RoundTiles_4x8 Roof_RoundTiles_6x6 Roof_RoundTiles_6x8 Roof_RoundTiles_6x10 Roof_RoundTiles_6x12 Roof_RoundTiles_8x8 Roof_RoundTiles_8x10 Roof_RoundTiles_8x12 Roof_Tower_RoundTiles
Roof_Front_Brick4 Roof_Front_Brick6 Roof_Front_Brick8 Prop_Chimney Prop_Chimney2 Prop_Vine1 Prop_Vine2 Prop_Vine5 Prop_Crate Prop_Wagon Prop_WoodenFence_Single
Floor_WoodDark Floor_WoodLight Floor_Brick Floor_UnevenBrick Floor_RedBrick Stairs_Exterior_Straight Stair_Interior_Simple Balcony_Simple_Straight Overhang_Plaster_Long`.split(/\s+/);

export async function loadKit(THREE, GLTFLoader, base){
  const L = new GLTFLoader().setPath(base), parts = {}, mats = new Map();
  await Promise.all(KIT_PIECES.map(n => L.loadAsync(n + '.gltf').then(g => {
    g.scene.updateMatrixWorld(true); const list = [];
    g.scene.traverse(o => { if (!o.isMesh) return;
      // every piece ships its own copy of the same few materials: share one of each
      let m = mats.get(o.material.name); if (!m){ m = o.material; mats.set(m.name, m); m.envMapIntensity = .5; if (m.alphaTest > 0 || /vine/i.test(m.name)){ m.transparent = false; m.alphaTest = .45; m.side = THREE.DoubleSide; } if (/glass/i.test(m.name)){ m.transparent = true; m.opacity = .55; m.color.set('#9fd0e8'); m.depthWrite = false; } }
      list.push({ geo:o.geometry, mat:m, m:o.matrixWorld.clone(), tint:/plaster/i.test(m.name) }); });
    parts[n] = list; })));
  return new Kit(THREE, parts);
}

export class Kit {
  constructor(THREE, parts){ this.T = THREE; this.parts = parts; this.items = []; }
  // one piece at a world position; `tint` colours the plaster
  put(name, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, tint = null){ if (this.parts[name]) this.items.push([name, x, y, z, ry, sx, sy, sz, tint]); }
  // returns a placer working in a local frame (origin x,z; rotated ry about the vertical)
  frame(x, z, ry, y0 = 0){ const c = Math.cos(ry), s = Math.sin(ry); return (name, lx, ly, lz, lr = 0, sx = 1, sy = 1, sz = 1, tint = null) => this.put(name, x + lx*c + lz*s, y0 + ly, z - lx*s + lz*c, ry + lr, sx, sy, sz, tint); }
  // builds everything queued since the last flush; groupFor(x, z) picks the parent group for a piece
  flush(groupFor, opts = {}){
    const T = this.T, by = new Map(), P = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), pv = new T.Vector3(), sv = new T.Vector3(), col = new T.Color();
    for (const it of this.items){ const g = groupFor(it[1], it[3]); let m = by.get(g); if (!m) by.set(g, m = new Map()); let l = m.get(it[0]); if (!l) m.set(it[0], l = []); l.push(it); }
    for (const [g, m] of by) for (const [name, list] of m) for (const part of this.parts[name]){
      const im = new T.InstancedMesh(part.geo, part.mat, list.length);
      list.forEach((it, i) => { P.compose(pv.set(it[1], it[2], it[3]), q.setFromAxisAngle(up, it[4]), sv.set(it[5], it[6], it[7])); im.setMatrixAt(i, P.clone().multiply(part.m)); if (part.tint) im.setColorAt(i, col.set(it[8] || '#ffffff')); });
      im.castShadow = opts.cast !== false && !part.mat.transparent; im.receiveShadow = true; im.computeBoundingSphere(); g.add(im); }
    this.items = [];
  }
  /* A gabled house. span (4, 6 or 8 m) runs along local x, len (4..12 m) along local z, the ridge along z.
     The door is in the middle of the +x long side. Returns the footprint. */
  house(o){
    const F = this.frame(o.x, o.z, o.ry || 0, o.y || 0), H = 3, span = o.span || 6, len = o.len || 8, floors = o.floors || 1, hs = span/2, hl = len/2, W = 'Wall_' + (o.wall || 'Plaster') + '_', tint = o.tint || null;
    const rnd = o.rnd || Math.random, nz = len/2, nx = span/2, door = Math.floor(nz/2), PI = Math.PI;
    const win = (lx, y, lz, rot, shut) => { F('Window_Wide_Flat1', lx, y, lz, rot); if (shut) F('WindowShutters_Wide_Flat_Open', lx, y, lz, rot); };
    for (let f = 0; f < floors; f++){ const y = f*H;
      for (let k = 0; k < nz; k++){ const lz = -hl + 1 + 2*k;
        if (f === 0 && k === door && o.door !== false){ F(W + 'Door_Flat', hs, y, lz, PI/2, 1, 1, 1, tint); F('Door_1_Flat', hs + .02, y, lz + .53, PI/2); }
        else if ((k + f) % 2 === 0 || nz < 3){ F(W + 'Window_Wide_Flat', hs, y, lz, PI/2, 1, 1, 1, tint); win(hs, y, lz, PI/2, o.shutters !== false && rnd() < .6); }
        else F(W + 'Straight', hs, y, lz, PI/2, 1, 1, 1, tint);
        if ((k + f) % 2 === 1){ F(W + 'Window_Wide_Flat', -hs, y, lz, -PI/2, 1, 1, 1, tint); win(-hs, y, lz, -PI/2, false); } else F(W + 'Straight', -hs, y, lz, -PI/2, 1, 1, 1, tint); }
      for (let i = 0; i < nx; i++){ const lx = -hs + 1 + 2*i, w = nx >= 3 && i === Math.floor(nx/2);
        F(W + (w ? 'Window_Wide_Flat' : 'Straight'), lx, y, hl, 0, 1, 1, 1, tint); if (w) win(lx, y, hl, 0, false);
        F(W + (w && f > 0 ? 'Window_Wide_Flat' : 'Straight'), lx, y, -hl, PI, 1, 1, 1, tint); if (w && f > 0) win(lx, y, -hl, PI, false); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) F('Corner_Exterior_Wood', sx*hs, y, sz*hl); }
    const top = floors*H, ry = o.roofY || .7;
    F(`Roof_RoundTiles_${span}x${len}`, 0, top, 0, 0, 1, ry, 1); F('Roof_Front_Brick' + span, 0, top, hl, 0, 1, ry, 1, tint); F('Roof_Front_Brick' + span, 0, top, -hl, PI, 1, ry, 1, tint);
    if (o.chimney !== false) F('Prop_Chimney2', -hs*.45, top + (span*.22)*ry, hl*.4, 0, .8, .8, .8);
    if (o.vines && rnd() < .7) F('Prop_Vine5', hs + .04, 2.7, -hl + 1 + 2*((door + 1) % nz), PI/2);
    return { w:span, d:len };
  }
  /* A plain room seen from inside: floor tiles and four walls facing inwards, no roof. w along x, d along z. */
  room(o){
    const F = this.frame(o.x, o.z, o.ry || 0, o.y || 0), w = o.w, d = o.d, hw = w/2, hd = d/2, W = 'Wall_' + (o.wall || 'Plaster') + '_', tint = o.tint || null, PI = Math.PI, floor = o.floor || 'Floor_WoodLight';
    for (let i = 0; i < w/2; i++) for (let k = 0; k < d/2; k++) F(floor, -hw + 1 + 2*i, .02, -hd + 1 + 2*k);
    const gaps = o.gaps || [];   // [side, index] openings: side 'n' (-z), 's' (+z), 'e' (+x), 'w' (-x)
    const open = (s, i) => gaps.some(g => g[0] === s && g[1] === i);
    for (let i = 0; i < w/2; i++){ const lx = -hw + 1 + 2*i;
      if (!open('n', i)) F(W + (i % 2 ? 'Window_Wide_Flat' : 'Straight'), lx, 0, -hd, 0, 1, 1, 1, tint); else F('Wall_Arch', lx, 0, -hd, 0);
      if (!open('s', i) && o.south !== false) F(W + 'Straight', lx, 0, hd, PI, 1, .45, 1, tint); }
    for (let k = 0; k < d/2; k++){ const lz = -hd + 1 + 2*k;
      if (!open('w', k)) F(W + (k % 2 ? 'Straight' : 'Window_Wide_Flat'), -hw, 0, lz, PI/2, 1, 1, 1, tint); else F('Wall_Arch', -hw, 0, lz, PI/2);
      if (!open('e', k)) F(W + 'Straight', hw, 0, lz, -PI/2, 1, 1, 1, tint); else F('Wall_Arch', hw, 0, lz, -PI/2); }
    return { w, d };
  }
}
