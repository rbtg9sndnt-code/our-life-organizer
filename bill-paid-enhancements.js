(() => {
  const style = document.createElement('style');
  style.textContent = `.monthly-bill-paid{opacity:.72}.monthly-bill-paid .bill-name{text-decoration:line-through}.bill-paid-btn{border:1px solid #ffffff18;background:#222227;color:#fff;border-radius:10px;padding:7px 10px;font-size:12px;font-weight:750}.bill-paid-btn.is-paid{border-color:#36c98a55;color:#5de0a3;background:#14251e}.bill-status{font-size:12px;color:#92929b;margin-top:5px}.bill-summary{display:flex;justify-content:space-between;gap:12px;margin:0 0 10px;padding:10px 12px;border-radius:12px;background:#19191d}.bill-summary b{font-size:15px}`;
  document.head.appendChild(style);

  function billMonth(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }
  function billPaid(x){ return x && x.paidMonth === billMonth(); }

  window.toggleBillPaid = function(i){
    const x = data.bills[i];
    if (!x) return;
    if (billPaid(x)) delete x.paidMonth;
    else x.paidMonth = billMonth();
    save();
  };

  window.renderMonthlyBillPaid = function(){
    const list = document.getElementById('billList');
    if (!list) return;
    const month = billMonth();
    let paidTotal = 0, unpaidTotal = 0;
    data.bills.forEach(x => {
      const amount = Number(x.amount || 0);
      if (x.paidMonth === month) paidTotal += amount;
      else unpaidTotal += amount;
    });

    const monthly = document.getElementById('monthlyBillsTotal');
    const after = document.getElementById('afterBillsBalance');
    const monthlyLabel = monthly && monthly.parentElement && monthly.parentElement.querySelector('.small');
    if (monthlyLabel) monthlyLabel.textContent = 'BILLS LEFT THIS MONTH';
    if (monthly) monthly.textContent = money(unpaidTotal);
    if (after) after.textContent = money(Number(data.billAccount || 0) - unpaidTotal);

    const summary = '<div class="bill-summary"><div><div class="small">PAID THIS MONTH</div><b>' + money(paidTotal) + '</b></div><div style="text-align:right"><div class="small">LEFT TO PAY</div><b>' + money(unpaidTotal) + '</b></div></div>';
    const rows = data.bills.map((x,i) => {
      const paid = billPaid(x), amount = Number(x.amount || 0);
      return '<div class="item ' + (paid ? 'monthly-bill-paid' : '') + '">' +
        '<b class="bill-name">' + esc(x.name || 'Bill') + '</b>' +
        '<span style="float:right">' + money(amount) + '</span>' +
        '<div class="small">' + esc(x.freq || '') + (x.date ? ' · due ' + esc(x.date) : '') + '</div>' +
        '<div class="bill-status">' + (paid ? '✓ Paid for ' + month : 'Not paid yet this month') + '</div>' +
        '<div class="crud-actions">' +
        '<button type="button" class="bill-paid-btn ' + (paid ? 'is-paid' : '') + '" onclick="event.stopPropagation();toggleBillPaid(' + i + ')">' + (paid ? 'Unpay' : 'Paid') + '</button>' +
        crudButton('Edit','editBill(' + i + ')') +
        crudButton('Delete',"crudDelete('bill'," + i + ')',true) +
        '</div></div>';
    }).join('');

    list.innerHTML = summary + (rows || '<div class="empty">No bills added.</div>');
  };

  const originalRender = render;
  render = function(){
    originalRender();
    renderMonthlyBillPaid();
  };
  renderMonthlyBillPaid();
})();
