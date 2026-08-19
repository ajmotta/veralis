export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /private\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
