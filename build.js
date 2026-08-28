const fs = require('fs');
const path = require('path');

const root = process.cwd();
const src = path.join(root, 'index.html');
const out = path.join(root, 'public');
let html = fs.readFileSync(src, 'utf8');

const marker = '/* ORGANIZER_AI_COMMANDS_V2 */';
if (!html.includes(marker)) {
  const code = String.raw`<script>
${marker}
(function(){
  function todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function safeEsc(v){if(typeof esc==='function')return esc(v);return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function apply(actions){
    (actions||[]).forEach(a=>{
      if(!a||!a.type)return;
      if(a.type==='add_reminder'&&a.name&&a.date)data.plans.push({name:String(a.name),date:String(a.date),time:String(a.time||''),reminder:true});
      else if(a.type==='delete_reminder'&&a.query){const q=String(a.query).toLowerCase(),i=data.plans.findIndex(p=>String(p.name||'').toLowerCase().includes(q));if(i>=0)data.plans.splice(i,1);}
      else if(a.type==='add_bill'&&a.name&&Number.isFinite(Number(a.amount)))data.bills.push({name:String(a.name),amount:Number(a.amount),date:String(a.date||''),freq:String(a.freq||'Monthly')});
      else if(a.type==='add_pay'&&Number.isFinite(Number(a.amount)))data.pays.unshift({amount:Number(a.amount),date:String(a.date||todayKey())});
      else if(a.type==='add_note'&&a.text)data.us.push({cat:'Notes',title:String(a.title||'Note'),text:String(a.text),date:new Date().toLocaleDateString()});
      else if(a.type==='add_recipe'&&a.name)data.recipes.push({name:String(a.name),link:String(a.link||''),notes:String(a.notes||''),date:new Date().toLocaleDateString(),source:'AI Command'});
      else if(a.type==='save_capture')data.captures.push({title:String(a.title||'Unsorted capture'),category:String(a.category||'other'),summary:String(a.summary||''),suggestedDestination:String(a.suggestedDestination||'Inbox'),text:String(a.text||''),image:'',date:new Date().toLocaleDateString(),source:'AI Command'});
    });
    if(typeof save==='function')save(); else localStorage.setItem('our_app_data_v1',JSON.stringify(data));
    if(typeof render==='function')render();
  }
  async function executeCommand(v,status){
    status.style.display='block';status.innerHTML='<b>OUR AI</b><div>Understanding your request…</div>';
    try{
      const r=await fetch('/api/organizer-command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v,data,today:todayKey()})});
      const out=await r.json();if(!r.ok)throw new Error(out.error||'Command failed');
      if(!out.actions?.length){status.innerHTML='<b>Need a little more information</b><div>'+safeEsc(out.reply||'Please clarify what you want me to do.')+'</div>';return;}
      apply(out.actions);closeModal();if(typeof show==='function')show('plan');setTimeout(()=>alert(out.reply||'Done.'),50);
    }catch(e){status.innerHTML='<b>Could not complete that</b><div>'+safeEsc(e.message||'Please try again.')+'</div>';}
  }
  function openCommand(){
    openModal('Tell OUR what to do','<div class="small">Type a normal request and OUR will actually perform it.</div><textarea id="commandText" rows="4" placeholder="Example: Add call wife to my calendar tomorrow at 4:30 pm"></textarea><div id="commandStatus" class="ai-preview" style="display:none"></div>',async function(){
      const el=document.getElementById('commandText'),status=document.getElementById('commandStatus'),v=String(el?.value||'').trim();
      if(!v)return alert('Tell me what you want me to do.');
      await executeCommand(v,status);
    });
  }
  /* Intercept the existing Quick Capture Save button in capture mode. This runs in capture phase so the old save handler cannot also save the command as a note. */
  document.addEventListener('click',function(ev){
    const btn=ev.target&&ev.target.closest?ev.target.closest('#modalSave'):null;
    if(!btn)return;
    const title=document.getElementById('modalTitle');
    if(!title||title.textContent.trim().toLowerCase()!=='quick capture')return;
    const body=document.getElementById('modalBody');
    const text=body?.querySelector('textarea')?.value?.trim()||'';
    if(!text)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const status=document.getElementById('commandStatus')||(()=>{const d=document.createElement('div');d.id='commandStatus';d.className='ai-preview';body?.appendChild(d);return d})();
    executeCommand(text,status);
  },true);
  window.openCommand=openCommand;
  window.openCapture=openCommand;
  function wire(){const q=document.getElementById('quickCaptureCard'),f=document.getElementById('fab');if(q)q.onclick=openCommand;if(f)f.onclick=openCommand;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
</script>
`;
  const bodyIndex = html.toLowerCase().lastIndexOf('</body>');
  if (bodyIndex === -1) throw new Error('Could not find closing body tag in index.html');
  html = html.slice(0, bodyIndex) + code + html.slice(bodyIndex);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(src, path.join(out, 'index.html'));
for (const name of ['manifest.webmanifest', 'sw.js']) {
  const p = path.join(root, name);
  if (fs.existsSync(p)) fs.copyFileSync(p, path.join(out, name));
}
console.log('Build complete: AI organizer commands enabled');
