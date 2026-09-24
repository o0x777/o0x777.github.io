import { getCollection, type CollectionEntry } from 'astro:content';

export const SITE = {
  title: '0x777',
  description: '二进制安全 · 僵尸网络分析 · 黑灰产溯源',
  motto: '保持好奇，保持隐秘，追踪暗影。',
  author: '0x777',
  since: 2021,
  links: {
    email: 'mailto:root@0x777.me',
    x: 'https://x.com/0x7773',
    github: 'https://github.com/o0x777',
  },
};

export type Post = CollectionEntry<'posts'>;

const TZ = 'Asia/Shanghai';

/** Date parts in China time, so URLs and displayed dates agree with the old site. */
export function dateParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function formatDate(d: Date) {
  const { year, month, day } = dateParts(d);
  return `${year}-${month}-${day}`;
}

export function postUrl(post: Post) {
  const { year, month, day } = dateParts(post.data.pubDate);
  return `/${year}/${month}/${day}/${post.data.slug}/`;
}

export function tagUrl(tag: string) {
  return `/tags/${tag}/`;
}

/** Published posts, newest first. Drafts show up in `npm run dev` only. */
export async function getPosts() {
  const posts = await getCollection('posts', (p) => import.meta.env.DEV || !p.data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** Rough reading time for mixed Chinese/English text. */
export function readingMinutes(body = '') {
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/!\[.*?\]\(.*?\)/g, '');
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const words = (text.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 200));
}
