self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(async response=>{
      const type=response.headers.get('content-type')||'';
      if(!type.includes('text/html')) return response;
      const html=await response.text();
      const injected=html.replace('</body>','<script src="home-calendar.js?v=2"></script></body>');
      return new Response(injected,{status:response.status,statusText:response.statusText,headers:response.headers});
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
  }
});