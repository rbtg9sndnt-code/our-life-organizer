const fs = require('fs');
const path = require('path');

const root = process.cwd();
const file = path.join(root, 'index.html');
let html = fs.readFileSync(file, 'utf8');

const billMarker = '/* BILL_FUND_CHAT_COMMANDS_V1 */';
if (!html.includes(billMarker)) {
  const code = String.raw`
${billMarker}
(function(){
  const originalChat = chat;
  function billCommandAmount(message){
    const m = String(message || '').match(/\b(?:add|put|set\s+aside)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\$?\s*(?:to|into|in)\s+(?:my\s+)?(?:bill\s+fund|bill\s+account|bills?\s+fund)\b/i);
    return m ? Number(String(m[1]).replace(/,/g,'')) : null;
  }
  chat = async function(messageOverride){
    const input = document.getElementById('chatInput');
    const v = String(messageOverride || input.value || '').trim();
    if(!v)return;
    const amount = billCommandAmount(v);
    if(amount !== null && Number.isFinite(amount) && amount > 0){
      data.billAccount = Number(data.billAccount || 0) + amount;
      if(!Array.isArray(data.billTransactions)) data.billTransactions = [];
      data.billTransactions.push({type:'add',amount,date:new Date().toLocaleDateString(),note:v});
      const chatBox = document.getElementById('chat');
      chatBox.innerHTML += '<div class="item"><b>You</b><div>'+escapeHtml(v)+'</div></div>';
      chatBox.innerHTML += '<div class="item"><b>OUR AI</b><div>Done — I added '+money(amount)+' to your Bill Fund. Your Bill Fund is now '+money(data.billAccount)+'.</div></div>';
      input.value='';
      save();
      show('money');
      return;
    }
    return originalChat(messageOverride);
  };
})();
`;
  const end = '</script></body></html>';
  if (!html.includes(end)) throw new Error('Could not find end of index.html');
  html = html.replace(end, code + end);
}

