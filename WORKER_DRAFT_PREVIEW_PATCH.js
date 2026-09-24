// ADD THIS ROUTE INSIDE fetch(), AFTER THE ADMIN AUTH CHECK AND BEFORE THE EXISTING ADMIN ARTICLE ROUTES:
//
// GET /api/admin/articles/preview/:slug
//
if (
  pathname.startsWith("/api/admin/articles/preview/") &&
  method === "GET"
) {
  const slug = decodeURIComponent(
    pathname.substring("/api/admin/articles/preview/".length)
  );

  if (!slug) {
    return error("Article slug is required.", 400, corsHeaders);
  }

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
      WHERE slug = ?
      LIMIT 1
    `)
    .bind(slug)
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

// CORS MUST ALSO INCLUDE:
// "Access-Control-Allow-Headers": "Content-Type, Authorization",
