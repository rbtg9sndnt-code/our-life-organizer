const fs=require('fs'),path=require('path');
const root=process.cwd(),src=path.join(root,'app.html'),out=path.join(root,'public');
if(!fs.existsSync(src))throw new Error('Missing app.html');
let html=fs.readFileSync(src,'utf8');
// The recipes view and its list must have different ids.
html=html.replace('id="recipes" class="card list"','id="recipeList" class="card list"');
html=html.replaceAll("$('recipes')","$('recipeList')");
// Add robust recipe and Quick Capture workflows after the existing app script so they can safely reuse the app's localStorage, modal, save, and navigation functions.
for(const name of ['recipe-enhancements.js','quick-capture-enhancements.js']){
  const enhancementPath=path.join(root,name);
  if(fs.existsSync(enhancementPath)){
    const enhancement=fs.readFileSync(enhancementPath,'utf8');
    html=html.replace('</body>',`<script>\n${enhancement}\n</script>\n</body>`);
  }
}
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),html);
for(const name of ['manifest.webmanifest','sw.js']){
  const p=path.join(root,name);
  if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,name));
}
console.log('Build complete: stable organizer app with enhanced recipe and Quick Capture workflows');
