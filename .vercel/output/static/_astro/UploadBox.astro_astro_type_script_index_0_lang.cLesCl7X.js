const o=document.getElementById("uploadBox"),l=document.getElementById("fileInput"),S=document.getElementById("chooseBtn"),p=document.getElementById("uploadIdle"),u=document.getElementById("uploadScanning"),k=document.getElementById("uploadDone"),L=document.getElementById("scanningImg"),x=document.getElementById("thumbnailImg"),m=document.getElementById("progressFill"),g=document.getElementById("progressPct"),i=document.getElementById("uploadError"),y=document.getElementById("faceResults"),C=document.getElementById("faceResultsGrid"),P=document.getElementById("newSearchBtn"),b=document.getElementById("authModal"),R=document.getElementById("authBackdrop"),M=document.getElementById("authClose"),T=document.getElementById("authSkip"),E=document.getElementById("unlockBanner"),F=document.getElementById("unlockBannerText");function f(){try{return!!JSON.parse(localStorage.getItem("fbf_user")||"null")}catch{return!1}}function w(){return parseInt(localStorage.getItem("fbf_searches")||"0")}function D(){f()||localStorage.setItem("fbf_searches",String(w()+1))}function U(){b.style.display="flex"}function h(){b.style.display="none"}R.addEventListener("click",h);M.addEventListener("click",h);T.addEventListener("click",h);S.addEventListener("click",()=>l.click());l.addEventListener("change",()=>{l.files?.[0]&&v(l.files[0])});o.addEventListener("dragover",e=>{e.preventDefault(),o.classList.add("drag-over")});o.addEventListener("dragleave",()=>o.classList.remove("drag-over"));o.addEventListener("drop",e=>{e.preventDefault(),o.classList.remove("drag-over");const t=e.dataTransfer?.files[0];t?.type.startsWith("image/")&&v(t)});document.addEventListener("paste",e=>{const t=e.clipboardData?.files[0];t?.type.startsWith("image/")&&v(t)});P.addEventListener("click",()=>{k.style.display="none",p.style.display="flex",y.style.display="none",i.style.display="none",l.value=""});let d=null;function N(){let e=0;m.style.width="0%",g.textContent="0%",d=setInterval(()=>{e=Math.min(e+Math.random()*7+1,87),m.style.width=`${e}%`,g.textContent=`${Math.round(e)}%`},220)}function B(){d&&(clearInterval(d),d=null),m.style.width="100%",g.textContent="100%"}async function v(e){if(!f()&&w()>=2){U();return}i.style.display="none";const t=new FileReader;t.onload=async n=>{if(!n.target?.result)return;const s=String(n.target.result);L.src=s,x.src=s,p.style.display="none",u.style.display="flex",N();try{const a=await fetch("/api/face-search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({descriptor:new Array(128).fill(0)})});if(!a.ok)throw new Error("failed");const r=await a.json();B(),D(),await new Promise(c=>setTimeout(c,500)),u.style.display="none",k.style.display="flex",_(r.results??[])}catch{B(),u.style.display="none",p.style.display="flex",i.textContent="Search failed — please try again",i.style.display="block"}},t.readAsDataURL(e)}function A(e,t,n){return!e||e.startsWith("/")?e:`https://images.weserv.nl/?url=${encodeURIComponent(e.replace(/^https?:\/\//,""))}&w=${t}&h=${n}&fit=cover&output=webp`}function W(e,t,n){const s=e.avatar?.startsWith("http")?A(e.avatar,320,427):"/no-image.png",a=e.subscribePrice??e.subscribeprice,r=!a||isNaN(Number(a))?"FREE":`$${parseFloat(String(a)).toFixed(2)}`,c=e.matchPct,I=c?`<span class="match-badge">${c}% match</span>`:"",$=`https://onlyfans.com/${encodeURIComponent(e.username)}`;return!n&&t>=4?`<div class="creator-card locked">
        <div class="card-img-wrap">
          <img src="${s}" alt="Locked creator" loading="lazy" decoding="async" referrerpolicy="no-referrer"
            style="filter:blur(10px);transform:scale(1.08);"
            onerror="if(this.src!=='/no-image.png'){this.src='/no-image.png';}">
          ${I}
          <div class="lock-overlay" onclick="document.getElementById('authModal').style.display='flex'">
            <button class="unlock-btn">🔓 Unlock</button>
          </div>
        </div>
        <div class="card-body locked-body">
          <p class="creator-name">••••• •••••</p>
          <p class="username">@••••••••</p>
          <p class="price">${r}</p>
          <div class="view-btn-locked">View Profile</div>
        </div>
      </div>`:`<div class="creator-card">
      <div class="card-img-wrap">
        <img src="${s}" alt="${e.name||e.username}" loading="${t===0?"eager":"lazy"}"
          decoding="async" referrerpolicy="no-referrer"
          onerror="if(this.src!=='/no-image.png'){this.src='/no-image.png';}">
        ${I}
      </div>
      <div class="card-body">
        <p class="creator-name">${e.name||e.username}</p>
        <p class="username">@${e.username}</p>
        <p class="price ${r==="FREE"?"price-free":""}">${r}</p>
        <a href="${$}" class="view-btn" target="_blank" rel="noopener noreferrer">View Profile</a>
      </div>
    </div>`}function _(e){const t=f();if(C.innerHTML=e.map((n,s)=>W(n,s,t)).join(""),y.style.display="block",!t&&e.length>4){const n=e.length-4;F.innerHTML=`🔒 <strong>${n} more matches found</strong> — sign in free to see all`,E.style.display="flex"}else E.style.display="none";y.scrollIntoView({behavior:"smooth",block:"start"})}
