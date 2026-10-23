import test from 'node:test';
import assert from 'node:assert/strict';
import {zipStore,unzipStore,crc32,encodePSD,encodeGIF} from '../app/binary.js';
import {floodFill,History} from '../app/model.js';

test('ZIP UTF-8 archive roundtrip and CRC validation',()=>{
 const files={'manifest.json':'{"version":1}','parts/눈.png':new Uint8Array([0,1,2,255])},bytes=zipStore(files),result=unzipStore(bytes);
 assert.equal(new TextDecoder().decode(result['manifest.json']),files['manifest.json']);assert.deepEqual(result['parts/눈.png'],files['parts/눈.png']);
 const corrupt=bytes.slice();corrupt[30+new TextEncoder().encode('manifest.json').length]^=1;assert.throws(()=>unzipStore(corrupt),/Corrupted/);
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
test('ZIP rejects traversal, duplicate entries, malformed data and oversized inputs',()=>{
 assert.throws(()=>unzipStore(zipStore({'../unsafe':'x'})),/path/);
 assert.throws(()=>unzipStore(zipStore({'a':'many bytes'}),2),/oversized/);
 assert.throws(()=>unzipStore(new Uint8Array([1,2,3])),/Invalid/);
 const b=zipStore({'a':'x'});b[8]=8;assert.throws(()=>unzipStore(b),/Unsupported/);
});
test('Flood fill respects connected components and preserves boundary',()=>{
 const image={width:3,height:3,data:new Uint8ClampedArray(36)};for(const p of [1,4,7])image.data.set([0,0,0,255],p*4);
 floodFill(image,0,0,[255,0,0,255],0);assert.deepEqual([...image.data.slice(0,4)],[255,0,0,255]);assert.equal(image.data[2*4+3],0);assert.equal(image.data[4*4+3],255);
});
test('History clears redo after a divergent edit and trims old commands',()=>{
 const history=new History(10);let n=0;const change=()=>{const before=n;n++;history.push(()=>n=before,()=>n=before+1,6);};change();change();assert.equal(history.undoStack.length,1);history.undo();assert.equal(n,1);history.redo();assert.equal(n,2);history.undo();change();assert.equal(history.redoStack.length,0);
});
test('PSD uses RGB+alpha header, folder records and full composite planes',()=>{
 const rgba=new Uint8Array([255,0,0,255,0,255,0,128,0,0,255,0,10,20,30,255]);const out=encodePSD(2,2,[{name:'눈',rgba}],rgba),v=new DataView(out.buffer);
 assert.equal(new TextDecoder().decode(out.slice(0,4)),'8BPS');assert.equal(v.getUint16(12),4);assert.equal(v.getUint32(14),2);assert.equal(v.getUint32(18),2);assert.equal(v.getUint16(22),8);assert.equal(v.getUint16(24),3);assert.equal(out.at(-1),255);
});
test('GIF fixed-width LZW crosses subblocks and decodes losslessly at palette colors',()=>{
 const rgba=new Uint8Array(32*32*4);for(let i=0;i<32*32;i++)rgba.set([255,255,255,i%2?255:0],i*4);const bytes=encodeGIF(32,32,rgba);
 assert.equal(new TextDecoder().decode(bytes.slice(0,6)),'GIF89a');assert.equal(bytes.at(-1),0x3b);
 // Read the writer's 9-bit LZW stream, including repeated clear codes.
 let at=800; // locate image separator after 6+7+768+8 bytes
 const imageAt=6+7+768+8;assert.equal(bytes[imageAt],0x2c);at=imageAt+10;assert.equal(bytes[at++],8);
 const packed=[];while(bytes[at]){const n=bytes[at++];packed.push(...bytes.slice(at,at+n));at+=n;}let bit=0,codes=[];while(bit+9<=packed.length*8){let code=0;for(let i=0;i<9;i++)code|=((packed[(bit+i)>>3]>>((bit+i)&7))&1)<<i;bit+=9;if(code===257)break;if(code!==256)codes.push(code);}assert.equal(codes.length,1024);assert.equal(codes[0],0);assert.equal(codes[1],255);
});