const calendarMarker = '/* FULL_YEAR_CALENDAR_V1 */';
if (!html.includes(calendarMarker)) {
  const code = String.raw`
${calendarMarker}
(function(){
  const style=document.createElement('style');
  style.textContent=\`
    .calendar-launch{cursor:pointer;position:relative}.calendar-launch:active{opacity:.75}
    .calendar-icon{width:43px;height:43px;border-radius:14px;background:#1b1b1f;border:1px solid #ff202826;display:grid;place-items:center;color:#ff2028;font-size:20px;flex:none}
    .calendar-card-title{font-size:18px;font-weight:800}.calendar-year-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
    .calendar-month{background:#151518;border:1px solid #ffffff10;border-radius:16px;padding:11px}.calendar-month h3{font-size:14px;margin:0 0 8px;text-align:center}
    .calendar-week{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}.calendar-week span{font-size:8px;color:#777;text-align:center;font-weight:800}
    .calendar-days{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:3px}.calendar-day{min-height:25px;border:0;background:transparent;color:#ddd;border-radius:6px;font-size:10px;padding:0;position:relative}
    .calendar-day.has-reminder{background:#222227;color:#fff;font-weight:800}.calendar-day.today{outline:1px solid #ff2028;background:#1d1113;color:#ff6268}.calendar-day.has-reminder:after{content:'';width:4px;height:4px;border-radius:50%;background:#ff2028;position:absolute;right:2px;bottom:2px}
    .calendar-detail{margin-top:14px}.calendar-reminder{padding:11px 0;border-bottom:1px solid #ffffff10}.calendar-reminder:last-child{border-bottom:0}
    .calendar-actions{display:flex;gap:8px;margin-top:10px}.calendar-actions .btn{flex:1}.calendar-muted{color:#92929b;font-size:12px}
    @media(max-width:390px){.calendar-year-grid{gap:7px}.calendar-month{padding:8px}.calendar-day{min-height:23px;font-size:9px}}
  \`;
  document.head.appendChild(style);

  const pad=n=>String(n).padStart(2,'0');
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const dateFromKey=k=>{const a=String(k).split('-').map(Number);return new Date(a[0],a[1]-1,a[2])};
  const escape=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'');
  const plans=()=>Array.isArray(data.plans)?data.plans:[];
  const remindersFor=k=>plans().filter(p=>p.date===k);
  const formatDate=k=>dateFromKey(k).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  function ensureHomeCalendar(){
    const today=document.getElementById('todayCard');
    if(!today||document.getElementById('homeCalendarCard'))return;
    const label=document.createElement('div');label.className='section';label.textContent='CALENDAR';
    const card=document.createElement('div');card.id='homeCalendarCard';card.className='card calendar-launch';
    card.innerHTML='<div class="row"><div class="calendar-icon">▣</div><div class="grow"><div class="calendar-card-title">Calendar</div><div class="small">Tap to see the whole year & add reminders</div></div><span style="font-size:25px">›</span></div>';
    card.onclick=openCalendar;
    today.after(label,card);
  }

  function renderHomeDays(){
    const card=document.getElementById('todayCard');if(!card)return;
    const start=new Date();start.setHours(0,0,0,0);
    card.innerHTML=[0,1,2].map((offset)=>{const d=new Date(start);d.setDate(start.getDate()+offset);const k=key(d);const rs=remindersFor(k);const name=offset===0?'TODAY':d.toLocaleDateString(undefined,{weekday:'short'}).toUpperCase();return '<button class="day-column '+(offset===0?'today':'')+'" onclick="openDay(\''+k+'\')"><div class="day-name">'+name+'</div><div class="day-number">'+d.getDate()+'</div>'+(rs.length?'<div class="day-items">'+rs.slice(0,3).map(r=>'<div class="day-item">'+escape(r.name||'Reminder')+'</div>').join('')+(rs.length>3?'<div class="day-more">+'+(rs.length-3)+' more</div>':'')+'</div>':'<div class="day-empty">Nothing planned</div>')+'</button>'}).join('');
  }

  function monthHtml(year,month){
    const first=new Date(year,month,1),last=new Date(year,month+1,0),start=(first.getDay()+6)%7;
    let s='<div class="calendar-month"><h3>'+first.toLocaleDateString(undefined,{month:'long'})+'</h3><div class="calendar-week">'+['M','T','W','T','F','S','S'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="calendar-days">';
    for(let i=0;i<start;i++)s+='<span></span>';
    for(let day=1;day<=last.getDate();day++){const d=new Date(year,month,day),k=key(d),rs=remindersFor(k),today=k===key(new Date());s+='<button class="calendar-day '+(rs.length?'has-reminder ':'')+(today?'today':'')+'" onclick="openDay(\''+k+'\')">'+day+'</button>'}
    return s+'</div></div>';
  }

  function openCalendar(){
    let modal=document.getElementById('calendarModal');
    if(!modal){modal=document.createElement('div');modal.id='calendarModal';modal.className='modal';document.body.appendChild(modal)}
    const year=new Date().getFullYear();
    modal.innerHTML='<div class="sheet"><button class="close" onclick="closeCalendar()">×</button><h2>Calendar</h2><div class="small">'+year+' — tap any day to add, edit or delete reminders.</div><button class="btn full" onclick="enableReminderNotifications()">🔔 Enable reminder notifications</button><div class="calendar-year-grid">'+Array.from({length:12},(_,m)=>monthHtml(year,m)).join('')+'</div></div>';
    modal.classList.add('open');
  }
  window.openCalendar=openCalendar;
  window.closeCalendar=function(){const m=document.getElementById('calendarModal');if(m)m.classList.remove('open')};

  function openDay(k){
    let modal=document.getElementById('calendarModal');if(!modal){openCalendar();modal=document.getElementById('calendarModal')}
    const rs=remindersFor(k);
    modal.innerHTML='<div class="sheet"><button class="close" onclick="openCalendar()">×</button><h2>'+formatDate(k)+'</h2><div class="calendar-actions"><button class="btn" onclick="addCalendarReminder(\''+k+'\')">＋ Add reminder</button><button class="btn dark" onclick="openCalendar()">Year</button></div><div class="calendar-detail">'+(rs.length?rs.map((r,i)=>{const real=plans().indexOf(r);return '<div class="calendar-reminder"><div class="row"><div class="grow"><b>'+escape(r.name||'Reminder')+'</b><div class="calendar-muted">'+escape(r.time||'No time set')+'</div></div></div><div class="crud-actions"><button type="button" class="crud-btn" onclick="openCalendar();setTimeout(function(){crudEditPlan('+real+')},0)">Edit</button><button type="button" class="crud-btn delete" onclick="crudDelete(\'plan\','+real+');openDay(\''+k+'\')">Delete</button></div></div>'}).join(''):'<div class="empty">Nothing planned for this day.</div>')+'</div></div>';
    modal.classList.add('open');
  }
  window.openDay=openDay;

  window.addCalendarReminder=function(k){
    window._calendarReminderKey=k;window._saveCalendarReminder=true;
    openModal('Add Reminder','<input id="calName" placeholder="What do you need to remember?"><input id="calDate" type="date" value="'+k+'"><input id="calTime" type="time"><div class="small">Notifications require permission from your browser. The reminder is also saved in your calendar.</div>');
  };

  const oldFinishSpecial=finishSpecial;
  finishSpecial=function(){
    if(window._saveCalendarReminder){const name=document.getElementById('calName').value.trim();const date=document.getElementById('calDate').value||window._calendarReminderKey;const time=document.getElementById('calTime').value||'';if(name)data.plans.push({name,date,time,reminder:true});window._saveCalendarReminder=false;window._calendarReminderKey=null;closeModal();save();if(name)scheduleReminder(data.plans[data.plans.length-1]);openDay(date);return}oldFinishSpecial();
  };

  function scheduleReminder(r){
    if(!r||!r.date)return;const when=new Date(r.date+'T'+(r.time||'09:00'));const delay=when.getTime()-Date.now();if(delay<=0)return;
    const fire=()=>{if('Notification' in window&&Notification.permission==='granted')new Notification('OUR reminder',{body:r.name||'You have a reminder.'});else alert('Reminder: '+(r.name||'You have a reminder.'))};
    const wait=Math.min(delay,2147480000);setTimeout(()=>{if(delay>wait)scheduleReminder(r);else fire()},wait);
  }
  function scheduleSaved(){plans().forEach(scheduleReminder)}
  window.enableReminderNotifications=async function(){if(!('Notification' in window)){alert('This browser does not support notifications. Your reminders will still be saved in the calendar.');return}try{const p=await Notification.requestPermission();if(p==='granted'){alert('Notifications are enabled. Keep the app open for scheduled local reminders.');scheduleSaved()}else alert('Notifications were not enabled. Your reminders are still saved.')}catch(e){alert('Notification permission could not be requested here.')}};

  const oldRenderThreeDays=window.renderThreeDays;
  window.renderThreeDays=function(){renderHomeDays();const my=document.getElementById('monthYear');if(my)my.textContent=new Date().toLocaleDateString(undefined,{month:'long',year:'numeric'}).toUpperCase()};
  const oldRender=window.render;
  if(typeof oldRender==='function')window.render=function(){oldRender();ensureHomeCalendar();renderHomeDays()};
  ensureHomeCalendar();renderHomeDays();scheduleSaved();
})();
`;
  const end = '</script></body></html>';
  if (!html.includes(end)) throw new Error('Could not find end of index.html');
  html = html.replace(end, code + end);
}

const out = path.join(root, 'public');
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out, {recursive:true});
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
for (const name of ['manifest.webmanifest', 'sw.js']) {
  const src = path.join(root, name);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, name));
}
console.log('Build patches applied: Bill Fund commands + full-year calendar/reminders');
