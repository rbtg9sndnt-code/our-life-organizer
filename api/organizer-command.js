export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const {message='',data={},today='',image=''}=req.body||{};const text=String(message).trim();
    if(!text&&!image)return res.status(400).json({error:'Message is required'});
    const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)return res.status(500).json({error:'OPENAI_API_KEY is not configured'});
    const currentDay=/^\d{4}-\d{2}-\d{2}$/.test(today)?today:new Date().toISOString().slice(0,10);
    const safeData={plans:Array.isArray(data.plans)?data.plans:[],bills:Array.isArray(data.bills)?data.bills:[],pays:Array.isArray(data.pays)?data.pays:[],recipes:Array.isArray(data.recipes)?data.recipes:[],us:Array.isArray(data.us)?data.us:[],folders:Array.isArray(data.folders)?data.folders:[],captures:Array.isArray(data.captures)?data.captures:[],goal:Number(data.goal||0),billAccount:Number(data.billAccount||0),safeSpendManual:data.safeSpendManual??null};

    let linkContext='';
    const tiktokMatch=text.match(/https?:\/\/(?:www\.)?(?:vm\.)?tiktok\.com\/[^\s]+/i);
    if(tiktokMatch){
      const url=tiktokMatch[0].replace(/[),.]+$/,'');
      try{
        const oembed=await fetch('https://www.tiktok.com/oembed?url='+encodeURIComponent(url),{headers:{'User-Agent':'Mozilla/5.0'}});
        if(oembed.ok){
          const meta=await oembed.json();
          linkContext=`\nTIKTOK LINK METADATA:\nURL: ${url}\nTitle/caption: ${String(meta.title||'')}\nAuthor: ${String(meta.author_name||'')}\nThis is a TikTok link. If its title/caption clearly describes a recipe, treat it as a recipe capture and put the useful recipe details you can extract into the add_recipe notes. If the caption does not contain enough recipe details, still save the TikTok link as a recipe or useful capture rather than failing.`;
        }else{
          linkContext=`\nTIKTOK LINK DETECTED: ${url}\nThe TikTok page metadata could not be fetched. Still save the link instead of failing.`;
        }
      }catch(_){
        linkContext=`\nTIKTOK LINK DETECTED: ${url}\nThe TikTok page metadata could not be fetched. Still save the link instead of failing.`;
      }
    }

    const system=`You are the action engine for a personal life organizer. The user's local date is ${currentDay}. Understand natural-language requests and return ONLY valid JSON. Resolve today, tomorrow, next Friday, etc. using that date. Use 24-hour time. The user wants Quick Capture to accept anything and put it in the right area.

Allowed actions: add_reminder {name,date,time}; delete_reminder {query}; add_bill {name,amount,date,freq}; add_pay {amount,date}; add_note {title,text,image}; add_recipe {name,link,notes,image}; add_bill_money {amount,direction}; save_capture {title,text,category,suggestedDestination,summary,image}.

For phrases like "add $200 to bill fund", use add_bill_money with amount 200 and direction "add". For "remove $50 from bill fund", use direction "remove". For calendar/reminder requests, use add_reminder with the resolved date and time. For a screenshot or photo, use the image context when deciding whether it belongs in Recipes, Notes & Ideas, Plan, Money, or a general capture. Never reject an image just because it is unfamiliar. If the user gives a normal note/idea, use add_note. If you cannot safely decide, use save_capture instead of failing.

For TikTok recipe links: if metadata or the user's text makes it clear that the link is a recipe, ALWAYS use add_recipe with the TikTok URL as link. Put the recipe title and any ingredients, measurements, instructions, substitutions, or useful caption details you can actually extract into notes. Do not invent missing ingredients. If there is not enough information to reconstruct the recipe, still create the recipe entry with the link and say that the video contains the remaining instructions so the user can edit it later. Never discard a TikTok link just because the video itself cannot be directly watched.

Return exactly {"reply":"short confirmation or one concise question","actions":[{"type":"...",...}]}. Never claim an action happened unless it is included in actions.

CURRENT ORGANIZER DATA:\n${JSON.stringify(safeData)}${linkContext}`;
    const content=[];if(text)content.push({type:'input_text',text});else content.push({type:'input_text',text:'Organize this capture into the correct area of the organizer.'});if(image)content.push({type:'input_image',image_url:image});
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},body:JSON.stringify({model:'gpt-5.4-mini',instructions:system,input:[{role:'user',content}],max_output_tokens:1400})});
    const result=await response.json();if(!response.ok)return res.status(response.status).json({error:result?.error?.message||'OpenAI request failed'});
    let raw=String(result.output_text||'').trim();if(!raw&&Array.isArray(result.output))raw=result.output.flatMap(x=>Array.isArray(x?.content)?x.content:[]).map(x=>x?.text||'').join('').trim();
    let parsed;try{parsed=JSON.parse(raw)}catch(_){const m=raw.match(/\{[\s\S]*\}/);parsed=m?JSON.parse(m[0]):null}
    if(!parsed||!Array.isArray(parsed.actions)||typeof parsed.reply!=='string')return res.status(502).json({error:'The AI returned an invalid command. Please try again.'});
    return res.status(200).json({reply:parsed.reply,actions:parsed.actions});
  }catch(err){return res.status(500).json({error:err?.message||'Command failed'});
  }
}
