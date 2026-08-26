const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'index.html');
let html = fs.readFileSync(file, 'utf8');
const marker = '/* BILL_FUND_CHAT_COMMANDS_V1 */';

if (!html.includes(marker)) {
  const code = String.raw`
${marker}
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
  fs.writeFileSync(file, html);
}

console.log('Build patch applied: Bill Fund natural-language commands');
