const API="https://praestantia-api.dmdeliafr.workers.dev";
const $=s=>document.querySelector(s);
const tokenKey="praestantia_admin_token";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function adminApi(path,options={}){
  const token=sessionStorage.getItem(tokenKey);
  const headers={...(options.headers||{}),Authorization:`Bearer ${token||""}`};
  if(options.body) headers["Content-Type"]="application/json";
  const r=await fetch(API+path,{...options,headers});
  const d=await r.json();
  if(!r.ok||d.success===false) throw new Error(d.error||"Request failed");
  return d;
}
function showDashboard(){ $("#admin-login").classList.add("hidden"); $("#admin-dashboard").classList.remove("hidden"); }
function showLogin(){ $("#admin-login").classList.remove("hidden"); $("#admin-dashboard").classList.add("hidden"); }

async function login(){
  const input=$("#admin-token"); const status=$("#admin-login-status");
  const token=input.value.trim(); if(!token){status.textContent="TOKEN REQUIRED.";return;}
  sessionStorage.setItem(tokenKey,token);
  try{await adminApi("/api/admin/dashboard");showDashboard();await refresh();}
  catch(e){sessionStorage.removeItem(tokenKey);status.textContent="ACCESS DENIED.";showLogin();}
}

async function refresh(){
  const [dash,articles]=await Promise.all([adminApi("/api/admin/dashboard"),adminApi("/api/admin/articles")]);
  const d=dash.dashboard;
  $("#admin-metrics").innerHTML=[
    ["ARTICLES",d.articles],["ACTIVE PLAYERS",d.active_players],["MATCHES",d.matches],["NEW APPLICATIONS",d.new_applications],["MATCH REQUESTS",d.new_match_requests],["PARTNERSHIP REQUESTS",d.new_partnership_requests]
  ].map(([k,v])=>`<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join("");
  const root=$("#admin-articles");
  root.innerHTML=articles.articles.length?articles.articles.map(a=>`
    <article class="admin-article" data-id="${a.id}">
      <div><span class="eyebrow">${esc(a.category)} / ${esc(a.status)}</span><h3>${esc(a.title)}</h3><small>${esc(a.slug)}</small></div>
      <button class="danger-button" data-delete="${a.id}">DELETE</button>
    </article>`).join(""):'<div class="empty-state">No articles yet.</div>';
}

function slugify(s){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}

document.addEventListener("DOMContentLoaded",()=>{
  $("#admin-login-button").addEventListener("click",login);
  $("#admin-logout").addEventListener("click",()=>{sessionStorage.removeItem(tokenKey);location.reload();});
  $("#title").addEventListener("input",e=>{ if(!$("#slug").dataset.touched) $("#slug").value=slugify(e.target.value); });
  $("#slug").addEventListener("input",()=>$("#slug").dataset.touched="1");

  const content=$("#content");
  document.querySelectorAll(".toolbar button").forEach(button=>button.addEventListener("click",()=>{
    const start=content.selectionStart,end=content.selectionEnd,selected=content.value.slice(start,end);
    if(button.dataset.wrap){const w=button.dataset.wrap;content.setRangeText(`${w}${selected||"text"}${w}`,start,end,"end");}
    else{content.setRangeText(button.dataset.prefix+(selected||"text"),start,end,"end");}
    content.focus();
  }));

  $("#editor-form").addEventListener("submit",async e=>{
    e.preventDefault(); const status=$("#editor-status"); status.textContent="SAVING…";
    const body={title:$("#title").value.trim(),slug:$("#slug").value.trim(),category:$("#category").value.trim(),subheadline:$("#subheadline").value.trim(),image_url:$("#image").value.trim(),status:$("#status").value,is_featured:$("#featured").checked,content:$("#content").value};
    try{const r=await adminApi("/api/admin/articles",{method:"POST",body:JSON.stringify(body)});status.textContent=`ARTICLE SAVED / ID ${r.id}`;e.target.reset();$("#category").value="EDITORIAL";$("#slug").dataset.touched="";await refresh();}
    catch(err){status.textContent="ERROR: "+err.message;}
  });

  $("#admin-articles").addEventListener("click",async e=>{
    const id=e.target.dataset.delete;if(!id)return;
    if(!confirm("Delete this article permanently?"))return;
    try{await adminApi("/api/admin/articles/"+id,{method:"DELETE"});await refresh();}catch(err){alert(err.message);}
  });

  if(sessionStorage.getItem(tokenKey)){showDashboard();refresh().catch(()=>{sessionStorage.removeItem(tokenKey);showLogin();});}
});