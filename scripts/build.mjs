import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');for(const path of ['index.html','app','icons','manifest.webmanifest','sw.js'])await cp(path,`dist/${path}`,{recursive:true});console.log('Static app built in dist/');
