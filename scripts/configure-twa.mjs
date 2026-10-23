import {writeFile,mkdir} from 'node:fs/promises';
const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
if(!args.includes('--origin')||!args.includes('--fingerprint')){
 console.error('Usage: node scripts/configure-twa.mjs --origin https://paint.example.com --fingerprint AA:BB:... [--package app.mypaint.android]');process.exit(1);
}
const url=new URL(value('--origin')),packageName=args.includes('--package')?value('--package'):'app.mypaint.android',fingerprint=value('--fingerprint').toUpperCase();
if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Use an HTTPS origin with control of /.well-known/assetlinks.json, without a path');
if(!/^[a-z][\w]*(\.[a-z][\w]*){2,}$/.test(packageName))throw Error('Invalid Android package name');
if(!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint))throw Error('Expected a SHA-256 certificate fingerprint (32 colon-separated bytes)');
await mkdir('twa/generated',{recursive:true});
await writeFile('twa/generated/assetlinks.json',JSON.stringify([{relation:['delegate_permission/common.handle_all_urls'],target:{namespace:'android_app',package_name:packageName,sha256_cert_fingerprints:[fingerprint]}}],null,2)+'\n');
await writeFile('twa/generated/site.json',JSON.stringify({origin:url.origin,manifest:`${url.origin}/manifest.webmanifest`,packageName},null,2)+'\n');
console.log('Generated twa/generated/assetlinks.json and site.json. Publish assetlinks at the origin root; then initialize Bubblewrap with this site manifest.');
