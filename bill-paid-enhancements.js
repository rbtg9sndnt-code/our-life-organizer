(() => {
  const style = document.createElement('style');
  style.textContent = `
    .bill-paid-btn{border:1px solid #ffffff18;background:#242428;color:#fff;border-radius:10px;padding:7px 12px;font-size:12px;font-weight:750;cursor:pointer}
    .bill-paid-btn.is-paid{border-color:#36c98a55;color:#5de0a3;background:#14251e}
    .bill-paid-btn:disabled{opacity:1;cursor:pointer}
    .monthly-bill-paid{opacity:.72}
    .monthly-bill-paid .bill-name{text-decoration:line-through}
  `;
  document.head.appendChild(style);

  function billMonth(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0');
  }

  function billPaid(bill){
    return !!bill && bill.paidMonth === billMonth();
  }

  window.toggleBillPaid = function(i){
    const bill = data.bills[i];
    if (!bill) return;
    const amount = Number(bill.amount || 0);

    if (billPaid(bill)) {
      // Undo payment: restore exactly what was removed from the Bill Fund.
      const restored = Number(bill.paidAmount != null ? bill.paidAmount : amount);
      data.billAccount = Number(data.billAccount || 0) + restored;
      delete bill.paidMonth;
      delete bill.paidAmount;
    } else {
      // Paying a bill consumes that amount from the money set aside for bills.
      bill.paidMonth = billMonth();
      bill.paidAmount = amount;
      data.billAccount = Number(data.billAccount || 0) - amount;
    }

    save();
    if (typeof window.render === 'function') window.render();
  };

  window.renderMonthlyBillPaid = function(){
    const list = document.getElementById('bills');
    if (!list || !Array.isArray(data.bills)) return;

    const items = list.querySelectorAll('.item');
    items.forEach((item, i) => {
      const bill = data.bills[i];
      if (!bill) return;

      const paid = billPaid(bill);
      item.classList.toggle('monthly-bill-paid', paid);

      let actions = item.querySelector('.crud-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'crud-actions';
        actions.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;margin-top:8px';
        item.appendChild(actions);
      }

      let button = actions.querySelector('.bill-paid-btn');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'bill-paid-btn';
        actions.insertBefore(button, actions.firstChild);
      }

      button.classList.toggle('is-paid', paid);
      button.textContent = paid ? '✓ Paid' : 'Pay';
      button.title = paid ? 'Paid this month — tap to undo' : 'Mark this bill paid for this month';
      button.onclick = (event) => {
        event.stopPropagation();
        window.toggleBillPaid(i);
      };
    });
  };

  const originalRender = window.render;
  if (typeof originalRender === 'function' && !window.__billPaidRenderWrapped) {
    window.render = function(){
      originalRender();
      window.renderMonthlyBillPaid();
    };
    window.__billPaidRenderWrapped = true;
  }

  window.renderMonthlyBillPaid();
})();
