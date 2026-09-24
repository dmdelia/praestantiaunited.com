const API="https://praestantia-api.dmdeliafr.workers.dev";
const tokenKey="praestantia_admin_token";
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt=v=>v?new Date(v).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase():"—";
let editingArticleId=null;

async function adminApi(path,options={}){
  const headers={...(options.headers||{}),Authorization:"Bearer "+(sessionStorage.getItem(tokenKey)||"")};
  if(options.body) headers["Content-Type"]="application/json";
  const r=await fetch(API+path,{...options,headers});
  let d={}; try{d=await r.json();}catch{}
  if(!r.ok||d.success===false) throw new Error(d.error||("Request failed ("+r.status+")"));
  return d;
}
async function publicApi(path){
  const r=await fetch(API+path); const d=await r.json();
  if(!r.ok||d.success===false) throw new Error(d.error||"Request failed");
  return d;
}
function formData(form){
  const o=Object.fromEntries(new FormData(form).entries());
  for(const k of Object.keys(o)) if(o[k]==="") o[k]=null;
  return o;
}
function slugify(s){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function statusClass(ok){const el=$(".hub-api-status");el.classList.remove("online","offline");el.classList.add(ok?"online":"offline");$("#api-label").textContent=ok?"API ONLINE":"API OFFLINE";}

async function login(){
  const token=$("#token-input").value.trim();
  const status=$("#login-status");
  if(!token){status.textContent="TOKEN REQUIRED.";return;}
  sessionStorage.setItem(tokenKey,token);
  try{
    await adminApi("/api/admin/dashboard");
    $("#login-screen").classList.add("hidden");$("#hub").classList.remove("hidden");statusClass(true);await loadDashboard();
  }catch(e){
    sessionStorage.removeItem(tokenKey);status.textContent="ACCESS DENIED: "+e.message;statusClass(false);
  }
}
function logout(){sessionStorage.removeItem(tokenKey);location.reload();}

const titles={
  dashboard:["COMMAND","Overview"],news:["CONTENT","Newsroom"],players:["PERSONNEL","Pantheon"],matches:["COMPETITION","Matchday"],
  applications:["RECRUITMENT","Applications"],"match-requests":["OPPOSITION","Match Requests"],partners:["ALLIANCES","Partners"],
  "partnership-requests":["ALLIANCES","Partnership Requests"],settings:["SYSTEM","Runtime"]
};
function go(section){
  $$(".hub-nav-item").forEach(x=>x.classList.toggle("active",x.dataset.section===section));
  $$(".hub-section").forEach(x=>x.classList.toggle("active",x.dataset.panel===section));
  $("#section-kicker").textContent=titles[section][0];$("#section-title").textContent=titles[section][1];
  loadSection(section).catch(e=>console.error(e));
}
async function loadSection(section){
  if(section==="dashboard") return loadDashboard();
  if(section==="news") return loadNews();
  if(section==="players") return loadPlayers();
  if(section==="matches") return loadMatches();
  if(section==="applications") return loadApplications();
  if(section==="match-requests") return loadMatchRequests();
  if(section==="partners") return loadPartners();
  if(section==="partnership-requests") return loadPartnershipRequests();
  if(section==="settings") return loadSettings();
}
async function loadDashboard(){
  try{
    const [d,h,s]=await Promise.all([adminApi("/api/admin/dashboard"),publicApi("/api/health"),publicApi("/api/settings")]);
    statusClass(true);
    const x=d.dashboard;
    $("#metrics").innerHTML=[
      ["ARTICLES",x.articles],["PLAYERS",x.active_players],["MATCHES",x.matches],["APPLICATIONS",x.new_applications],["MATCH REQUESTS",x.new_match_requests],["PARTNER REQUESTS",x.new_partnership_requests]
    ].map(([k,v])=>'<div class="hub-metric"><span>'+k+'</span><strong>'+v+'</strong></div>').join("");
    $("#badge-applications").textContent=x.new_applications||"";
    $("#badge-match-requests").textContent=x.new_match_requests||"";
    $("#badge-partnerships").textContent=x.new_partnership_requests||"";
    $("#system-status").innerHTML=
      row("API","praestantia-api",h.connected?"CONNECTED":"OFFLINE")+
      row("DATABASE",h.database,h.connected?"CONNECTED":"OFFLINE")+
      row("SEASON",s.settings?.site_name||"PRAESTANTIA UNITED","LIVE");
  }catch(e){statusClass(false);throw e;}
}
function row(k,t,m=""){
  return '<div class="hub-row"><div><small>'+esc(k)+'</small><h4>'+esc(t)+'</h4></div><small>'+esc(m)+'</small></div>';
}
function actions(html){return '<div class="hub-row-actions">'+html+'</div>';}

async function loadNews(){
  const d=await adminApi("/api/admin/articles");
  $("#articles-list").innerHTML=d.articles.length?d.articles.map(a=>'<div class="hub-row"><div><small>'+esc(a.category)+' / '+esc(a.status)+'</small><h4>'+esc(a.title)+'</h4><small>/news/'+esc(a.slug)+'</small></div>'+actions('<button data-edit-article="'+a.id+'">EDIT</button><a href="'+(a.status==="published"?"/news/":"/news/preview/")+encodeURIComponent(a.slug)+'" target="_blank">'+(a.status==="published"?"OPEN":"PREVIEW")+'</a><button class="danger" data-delete-article="'+a.id+'">DELETE</button>')+'</div>').join(""):'<div class="empty-state">No articles.</div>';
}
function resetArticleEditor(){
  editingArticleId=null;
  $("#article-form").reset();
  $("#article-category").value="EDITORIAL";
  $("#article-slug").dataset.touched="";
  $("#article-editor-title").textContent="Create article";
  $("#article-editor-mode").textContent="NEW ENTRY";
  $("#article-save-button").textContent="SAVE ARTICLE";
  $("#article-cancel-edit").classList.add("hidden");
  $("#article-form-status").textContent="";
}

async function editArticle(id){
  const d=await adminApi("/api/admin/articles/"+id);
  const a=d.article;
  editingArticleId=a.id;
  $("#article-title").value=a.title||"";
  $("#article-slug").value=a.slug||"";
  $("#article-slug").dataset.touched="1";
  $("#article-category").value=a.category||"EDITORIAL";
  $("#article-subheadline").value=a.subheadline||"";
  $("#article-image").value=a.image_url||"";
  $("#article-status").value=a.status||"draft";
  $("#article-featured").checked=Number(a.is_featured)===1;
  $("#article-content").value=a.content||"";
  $("#article-editor-title").textContent="Edit article";
  $("#article-editor-mode").textContent="EDITING #"+a.id+" / "+(a.status||"draft").toUpperCase();
  $("#article-save-button").textContent="SAVE CHANGES";
  $("#article-cancel-edit").classList.remove("hidden");
  $("#article-form-status").textContent="";
  $("#article-form").scrollIntoView({behavior:"smooth",block:"start"});
}

async function loadPlayers(){
  const d=await publicApi("/api/players");
  $("#players-list").innerHTML=d.players.length?d.players.map(p=>'<div class="hub-row"><div><small>#'+esc(p.player_number??"—")+' / '+esc(p.position||"MEMBER")+'</small><h4>'+esc(p.name)+'</h4><small>'+esc(p.nationality||"")+'</small></div>'+actions('<button class="danger" data-delete-player="'+p.id+'">REMOVE</button>')+'</div>').join(""):'<div class="empty-state">No active players.</div>';
}
async function loadMatches(){
  const d=await publicApi("/api/matches");
  $("#matches-admin-list").innerHTML=d.matches.length?d.matches.map(m=>'<div class="hub-row"><div><small>'+esc(m.competition||"MATCH")+' / '+fmt(m.match_date)+'</small><h4>'+esc(m.opponent)+'</h4><small>'+esc((m.status||"scheduled").toUpperCase())+'</small></div>'+actions('<button class="danger" data-delete-match="'+m.id+'">DELETE</button>')+'</div>').join(""):'<div class="empty-state">No matches.</div>';
}
async function loadPartners(){
  const d=await publicApi("/api/partners");
  $("#partners-admin-list").innerHTML=d.partners.length?d.partners.map(p=>'<div class="hub-row"><div><small>'+esc(p.tier||"PARTNER")+'</small><h4>'+esc(p.name)+'</h4><small>'+esc(p.website_url||"")+'</small></div>'+actions('<button class="danger" data-delete-partner="'+p.id+'">REMOVE</button>')+'</div>').join(""):'<div class="empty-state">No active partners.</div>';
}
function requestRow(x,title,sub,status,type){
  return '<div class="hub-row"><div><small>'+esc(sub)+'</small><h4>'+esc(title)+'</h4><p>'+esc(x.message||x.experience||"")+'</p></div>'+actions('<select class="hub-status-select" data-status-type="'+type+'" data-status-id="'+x.id+'"><option value="new" '+(status==="new"?"selected":"")+'>NEW</option><option value="reviewing" '+(status==="reviewing"?"selected":"")+'>REVIEWING</option><option value="accepted" '+(status==="accepted"?"selected":"")+'>ACCEPTED</option><option value="rejected" '+(status==="rejected"?"selected":"")+'>REJECTED</option><option value="closed" '+(status==="closed"?"selected":"")+'>CLOSED</option></select>')+'</div>';
}
async function loadApplications(){
  const d=await adminApi("/api/admin/applications");
  $("#applications-list").innerHTML=d.applications.length?d.applications.map(x=>requestRow(x,x.name,(x.position||"NO POSITION")+" / "+x.email,x.status,"applications")).join(""):'<div class="empty-state">No applications.</div>';
}
async function loadMatchRequests(){
  const d=await adminApi("/api/admin/match-requests");
  $("#match-requests-list").innerHTML=d.requests.length?d.requests.map(x=>requestRow(x,x.team_name,x.requester_name+" / "+x.requester_email,x.status,"match-requests")).join(""):'<div class="empty-state">No match requests.</div>';
}
async function loadPartnershipRequests(){
  const d=await adminApi("/api/admin/partnership-requests");
  $("#partnership-requests-list").innerHTML=d.requests.length?d.requests.map(x=>requestRow(x,x.company_name,x.contact_name+" / "+x.email,x.status,"partnership-requests")).join(""):'<div class="empty-state">No partnership requests.</div>';
}
async function loadSettings(){
  const d=await publicApi("/api/settings");
  $("#settings-list").innerHTML=Object.entries(d.settings||{}).map(([k,v])=>row(k,v)).join("");
}

async function submitJson(form,path,transform){
  const status=form.querySelector(".form-status");status.textContent="SAVING…";
  let body=formData(form);if(transform)body=transform(body);
  try{await adminApi(path,{method:"POST",body:JSON.stringify(body)});status.textContent="SAVED.";form.reset();return true;}
  catch(e){status.textContent="ERROR: "+e.message;return false;}
}

document.addEventListener("DOMContentLoaded",()=>{
  $("#login-button").addEventListener("click",login);$("#token-input").addEventListener("keydown",e=>{if(e.key==="Enter")login();});
  $("#logout-button").addEventListener("click",logout);
  $("#hub-nav").addEventListener("click",e=>{const b=e.target.closest("[data-section]");if(b)go(b.dataset.section);});
  $$(".quick-actions [data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
  $$(".hub-refresh").forEach(b=>b.addEventListener("click",()=>loadSection(b.dataset.refresh)));

  $("#article-title").addEventListener("input",e=>{if(!$("#article-slug").dataset.touched)$("#article-slug").value=slugify(e.target.value);});
  $("#article-slug").addEventListener("input",()=>$("#article-slug").dataset.touched="1");
  $("#article-cancel-edit").addEventListener("click",resetArticleEditor);
  $("#article-form").addEventListener("submit",async e=>{
    e.preventDefault();
    const body={title:$("#article-title").value.trim(),slug:$("#article-slug").value.trim(),category:$("#article-category").value.trim(),subheadline:$("#article-subheadline").value.trim(),image_url:$("#article-image").value.trim(),status:$("#article-status").value,is_featured:$("#article-featured").checked,content:$("#article-content").value};
    const st=$("#article-form-status");st.textContent="SAVING…";
    try{
      if(editingArticleId){
        await adminApi("/api/admin/articles/"+editingArticleId,{method:"PUT",body:JSON.stringify(body)});
        st.textContent="CHANGES SAVED.";
      }else{
        await adminApi("/api/admin/articles",{method:"POST",body:JSON.stringify(body)});
        st.textContent="ARTICLE SAVED.";
      }
      resetArticleEditor();
      await Promise.all([loadNews(),loadDashboard()]);
    }catch(err){st.textContent="ERROR: "+err.message;}
  });

  $("#player-form").addEventListener("submit",async e=>{e.preventDefault();if(await submitJson(e.target,"/api/admin/players",b=>({...b,player_number:b.player_number?Number(b.player_number):null})))await Promise.all([loadPlayers(),loadDashboard()]);});
  $("#match-form").addEventListener("submit",async e=>{e.preventDefault();if(await submitJson(e.target,"/api/admin/matches",b=>({...b,score_for:b.score_for!==null?Number(b.score_for):null,score_against:b.score_against!==null?Number(b.score_against):null})))await Promise.all([loadMatches(),loadDashboard()]);});
  $("#partner-form").addEventListener("submit",async e=>{e.preventDefault();if(await submitJson(e.target,"/api/admin/partners",b=>({...b,sort_order:Number(b.sort_order||0)})))await Promise.all([loadPartners(),loadDashboard()]);});

  document.body.addEventListener("click",async e=>{
    const edit=e.target.dataset.editArticle,a=e.target.dataset.deleteArticle,p=e.target.dataset.deletePlayer,m=e.target.dataset.deleteMatch,pt=e.target.dataset.deletePartner;
    try{
      if(edit){await editArticle(edit);}
      if(a&&confirm("Delete this article?")){await adminApi("/api/admin/articles/"+a,{method:"DELETE"});if(String(editingArticleId)===String(a))resetArticleEditor();await Promise.all([loadNews(),loadDashboard()]);}
      if(p&&confirm("Remove this player?")){await adminApi("/api/admin/players/"+p,{method:"DELETE"});await Promise.all([loadPlayers(),loadDashboard()]);}
      if(m&&confirm("Delete this match?")){await adminApi("/api/admin/matches/"+m,{method:"DELETE"});await Promise.all([loadMatches(),loadDashboard()]);}
      if(pt&&confirm("Remove this partner?")){await adminApi("/api/admin/partners/"+pt,{method:"DELETE"});await Promise.all([loadPartners(),loadDashboard()]);}
    }catch(err){alert(err.message);}
  });
  document.body.addEventListener("change",async e=>{
    if(!e.target.matches("[data-status-type]"))return;
    try{await adminApi("/api/admin/"+e.target.dataset.statusType+"/"+e.target.dataset.statusId,{method:"PUT",body:JSON.stringify({status:e.target.value})});await loadDashboard();}
    catch(err){alert(err.message);}
  });

  if(sessionStorage.getItem(tokenKey)){
    $("#login-screen").classList.add("hidden");$("#hub").classList.remove("hidden");
    loadDashboard().then(()=>statusClass(true)).catch(()=>{sessionStorage.removeItem(tokenKey);location.reload();});
  }
});