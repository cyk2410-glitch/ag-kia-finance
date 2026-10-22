// Netlify Function: merge two public Naver RSS feeds; no private data or API keys.
const SOURCES=['cyk2410','sjykmk1031'];
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/<[^>]*>/g,'').trim();
const field=(item,key)=>{const m=item.match(new RegExp('<'+key+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+key+'>','i'));return m?decode(m[1]):''};
async function getFeed(id){
 const url='https://rss.blog.naver.com/'+id+'.xml';
 const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),8000);
 try{const r=await fetch(url,{signal:ctl.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; AGKiaSite/1.0)','Accept':'application/rss+xml,application/xml,text/xml'}});if(!r.ok)throw Error('RSS HTTP '+r.status);const xml=await r.text();const items=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(x=>x[1]);if(!items.length)throw Error('RSS 게시글 없음');return items.map(x=>({title:field(x,'title'),link:field(x,'link'),date:field(x,'pubDate')||field(x,'dc:date'),source:id})).filter(x=>x.title&&/^https:\/\/(?:blog\.naver\.com|m\.blog\.naver\.com)\//.test(x.link));}finally{clearTimeout(timer)}
}
exports.handler=async()=>{
 const results=await Promise.allSettled(SOURCES.map(getFeed));const posts=[];const warnings=[];
 results.forEach((r,i)=>{if(r.status==='fulfilled')posts.push(...r.value);else warnings.push(SOURCES[i]+': '+String(r.reason?.message||r.reason))});
 const unique=[...new Map(posts.map(p=>[p.link,p])).values()];unique.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));
 return {statusCode:unique.length?200:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=900, stale-while-revalidate=3600','Access-Control-Allow-Origin':'*'},body:JSON.stringify({posts:unique.slice(0,6),warnings,updatedAt:new Date().toISOString()})};
};
