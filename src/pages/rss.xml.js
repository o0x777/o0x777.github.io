import rss from '@astrojs/rss';
import { SITE, getPosts, postUrl } from '../lib/site';

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: postUrl(post),
    })),
    customData: '<language>zh-CN</language>',
  });
}
