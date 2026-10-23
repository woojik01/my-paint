export const MAX_BYTES=192*1024*1024;
export const id=()=>crypto.randomUUID();
export const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
export function layer(name,w,h,parent=null) { return {id:id(),name,type:'paint',parent,visible:true,locked:false,alphaLock:false,clip:false,opacity:1,blend:'source-over',canvas:canvas(w,h),mask:null}; }
export function group(name) { return {id:id(),name,type:'group',parent:null,visible:true,locked:false,opacity:1,blend:'source-over'}; }
export function createDocument(name,width,height,background='#ffffff') {
  validateSize(width,height);
  const first=layer('Layer 1',width,height);
  return {id:id(),name,width,height,background,revision:0,updated:Date.now(),layers:[first],active:first.id};
}
export function validateSize(w,h) { if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||w>4096||h>4096||w*h>16777216)throw new Error('Canvas size must be 16–4096 px'); }
export function checkBudget(d,extra=1) { if(d.width*d.height*4*(d.layers.filter(l=>l.type==='paint').length+d.layers.filter(l=>l.mask).length+extra)>MAX_BYTES/2)throw new Error('Layer memory budget exceeded'); }
export function effectiveLayer(l) { if(!l.mask)return l.canvas; const c=canvas(l.canvas.width,l.canvas.height),x=c.getContext('2d');x.drawImage(l.canvas,0,0);x.globalCompositeOperation='destination-in';x.drawImage(l.mask,0,0);return c; }
export function renderLayers(d,includeHidden=false) {
  const output=canvas(d.width,d.height), ctx=output.getContext('2d');
  const drawList=(items,target)=>{let base=null;for(const l of [...items].reverse()) {
    if(!l.visible&&!includeHidden)continue;
    let image;
    if(l.type==='group'){image=canvas(d.width,d.height);drawList(d.layers.filter(t=>t.parent===l.id),image.getContext('2d'));}
    else {image=effectiveLayer(l);if(l.clip){if(!base)continue;const clipped=canvas(d.width,d.height),cx=clipped.getContext('2d');cx.drawImage(image,0,0);cx.globalCompositeOperation='destination-in';cx.drawImage(base,0,0);image=clipped;}else{base=canvas(d.width,d.height);const bx=base.getContext('2d');bx.globalAlpha=l.opacity;bx.drawImage(image,0,0);}}
    target.save();target.globalAlpha=l.opacity;target.globalCompositeOperation=l.blend||'source-over';target.drawImage(image,0,0);target.restore();
  }};
  drawList(d.layers.filter(l=>!l.parent),ctx);return output;
}
export function composite(d,background=d.background) {const c=canvas(d.width,d.height),x=c.getContext('2d');if(background&&background!=='transparent'){x.fillStyle=background;x.fillRect(0,0,d.width,d.height);}x.drawImage(renderLayers(d),0,0);return c;}
export class History {
  constructor(limit=48*1024*1024){this.undoStack=[];this.redoStack=[];this.bytes=0;this.limit=limit;}
  push(undo,redo,bytes=512){this.redoStack=[];this.undoStack.push({undo,redo,bytes});this.bytes+=bytes;while(this.bytes>this.limit&&this.undoStack.length>1)this.bytes-=this.undoStack.shift().bytes;}
  undo(){const c=this.undoStack.pop();if(c){c.undo();this.bytes-=c.bytes;this.redoStack.push(c);return true;}return false;}
  redo(){const c=this.redoStack.pop();if(c){c.redo();this.undoStack.push(c);this.bytes+=c.bytes;return true;}return false;}
  clear(){this.undoStack=[];this.redoStack=[];this.bytes=0;}
}
export function floodFill(image,x,y,color,tolerance=24) {
  const {width:w,height:h,data:a}=image,start=(y*w+x)*4,old=Array.from(a.slice(start,start+4));if(old.every((v,i)=>v===color[i]))return;
  const seen=new Uint8Array(w*h),stack=[y*w+x];
  const match=i=>Math.abs(a[i]-old[0])+Math.abs(a[i+1]-old[1])+Math.abs(a[i+2]-old[2])+Math.abs(a[i+3]-old[3])<=tolerance*4;
  while(stack.length){const p=stack.pop();if(seen[p])continue;seen[p]=1;const i=p*4;if(!match(i))continue;a.set(color,i);const px=p%w;if(px>0)stack.push(p-1);if(px<w-1)stack.push(p+1);if(p>=w)stack.push(p-w);if(p<w*(h-1))stack.push(p+w);}
}
