import { formatDate, getPosts, plainText, postUrl, reportIds } from '../lib/site';

// Full-text index for the ⌘K palette, fetched on first open.
export async function GET() {
  const posts = await getPosts();
  const ids = reportIds(posts);
  const docs = posts.map((p) => ({
    t: p.data.title,
    u: postUrl(p),
    d: p.data.description,
    g: p.data.tags,
    n: ids.get(p.id),
    date: formatDate(p.data.pubDate),
    x: plainText(p.body),
  }));
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
}
