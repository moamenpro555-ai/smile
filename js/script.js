const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const sp=$('#sp');let dn=0;const hide=()=>{if(dn++)return;sp.classList.add('x');setTimeout(()=>sp.remove(),800)};
addEventListener('load',()=>setTimeout(hide,1400));setTimeout(hide,4000);
const hd=$('header'),sc=()=>hd.classList.toggle('s',scrollY>20);sc();addEventListener('scroll',sc,{passive:true});
const mb=$('#mb'),ls=$$('nav>a'),tg=v=>{const o=hd.classList.toggle('o',v);mb.setAttribute('aria-expanded',o);document.body.classList.toggle('mn',o)};
mb.onclick=()=>tg();$('#ov').onclick=()=>tg(false);
addEventListener('keydown',e=>e.key==='Escape'&&tg(false));addEventListener('resize',()=>innerWidth>1020&&tg(false));
$$('nav a').forEach(a=>a.addEventListener('click',()=>tg(false)));
ls.forEach((a,i)=>a.style.setProperty('--i',i+1));$('#dl').src=$('.br img').src;
const spy=()=>{let c,m=-1e9;ls.forEach(a=>{const t=$(a.hash);if(!t)return;const y=t.getBoundingClientRect().top;if(y<=innerHeight*.4&&y>m){m=y;c=a}});ls.forEach(a=>a.classList.toggle('on',a===c))};
addEventListener('scroll',spy,{passive:true});spy();
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
$$('.rv').forEach(e=>io.observe(e));
$('#rg').oninput=e=>$('#cm').style.setProperty('--x',e.target.value+'%');
$$('[data-s]').forEach(b=>b.addEventListener('click',()=>{$('#sv').value=b.dataset.s}));
$('#bf').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),ok=$('#ok'),er=$('#er'),sb=$('#sb'),lb=sb.textContent;
ok.hidden=er.hidden=true;
const fail=m=>{er.innerHTML=m+' أو كلمنا على <a href="tel:01117778389">01117778389</a> / <a href="https://wa.me/201117778389" target="_blank" rel="noopener">واتساب</a>.';er.hidden=false};
if(!window.SITE_API)return fail('الحجز أونلاين غير متاح حاليًا.');
sb.disabled=true;sb.textContent='جاري الإرسال...';
try{const r=await fetch(window.SITE_API.replace(/\/+$/,'')+'/api/public/booking-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.n,phone:f.p,service:f.s,date:f.d||'',notes:f.m||'',website:f.website||''})});
const d=await r.json().catch(()=>({}));
if(!r.ok)fail(d.error||'حصلت مشكلة في الإرسال، جرّب تاني.');else{ok.hidden=false;e.target.reset()}}
catch(_){fail('تعذّر الاتصال بالسيرفر، جرّب بعد شوية.')}
finally{sb.disabled=false;sb.textContent=lb}};
