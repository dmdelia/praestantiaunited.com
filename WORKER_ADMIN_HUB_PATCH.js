// PRAESTANTIA ADMIN HUB ROUTES
// Insert these routes AFTER the existing ADMIN AUTH CHECK and BEFORE NOT FOUND.
// These routes assume the existing tables from the PRAESTANTIA D1 schema.

// ---------- PLAYERS ----------
if (pathname === "/api/admin/players" && method === "POST") {
  const b = await readJson(request);
  const name = clean(b.name), slug = clean(b.slug);
  if (!name || !slug) return error("Name and slug are required.", 400, corsHeaders);

  const activeSeason = await env.DB.prepare("SELECT id FROM seasons WHERE is_active = 1 LIMIT 1").first();
  try {
    const r = await env.DB.prepare(`
      INSERT INTO players (season_id, player_number, name, slug, position, nationality, portrait_url, bio, status, joined_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(
      activeSeason?.id ?? null,
      b.player_number ?? null,
      name, slug,
      clean(b.position) || null,
      clean(b.nationality) || null,
      clean(b.portrait_url) || null,
      clean(b.bio) || null,
      clean(b.joined_at) || null
    ).run();
    return json({success:true,id:r.meta?.last_row_id??null},201,corsHeaders);
  } catch (err) {
    if (String(err).toLowerCase().includes("unique")) return error("Player slug already exists.",409,corsHeaders);
    throw err;
  }
}
if (/^\/api\/admin\/players\/\d+$/.test(pathname) && method === "DELETE") {
  const id=Number(pathname.split("/").pop());
  await env.DB.prepare("UPDATE players SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  return json({success:true},200,corsHeaders);
}

// ---------- MATCHES ----------
if (pathname === "/api/admin/matches" && method === "POST") {
  const b=await readJson(request);
  const opponent=clean(b.opponent), matchDate=clean(b.match_date);
  if(!opponent||!matchDate) return error("Opponent and match date are required.",400,corsHeaders);
  const activeSeason=await env.DB.prepare("SELECT id FROM seasons WHERE is_active=1 LIMIT 1").first();
  const r=await env.DB.prepare(`
    INSERT INTO matches (season_id,opponent,competition,venue,match_date,kickoff_time,status,score_for,score_against,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).bind(
    activeSeason?.id??null,opponent,clean(b.competition)||null,clean(b.venue)||null,matchDate,clean(b.kickoff_time)||null,
    clean(b.status)||"scheduled",
    b.score_for===null||b.score_for===undefined?null:Number(b.score_for),
    b.score_against===null||b.score_against===undefined?null:Number(b.score_against),
    clean(b.notes)||null
  ).run();
  return json({success:true,id:r.meta?.last_row_id??null},201,corsHeaders);
}
if (/^\/api\/admin\/matches\/\d+$/.test(pathname) && method === "DELETE") {
  const id=Number(pathname.split("/").pop());
  await env.DB.prepare("DELETE FROM matches WHERE id=?").bind(id).run();
  return json({success:true},200,corsHeaders);
}

// ---------- PARTNERS ----------
if (pathname === "/api/admin/partners" && method === "POST") {
  const b=await readJson(request);
  const name=clean(b.name),slug=clean(b.slug);
  if(!name||!slug) return error("Name and slug are required.",400,corsHeaders);
  try{
    const r=await env.DB.prepare(`
      INSERT INTO partners (name,slug,logo_url,website_url,description,tier,is_active,sort_order)
      VALUES (?,?,?,?,?,?,1,?)
    `).bind(name,slug,clean(b.logo_url)||null,clean(b.website_url)||null,clean(b.description)||null,clean(b.tier)||null,Number(b.sort_order||0)).run();
    return json({success:true,id:r.meta?.last_row_id??null},201,corsHeaders);
  }catch(err){
    if(String(err).toLowerCase().includes("unique")) return error("Partner slug already exists.",409,corsHeaders);
    throw err;
  }
}
if (/^\/api\/admin\/partners\/\d+$/.test(pathname) && method === "DELETE") {
  const id=Number(pathname.split("/").pop());
  await env.DB.prepare("UPDATE partners SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  return json({success:true},200,corsHeaders);
}

// ---------- APPLICATIONS ----------
if (pathname === "/api/admin/applications" && method === "GET") {
  const {results}=await env.DB.prepare("SELECT * FROM applications ORDER BY created_at DESC").all();
  return json({success:true,applications:results},200,corsHeaders);
}
if (/^\/api\/admin\/applications\/\d+$/.test(pathname) && method === "PUT") {
  const id=Number(pathname.split("/").pop()),b=await readJson(request);
  const allowed=["new","reviewing","accepted","rejected","closed"];
  const status=allowed.includes(b.status)?b.status:null;
  if(!status)return error("Invalid status.",400,corsHeaders);
  await env.DB.prepare("UPDATE applications SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
  return json({success:true},200,corsHeaders);
}

// ---------- MATCH REQUESTS ----------
if (pathname === "/api/admin/match-requests" && method === "GET") {
  const {results}=await env.DB.prepare("SELECT * FROM match_requests ORDER BY created_at DESC").all();
  return json({success:true,requests:results},200,corsHeaders);
}
if (/^\/api\/admin\/match-requests\/\d+$/.test(pathname) && method === "PUT") {
  const id=Number(pathname.split("/").pop()),b=await readJson(request);
  const allowed=["new","reviewing","accepted","rejected","closed"];
  const status=allowed.includes(b.status)?b.status:null;
  if(!status)return error("Invalid status.",400,corsHeaders);
  await env.DB.prepare("UPDATE match_requests SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
  return json({success:true},200,corsHeaders);
}

// ---------- PARTNERSHIP REQUESTS ----------
if (pathname === "/api/admin/partnership-requests" && method === "GET") {
  const {results}=await env.DB.prepare("SELECT * FROM partnership_requests ORDER BY created_at DESC").all();
  return json({success:true,requests:results},200,corsHeaders);
}
if (/^\/api\/admin\/partnership-requests\/\d+$/.test(pathname) && method === "PUT") {
  const id=Number(pathname.split("/").pop()),b=await readJson(request);
  const allowed=["new","reviewing","accepted","rejected","closed"];
  const status=allowed.includes(b.status)?b.status:null;
  if(!status)return error("Invalid status.",400,corsHeaders);
  await env.DB.prepare("UPDATE partnership_requests SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,id).run();
  return json({success:true},200,corsHeaders);
}

// REMINDER:
// Access-Control-Allow-Headers must include Authorization:
// "Access-Control-Allow-Headers": "Content-Type, Authorization"
