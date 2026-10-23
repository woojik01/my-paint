import {encodePSD,encodeGIF} from './binary.js';
self.onmessage=({data:d})=>{try{const output=d.format==='psd'?encodePSD(d.width,d.height,d.layers,d.rgba):encodeGIF(d.width,d.height,d.rgba);self.postMessage({output},[output.buffer]);}catch(e){self.postMessage({error:e.message});}};
