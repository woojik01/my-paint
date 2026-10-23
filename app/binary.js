// All encoders run locally. No CDN or remote conversion service.
export class Bytes {
  constructor(little = false) { this.parts = []; this.length = 0; this.little = little; }
  add(value) { const b = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value); this.parts.push(b); this.length += b.length; return this; }
  num(value, size = 4) { const b = new Uint8Array(size), v = new DataView(b.buffer); if (size === 1) v.setUint8(0, value); else if (size === 2) v.setUint16(0, value, this.little); else v.setUint32(0, value, this.little); return this.add(b); }
  end() { const all = new Uint8Array(this.length); let at = 0; for (const p of this.parts) { all.set(p, at); at += p.length; } return all; }
}
export function crc32(bytes) { let c = -1; for (const b of bytes) { c ^= b; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ -1) >>> 0; }
export function zipStore(files) {
  const out = new Bytes(true), dir = new Bytes(true); let offset = 0;
  for (const [path, input] of Object.entries(files)) {
    const name = new TextEncoder().encode(path), data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input), crc = crc32(data);
    out.num(0x04034b50).num(20,2).num(0x800,2).num(0,2).num(0,2).num(0x21,2).num(crc).num(data.length).num(data.length).num(name.length,2).num(0,2).add(name).add(data);
    dir.num(0x02014b50).num(20,2).num(20,2).num(0x800,2).num(0,2).num(0,2).num(0x21,2).num(crc).num(data.length).num(data.length).num(name.length,2).num(0,2).num(0,2).num(0,2).num(0,2).num(0).num(offset).add(name);
    offset = out.length;
  }
  const count = Object.keys(files).length, central = dir.end(); out.add(central).num(0x06054b50).num(0,2).num(0,2).num(count,2).num(count,2).num(central.length).num(offset).num(0,2); return out.end();
}
export function unzipStore(input, maxSize = 192 * 1024 * 1024) {
  const b = new Uint8Array(input), v = new DataView(b.buffer,b.byteOffset,b.byteLength), files = Object.create(null); let at=0, total=0, count=0;
  while (at+4 <= b.length && v.getUint32(at,true) === 0x04034b50) {
    if (at+30>b.length || ++count>300) throw new Error('Invalid archive');
    const flags=v.getUint16(at+6,true), method=v.getUint16(at+8,true), crc=v.getUint32(at+14,true), size=v.getUint32(at+18,true), raw=v.getUint32(at+22,true), n=v.getUint16(at+26,true), e=v.getUint16(at+28,true);
    if (method!==0 || flags&9 || size!==raw || (total+=raw)>maxSize) throw new Error('Unsupported or oversized archive');
    const start=at+30+n+e, end=start+size; if(end>b.length) throw new Error('Truncated archive');
    const name=new TextDecoder().decode(b.subarray(at+30,at+30+n));
    if (!name || name.startsWith('/') || name.includes('..') || name.includes('\\') || Object.hasOwn(files,name)) throw new Error('Invalid archive path');
    const data=b.slice(start,end); if(crc32(data)!==crc) throw new Error('Corrupted archive'); files[name]=data; at=end;
  }
  if (!count || at+4>b.length || v.getUint32(at,true)!==0x02014b50) throw new Error('Invalid archive');
  return files;
}
function extraBlock(key, data) { const b=new Bytes().add('8BIM').add(key).num(data.length).add(data); if(data.length%2)b.num(0,1); return b.end(); }
function unicodeName(name) { const w=new Bytes().num(name.length); for(let i=0;i<name.length;i++)w.num(name.charCodeAt(i),2); return extraBlock('luni',w.end()); }
// PSD v1, 8-bit RGB, uncompressed channels, Unicode names and folder dividers.
// Layers supplied in UI order (top to bottom); raster data is already mask/clip baked.
export function encodePSD(width,height,items,composite) {
  if(width<1||height<1||width>30000||height>30000)throw new Error('Invalid PSD dimensions');
  items=[...items].reverse();
  const records=new Bytes(), pixels=new Bytes();
  for(const item of items) {
    const raster=item.rgba, w=raster?width:0, h=raster?height:0;
    records.num(0).num(0).num(h).num(w).num(4,2);
    for(const id of [-1,0,1,2])records.num(id,2).num(w*h+2);
    records.add('8BIM').add(item.blend==='multiply'?'mul ':item.blend==='screen'?'scrn':'norm').num(Math.round((item.opacity??1)*255),1).num(0,1).num(item.visible===false?2:0,1).num(0,1);
    const ex=new Bytes().num(0).num(0), nm=new TextEncoder().encode((item.name||'Layer').replace(/[^\x20-\x7e]/g,'_')).slice(0,255);
    ex.num(nm.length,1).add(nm); while(ex.length%4)ex.num(0,1); ex.add(unicodeName(item.name||'Layer'));
    if(item.section)ex.add(extraBlock('lsct',new Bytes().num(item.section).end()));
    const ed=ex.end(); records.num(ed.length).add(ed);
    for(const channel of [3,0,1,2]) { pixels.num(0,2); if(raster){const plane=new Uint8Array(w*h); for(let i=0;i<plane.length;i++)plane[i]=raster[i*4+channel]; pixels.add(plane);} }
  }
  const info=new Bytes().num(-items.length,2).add(records.end()).add(pixels.end()); if(info.length%2)info.num(0,1);
  const id=info.end(), layer=new Bytes().num(id.length).add(id).num(0).end();
  const result=new Bytes().add('8BPS').num(1,2).add(new Uint8Array(6)).num(4,2).num(height).num(width).num(8,2).num(3,2).num(0).num(0).num(layer.length).add(layer).num(0,2);
  for(const channel of [0,1,2,3]) { const plane=new Uint8Array(width*height); for(let i=0;i<plane.length;i++)plane[i]=composite[i*4+channel]; result.add(plane); }
  return result.end();
}
// Fixed 3/3/2 palette. Alpha is thresholded at 128; transparent pixels use index 0.
// Frequent clear codes keep GIF LZW at a fixed 9-bit code width (valid but larger).
export function encodeGIF(width,height,rgba) {
  if(width<1||height<1||width>65535||height>65535)throw new Error('Invalid GIF dimensions');
  const w=new Bytes(true).add('GIF89a').num(width,2).num(height,2).num(0xf7,1).num(0,1).num(0,1);
  for(let i=0;i<256;i++) w.add(new Uint8Array(i===1?[0,0,0]:[Math.round((i>>5)*255/7),Math.round(((i>>2)&7)*255/7),Math.round((i&3)*255/3)]));
  w.add(new Uint8Array([0x21,0xf9,4,1,0,0,0,0,0x2c])).num(0,2).num(0,2).num(width,2).num(height,2).num(0,1).num(8,1);
  const packed=[]; let bits=0, buffer=0;
  const emit=code=>{buffer|=code<<bits;bits+=9;while(bits>=8){packed.push(buffer&255);buffer>>>=8;bits-=8;}};
  for(let i=0;i<width*height;i++){ if(i%200===0)emit(256); const p=i*4; let index=(rgba[p]&224)|((rgba[p+1]>>3)&28)|(rgba[p+2]>>6); if(rgba[p+3]<128)index=0;else if(index===0)index=1;emit(index); }
  emit(257);if(bits)packed.push(buffer&255);
  for(let i=0;i<packed.length;i+=255){const block=packed.slice(i,i+255);w.num(block.length,1).add(new Uint8Array(block));}w.num(0,1).num(0x3b,1);return w.end();
}
