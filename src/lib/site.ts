import { getCollection, type CollectionEntry } from 'astro:content';

/** Everything a visitor reads outside of posts lives here. */
export const SITE = {
  title: '0x777',
  description: '0x777 的安全档案：逆向、威胁情报、业务安全与数据安全。',
  motto: ['保持好奇，保持隐秘，', '追踪暗影。'],
  mottoEn: 'tracking the shadows, since 2021.',
  lead: '0x777 的安全档案。从 CTF 逆向起步，走过威胁情报、业务安全与黑产对抗，如今专注安全治理与数据安全——在这里记录研究与思考。',
  author: '0x777',
  since: 2021,
  links: {
    email: 'root@0x777.me',
    x: 'https://x.com/0x7773',
    xHandle: '@0x7773',
    github: 'https://github.com/o0x777',
  },
  focus: [
    { title: '逆向与漏洞', desc: 'Android / Windows 逆向与二进制漏洞，从 CTF 一路走来。', icon: 'chip' },
    { title: '威胁情报', desc: 'Botnet 跟踪与恶意样本分析，追踪 C2 与家族演化。', icon: 'graph' },
    { title: '业务安全', desc: '黑产溯源打击与业务风控，在真实业务里对抗黑灰产。', icon: 'target' },
    { title: '数据安全', desc: '安全治理与国际化业务的数据安全、隐私合规。', icon: 'lock' },
  ],
} as const;

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

export function formatDate(d: Date, sep = '-') {
  const { year, month, day } = dateParts(d);
  return [year, month, day].join(sep);
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

/** Report numbers in publication order: the first post is 0x01. */
export function reportIds(posts: Post[]) {
  const ascending = [...posts].sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
  return new Map(ascending.map((p, i) => [p.id, '0x' + (i + 1).toString(16).toUpperCase().padStart(2, '0')]));
}

/** Markdown → searchable plain text. */
export function plainText(md = '') {
  return md
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[a-z]*\n?/gi, ' ')
    .replace(/[#>*_`|~\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Character/word count for mixed Chinese + English text. */
export function wordCount(md = '') {
  const text = plainText(md);
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const words = (text.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return cjk + words;
}

export function readingMinutes(md = '') {
  return Math.max(1, Math.round(wordCount(md) / 400));
}

/** Stable ASCII name so a post title can morph between pages (View Transitions). */
export function vtName(post: Post) {
  let h = 5381;
  for (const ch of post.id) h = ((h << 5) + h + ch.codePointAt(0)!) >>> 0;
  return `post-${h.toString(36)}`;
}

export const BUILD_DATE = formatDate(new Date());
