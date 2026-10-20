/** The toolbox. Order here is the order on /tools/ and the 0x.. index. */
export const TOOLS = [
  {
    slug: 'chef',
    name: '编解码',
    en: 'Codec Chef',
    icon: 'layers',
    desc: '编码、哈希、加解密，串成一条流水线。✦ Magic 自动剥壳。',
  },
  {
    slug: 'ioc',
    name: 'IOC 提取',
    en: 'IOC Extractor',
    icon: 'scan',
    desc: '粘贴报告，抽出 IP、域名、URL、哈希、CVE。一键 defang。',
  },
  {
    slug: 'headers',
    name: '响应头体检',
    en: 'Header Audit',
    icon: 'shield',
    desc: '贴一段 HTTP 响应头，打分，给出修法。',
  },
  {
    slug: 'unicode',
    name: '隐形字符',
    en: 'Unicode X-Ray',
    icon: 'eye',
    desc: '照出零宽字符、Bidi 反转、同形字，和藏在文本里的指令。',
  },
  {
    slug: 'cidr',
    name: '子网计算',
    en: 'CIDR Calculator',
    icon: 'grid',
    desc: '拖动前缀，看清每一位。',
  },
  {
    slug: 'password',
    name: '口令生成',
    en: 'Password Generator',
    icon: 'asterisk',
    desc: 'CSPRNG 出品。熵值与破解耗时，一眼看清。',
  },
] as const;

export type Tool = (typeof TOOLS)[number];
export type ToolSlug = Tool['slug'];

export const toolUrl = (slug: string) => `/tools/${slug}/`;
export const toolId = (i: number) => '0x' + (i + 1).toString(16).toUpperCase().padStart(2, '0');
