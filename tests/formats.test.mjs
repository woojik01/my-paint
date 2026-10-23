import test from 'node:test';import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {initializeCanvas,readPsd} from 'ag-psd';
import {encodePSD,encodeGIF} from '../app/binary.js';
import {createDocument,composite,renderLayers,layer,group,checkBudget} from '../app/model.js';
import {serialize,deserialize} from '../app/formats.js';
globalThis.document={createElement:()=>{const c=createCanvas(1,1);c.toBlob=(callback,type)=>callback(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}};
globalThis.createImageBitmap=async blob=>{const image=await loadImage(Buffer.from(await blob.arrayBuffer()));return {width:image.width,height:image.height,close(){},_image:image};};
// The native canvas adapter unwraps our ImageBitmap stand-in for project decode.
const prototype=Object.getPrototypeOf(createCanvas(1,1).getContext('2d'));const nativeDraw=prototype.drawImage;prototype.drawImage=function(img,...args){return nativeDraw.call(this,img?._image||img,...args);};
initializeCanvas(createCanvas);
function paint(c,color){const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,c.width,c.height);}
const pixel=c=>[...c.getContext('2d').getImageData(0,0,1,1).data];
test('Projects preserve pixels, alpha masks, Unicode groups, settings and layer order',async()=>{
 const d=createDocument('눈 원화',32,32,'parts','transparent'),l=d.layers[1];paint(l.canvas,'red');l.mask=createCanvas(32,32);paint(l.mask,'#ffffff');l.opacity=.5;l.alphaLock=true;l.blend='multiply';const restored=await deserialize(await serialize(d));
 assert.equal(restored.name,d.name);assert.equal(restored.layers[0].name,d.layers[0].name);assert.deepEqual(pixel(restored.layers[1].canvas),[255,0,0,255]);assert.ok(restored.layers[1].mask);assert.equal(restored.layers[1].opacity,.5);assert.equal(restored.layers[1].alphaLock,true);assert.equal(restored.layers[1].blend,'multiply');
});
test('Masks, isolated group opacity, hidden layers and clipping composite correctly',()=>{
 const d=createDocument('Test',16,16,'drawing','transparent');const base=d.layers[0];paint(base.canvas,'red');const top=layer('top',16,16);paint(top.canvas,'blue');top.mask=createCanvas(16,16);d.layers.unshift(top);assert.deepEqual(pixel(composite(d)),[255,0,0,255]);
 top.mask=null;top.clip=true;base.canvas.getContext('2d').clearRect(0,0,16,16);assert.deepEqual(pixel(renderLayers(d)),[0,0,0,0]);
 paint(base.canvas,'red');top.visible=false;assert.deepEqual(pixel(renderLayers(d)),[255,0,0,255]);
 const g=group('folder');g.opacity=.5;d.layers.unshift(g);base.parent=g.id;assert.equal(pixel(renderLayers(d))[3],128);
});
test('PSD roundtrips through independent ag-psd parser with Korean names, groups, opacity and alpha',()=>{
 const rgba=new Uint8Array(16*16*4);for(let i=0;i<256;i++)rgba.set([255,0,0,128],i*4);
 const out=encodePSD(16,16,[{name:'눈 그룹',section:1,opacity:.5},{name:'홍채',rgba,opacity:.8},{name:'</Layer group>',section:3}],rgba);
 const p=readPsd(out);assert.equal(p.width,16);assert.equal(p.height,16);assert.equal(p.children.length,1);assert.equal(p.children[0].name,'눈 그룹');assert.equal(p.children[0].children[0].name,'홍채');assert.ok(Math.abs(p.children[0].opacity-.5)<.005);assert.deepEqual(pixel(p.children[0].children[0].canvas),[255,0,0,128]);
});
test('GIF decodes with native image decoder and retains binary transparency',async()=>{
 const rgba=new Uint8Array(32*32*4);for(let i=0;i<1024;i++)rgba.set([255,255,255,i%2?255:0],i*4);const bytes=encodeGIF(32,32,rgba);const image=await loadImage(Buffer.from(bytes)),c=createCanvas(32,32);c.getContext('2d').drawImage(image,0,0);const a=c.getContext('2d').getImageData(0,0,2,1).data;assert.equal(a[3],0);assert.equal(a[7],255);assert.equal(image.width,32);
});

test('Projects reject tampered manifests, unsupported versions and oversized templates',async()=>{
 const {zipStore,unzipStore}=await import('../app/binary.js');
 const d=createDocument('Test',16,16),raw=unzipStore(await(await serialize(d)).arrayBuffer());
 const manifest=JSON.parse(new TextDecoder().decode(raw['manifest.json']));manifest.version=99;raw['manifest.json']=JSON.stringify(manifest);await assert.rejects(()=>deserialize(new Blob([zipStore(raw)])),/Unsupported/);
 manifest.version=1;manifest.background='url(evil)';raw['manifest.json']=JSON.stringify(manifest);await assert.rejects(()=>deserialize(new Blob([zipStore(raw)])),/Invalid/);
 assert.throws(()=>createDocument('Large',4096,4096,'parts'),/budget/);
 const big=createDocument('Large',4096,4096);assert.throws(()=>checkBudget(big,2),/budget/);
});
test('GIF keeps opaque black separate from the transparent palette entry',async()=>{
 const rgba=new Uint8Array([0,0,0,255,0,0,0,0]),bytes=encodeGIF(2,1,rgba),image=await loadImage(Buffer.from(bytes)),c=createCanvas(2,1);c.getContext('2d').drawImage(image,0,0);const p=c.getContext('2d').getImageData(0,0,2,1).data;assert.deepEqual([...p.slice(0,4)],[0,0,0,255]);assert.equal(p[7],0);
});
