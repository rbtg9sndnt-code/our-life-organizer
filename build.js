const fs=require('fs'),path=require('path');
const root=process.cwd(),src=path.join(root,'app.html'),out=path.join(root,'public');
if(!fs.existsSync(src))throw new Error('Missing app.html');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
fs.copyFileSync(src,path.join(out,'index.html'));
for(const name of ['manifest.webmanifest','sw.js']){
  const p=path.join(root,name);
  if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,name));
}
console.log('Build complete: stable organizer app');
