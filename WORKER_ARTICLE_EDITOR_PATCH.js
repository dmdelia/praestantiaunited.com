// PRAESTANTIA ARTICLE EDITOR ROUTE
// Add AFTER the admin auth check and BEFORE the existing PUT / DELETE article routes.
//
// GET /api/admin/articles/:id
if (
  /^\/api\/admin\/articles\/\d+$/.test(pathname) &&
  method === "GET"
) {
  const id = Number(pathname.split("/").pop());

  const article = await env.DB
    .prepare(`
      SELECT
        id,
        title,
        slug,
        category,
        subheadline,
        content,
        image_url,
        is_featured,
        status,
        published_at,
        created_at,
        updated_at
      FROM articles
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!article) {
    return error("Article not found.", 404, corsHeaders);
  }

  return json(
    {
      success: true,
      article
    },
    200,
    corsHeaders
  );
}

// Your existing PUT /api/admin/articles/:id route already handles saving edits.
// CORS must allow:
// "Access-Control-Allow-Headers": "Content-Type, Authorization"
