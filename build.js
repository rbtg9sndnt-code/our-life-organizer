const fs=require('fs'),path=require('path');
const root=process.cwd(),src=path.join(root,'index.html'),out=path.join(root,'public');
let html=fs.readFileSync(src,'utf8');
const marker='/* ORGANIZER_AI_COMMANDS_V1 */';
if(!html.includes(marker)){
const code=String.raw`<script>
${marker}
(function(){
  function todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function apply(actions){
    if(!Array.isArray(actions))return;
    actions.forEach(a=>{
      if(!a||!a.type)return;
      if(a.type==='add_reminder'&&a.name&&a.date){data.plans.push({name:String(a.name),date:String(a.date),time:String(a.time||''),reminder:true});}
      else if(a.type==='delete_reminder'&&a.query){const q=String(a.query).toLowerCase();const i=data.plans.findIndex(p=>String(p.name||'').toLowerCase().includes(q));if(i>=0)data.plans.splice(i,1);}
      else if(a.type==='add_bill'&&a.name&&Number.isFinite(Number(a.amount))){data.bills.push({name:String(a.name),amount:Number(a.amount),date:String(a.date||''),freq:String(a.freq||'Monthly')});}
      else if(a.type==='add_pay'&&Number.isFinite(Number(a.amount))){data.pays.unshift({amount:Number(a.amount),date:String(a.date||todayKey())});}
      else if(a.type==='add_note'&&a.text){data.us.push({cat:'Notes',title:String(a.title||'Note'),text:String(a.text),date:new Date().toLocaleDateString()});}
      else if(a.type==='add_recipe'&&a.name){data.recipes.push({name:String(a.name),link:String(a.link||''),notes:String(a.notes||''),date:new Date().toLocaleDateString(),source:'AI Command'});}
      else if(a.type==='save_capture'){data.captures.push({title:String(a.title||'Unsorted capture'),category:String(a.category||'other'),summary:String(a.summary||''),suggestedDestination:String(a.suggestedDestination||'Inbox'),text:String(a.text||''),image:'',date:new Date().toLocaleDateString(),source:'AI Command'});}
    });
    localStorage.setItem('our_app_data_v1',JSON.stringify(data));render();
  }
  function openCommand(){
    openModal('Tell OUR what to do','<div class="small">Type a normal request. OUR will understand it and perform the action for you.</div><textarea id="commandText" rows="4" placeholder="Example: Add call wife to my calendar tomorrow at 4:30 pm"></textarea><div id="commandStatus" class="ai-preview" style="display:none"></div>',async function(){
      const input=document.getElementById('commandText'),status=document.getElementById('commandStatus'),v=String(input?.value||'').trim();if(!v)return alert('Tell me what you want me to do.');
      status.style.display='block';status.innerHTML='<b>OUR AI</b><div>Understanding your request…</div>';
      try{const r=await fetch('/api/organizer-command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v,data,today:todayKey()})});const out=await r.json();if(!r.ok)throw new Error(out.error||'Command failed');
        if(!out.actions?.length){status.innerHTML='<b>Need a little more information</b><div>'+escapeHtml(out.reply||'Please clarify what you want me to do.')+'</div>';return;}
        apply(out.actions);closeModal();show('plan');
        setTimeout(()=>alert(out.reply||'Done.'),50);
      }catch(e){status.innerHTML='<b>Could not complete that</b><div>'+escapeHtml(e.message||'Please try again.')+'</div>';}
    });
  }
  window.openCommand=openCommand;
  window.openCapture=openCommand;
  document.addEventListener('DOMContentLoaded',function(){
    const q=document.getElementById('quickCaptureCard'),f=document.getElementById('fab');if(q)q.onclick=openCommand;if(f)f.onclick=openCommand;
  });
})();
</script>`;
const end='</script></body></html>';
if(!html.includes(end))throw new Error('Could not find end of index.html');
html=html.replace(end,code+end);
}
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);for(const n of ['manifest.webmanifest','sw.js']){const p=path.join(root,n);if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,n));}
console.log('Build complete: AI organizer commands enabled');
