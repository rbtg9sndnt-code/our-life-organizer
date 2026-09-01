/* QUICK_CAPTURE_LINKS_V3 */
(function(){
  const readImage = file => new Promise((resolve,reject)=>{
    if(!file || !file.type.startsWith('image/')) return resolve('');
    const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);
  });
  const escQC = v => String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]||m));

  function installCurrentCapture(){
    if(typeof window.capture!=='function' || window.__qcV3) return false;
    window.__qcV3=true;
    window.capture=function(){
      modal('Quick Capture','<div class="small">Throw anything in here. Paste a TikTok recipe, link, note, reminder, screenshot, photo or video. AI will put it in the right area instead of just saving the link.</div><textarea id="ct" rows="5" placeholder="Paste a TikTok recipe, type a reminder, add a note, or throw anything in…"></textarea><input id="cf" type="file" accept="image/*,video/*"><div id="cp" class="capture-preview"></div><div id="ca" class="ai-preview"></div>',async()=>{
        const text=$('ct').value.trim(),file=$('cf').files[0];
        if(!text&&!file)return alert('Add a note, link, screenshot, photo or video first.');
        const btn=$('save');if(btn){btn.disabled=true;btn.textContent='AI is organizing…';}
        const status=$('ca');if(status){status.style.display='block';status.innerHTML='<b>AI is organizing it…</b><div class="small">Checking the link and deciding where it belongs.</div>';}
        try{
          const image=await readImage(file);
          if(typeof runOrganizer==='function'){
            await runOrganizer(text,image,true);
            return;
          }
          throw new Error('Organizer AI is not available.');
        }catch(e){
          if(status){status.style.display='block';status.innerHTML='<b>Saved safely.</b><div class="small">AI could not organize this capture: '+escQC(e.message||'Please try again.')+'</div>';}
          if(typeof data!=='undefined'){
            if(!Array.isArray(data.captures))data.captures=[];
            data.captures.unshift({title:text.slice(0,80)||'Unsorted capture',category:'other',summary:'Saved from Quick Capture.',suggestedDestination:'Inbox',text,image,date:new Date().toLocaleDateString(),source:'Quick Capture'});
            if(typeof save==='function')save();
          }
        }finally{if(btn){btn.disabled=false;btn.textContent='Save';}}
      });
      setTimeout(()=>{
        const f=$('cf');if(!f)return;
        f.onchange=async()=>{
          const file=f.files?.[0],p=$('cp');if(!file||!p)return;
          p.style.display='block';
          if(file.type.startsWith('image/')){const image=await readImage(file);p.innerHTML='<img src="'+escQC(image)+'">';}
          else p.innerHTML='<div class="card">Video attached. The link/note can still be organized even if the video itself cannot be read.</div>';
        };
      },0);
    };
    return true;
  }

  function installLegacyCapture(){
    if(typeof window.openCapture!=='function' || window.__qcLegacy) return false;
    window.__qcLegacy=true;
    window.openCapture=function(){
      openModal('Quick Capture','<div class="small">Throw anything in here. Paste a TikTok recipe, link, note, reminder, screenshot, photo or video. AI will put it in the right area.</div><textarea id="captureText" rows="4" placeholder="Paste a TikTok recipe, type a reminder, add a note, or throw anything in…"></textarea><input id="captureFile" type="file" accept="image/*,video/*"><div id="capturePreview" class="capture-preview"></div><div id="captureAi" class="ai-preview" style="display:none"></div>',async()=>{
        const text=$('captureText').value.trim(),file=$('captureFile').files[0];
        if(!text&&!file)return alert('Add a note, link, screenshot, photo or video first.');
        const image=await readImage(file);
        const res=await fetch('/api/organizer-command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,image,today:typeof todayLocal==='function'?todayLocal():new Date().toISOString().slice(0,10),data})});
        const out=await res.json();
        if(!res.ok)throw new Error(out.error||'AI could not organize this capture.');
        if(typeof applyActions==='function')applyActions(out.actions||[]);
        else if(typeof data!=='undefined'){if(!Array.isArray(data.captures))data.captures=[];data.captures.unshift({title:text.slice(0,80)||'Unsorted capture',category:'other',summary:out.reply||'',suggestedDestination:'Inbox',text,image,date:new Date().toLocaleDateString(),source:'Quick Capture'});}
        closeModal();if(typeof save==='function')save();
      });
      setTimeout(()=>{const f=$('captureFile');if(f)f.onchange=async()=>{const file=f.files?.[0],p=$('capturePreview');if(!file||!p)return;p.style.display='block';if(file.type.startsWith('image/')){const image=await readImage(file);p.innerHTML='<img src="'+escQC(image)+'">';}else p.innerHTML='<div class="card">Video attached.</div>';};},0);
    };
    return true;
  }

  installCurrentCapture()||installLegacyCapture();
})();
