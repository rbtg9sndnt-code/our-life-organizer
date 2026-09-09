(() => {
  const style = document.createElement('style');
  style.textContent = `
    .bill-paid-btn{border:1px solid #ffffff18;background:#242428;color:#fff;border-radius:10px;padding:7px 12px;font-size:12px;font-weight:750;cursor:pointer}
    .bill-paid-btn.is-paid{border-color:#36c98a55;color:#5de0a3;background:#14251e}
    .monthly-bill-paid{opacity:.72}
    .monthly-bill-paid .bill-name{text-decoration:line-through}
    .bill-fund-progress{height:10px;background:#25252a;border-radius:999px;overflow:hidden;margin-top:8px}
    .bill-fund-progress>div{height:100%;background:#ff2028;border-radius:999px;transition:width .25s ease}
    .bill-fund-percent{text-align:right;font-size:12px;color:#aaa;margin-top:5px}
    .bill-fund-stat .small{margin-bottom:3px}
  `;
  document.head.appendChild(style);

  function billMonth(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
  function billPaid(bill){return !!bill&&bill.paidMonth===billMonth()}
  function paidTotal(){const m=billMonth();return (data.bills||[]).reduce((s,b)=>s+(b.paidMonth===m?Number(b.amount||0):0),0)}

  window.toggleBillPaid=function(i){
    const bill=data.bills[i]; if(!bill)return;
    const amount=Number(bill.amount||0);
    if(billPaid(bill)){
      delete bill.paidMonth;
      data.billAccount=Number(data.billAccount||0)+amount;
    }else{
      if(Number(data.billAccount||0)<amount){alert('Not enough money in your Bill Fund to pay this bill. Add money to the Bill Fund first.');return;}
      bill.paidMonth=billMonth();
      data.billAccount=Math.max(0,Number(data.billAccount||0)-amount);
    }
    save();
  };

  function redesignMoney(){
    const moneyView=document.getElementById('money'),safe=document.getElementById('safeCard');
    if(!moneyView||!safe)return;
    safe.style.display='none';
    const topGrid=safe.nextElementSibling;
    if(topGrid&&topGrid.classList.contains('grid'))topGrid.style.display='none';
    const heading=Array.from(moneyView.querySelectorAll('.section')).find(x=>x.textContent.trim()==='BILL FUND');
    if(!heading)return;
    const card=heading.nextElementSibling;
    if(!card||card.dataset.billFundRedesigned==='1')return;
    card.dataset.billFundRedesigned='1';
    card.innerHTML=`
      <div class="bill-fund-stat"><div class="small">PUT AWAY FOR BILLS</div><div id="billFund" class="money">$0.00</div></div>
      <div class="grid" style="margin-top:10px"><button class="btn" id="addFund">＋ Add money</button><button class="btn dark" id="removeFund">− Remove</button></div>
      <div class="grid" style="margin-top:14px">
        <div class="bill-fund-stat"><div class="small">MONTHLY BILLS</div><b id="monthly">$0.00</b></div>
        <div class="bill-fund-stat"><div class="small">BILLS REMAINING</div><b id="stillNeeded">$0.00</b></div>
      </div>
      <div style="margin-top:14px"><div class="small">BILLS COVERED</div><div class="bill-fund-progress"><div id="billProgress"></div></div><div id="billPercent" class="bill-fund-percent">0% covered</div></div>
    `;
    $('addFund').onclick=()=>{modal('Add money to Bill Fund','<input id="fundAmt" type="number" min="0" step="0.01" placeholder="Amount">',()=>{const n=Number($('fundAmt').value||0);if(n>0){data.billAccount=Number(data.billAccount||0)+n;data.billTransactions.push({amount:n,direction:'add',date:new Date().toLocaleDateString()});closeModal();save()}})};
    $('removeFund').onclick=()=>{modal('Remove money from Bill Fund','<input id="fundAmt" type="number" min="0" step="0.01" placeholder="Amount">',()=>{const n=Number($('fundAmt').value||0);if(n>0){data.billAccount=Math.max(0,Number(data.billAccount||0)-n);data.billTransactions.push({amount:n,direction:'remove',date:new Date().toLocaleDateString()});closeModal();save()}})};
  }

  window.renderMonthlyBillPaid=function(){
    redesignMoney();
    const list=document.getElementById('bills'); if(!list||!Array.isArray(data.bills))return;
    const total=data.bills.reduce((s,b)=>s+Number(b.amount||0),0),paid=paidTotal(),remaining=Math.max(0,total-paid),fund=Number(data.billAccount||0);
    const covered=total>0?Math.min(100,Math.round(((paid+fund)/total)*100)):0;
    const f=$('billFund'),m=$('monthly'),r=$('stillNeeded'),p=$('billProgress'),pc=$('billPercent');
    if(f)f.textContent=money(fund); if(m)m.textContent=money(total); if(r)r.textContent=money(remaining); if(p)p.style.width=covered+'%'; if(pc)pc.textContent=covered+'% covered';
    list.querySelectorAll('.item').forEach((item,i)=>{
      const bill=data.bills[i];if(!bill)return;const isPaid=billPaid(bill);item.classList.toggle('monthly-bill-paid',isPaid);
      let actions=item.querySelector('.crud-actions,.actions');if(!actions){actions=document.createElement('div');actions.className='actions';item.appendChild(actions)}
      let button=actions.querySelector('.bill-paid-btn');if(!button){button=document.createElement('button');button.type='button';button.className='bill-paid-btn';actions.insertBefore(button,actions.firstChild)}
      button.classList.toggle('is-paid',isPaid);button.textContent=isPaid?'✓ Paid':'Pay';button.onclick=e=>{e.stopPropagation();window.toggleBillPaid(i)};
    });
  };
  const originalRender=window.render;
  if(typeof originalRender==='function'&&!window.__billPaidRenderWrapped){window.render=function(){originalRender();window.renderMonthlyBillPaid()};window.__billPaidRenderWrapped=true}
  window.renderMonthlyBillPaid();
})();
