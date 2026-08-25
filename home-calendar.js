(function(){
  function pad(n){return String(n).padStart(2,'0')}
  function key(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function dayLabel(d){return d.toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}
  function renderThreeDay(){
    const card=document.getElementById('todayCard');
    if(!card || !window.data) return;
    const start=new Date(); start.setHours(0,0,0,0);
    const days=[0,1,2].map(i=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
    card.innerHTML='<div class="three-day-calendar">'+days.map((d,i)=>{
      const k=key(d);
      const plans=(window.data.plans||[]).filter(p=>p.date===k);
      return '<button class="day-column '+(i===0?'today':'')+'" onclick="show(\\'plan\\')">'
        +'<div class="day-name">'+dayLabel(d)+'</div>'
        +'<div class="day-number">'+d.getDate()+'</div>'
        +(plans.length
          ? '<div class="day-items">'+plans.slice(0,3).map(p=>'<div class="day-item">'+escapeHtml(p.text)+'</div>').join('')+(plans.length>3?'<div class="day-more">+'+(plans.length-3)+' more</div>':'')+'</div>'
          : '<div class="day-empty">Nothing planned</div>')
        +'</button>';
    }).join('')+'</div>';
  }
  const style=document.createElement('style');
  style.textContent='.three-day-calendar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.day-column{appearance:none;border:1px solid #ffffff10;background:#17171b;color:#fff;border-radius:15px;padding:11px 7px;min-width:0;text-align:left}.day-column.today{border-color:#ff202855;background:#1d1113}.day-name{font-size:11px;font-weight:850;letter-spacing:.08em;color:#aaa;text-align:center}.day-column.today .day-name{color:#ff6268}.day-number{font-size:25px;font-weight:850;text-align:center;margin:3px 0 9px}.day-items{min-height:48px}.day-item{font-size:11px;line-height:1.25;background:#222227;border-radius:8px;padding:6px;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.day-more{font-size:10px;color:#999;margin-top:5px;text-align:center}.day-empty{font-size:10px;color:#777;text-align:center;line-height:1.25;min-height:48px;display:grid;place-items:center}.day-column:active{transform:scale(.98)}';
  document.head.appendChild(style);
  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(){baseRender();renderThreeDay()};
  }
  renderThreeDay();
})();