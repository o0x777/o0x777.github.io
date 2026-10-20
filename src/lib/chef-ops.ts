// Operations for the /tools/chef/ pipeline. Every op maps bytes → bytes,
// so text, binary and ciphertext chain freely (the CyberChef model).

export type Bytes = Uint8Array;
export type KeyArg = { v: string; f: 'UTF8' | 'Hex' | 'Base64' };
export type Param =
  | { name: string; type: 'text'; value: string }
  | { name: string; type: 'number'; value: number }
  | { name: string; type: 'select'; value: string; options: string[] }
  | { name: string; type: 'bool'; value: boolean }
  | { name: string; type: 'key'; value: KeyArg };
export type Op = {
  id: string;
  name: string;
  group: string;
  desc?: string;
  params?: Param[];
  run: (input: Bytes, args: any[]) => Bytes | Promise<Bytes>;
};

const enc = new TextEncoder();
const dec = new TextDecoder();
export const utf8 = (s: string) => enc.encode(s);
export const text = (b: Bytes) => dec.decode(b);
const mapText = (f: (s: string, args: any[]) => string) => (b: Bytes, args: any[]) => utf8(f(text(b), args));

/* ---------- Codecs ---------- */
export function toBase64(b: Bytes, urlSafe = false) {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  const out = btoa(s);
  return urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out;
}
export function fromBase64(s: string) {
  s = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error('不是合法的 Base64');
  s = s.replace(/=+$/, '');
  if (s.length % 4 === 1) throw new Error('Base64 长度不对');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
export function fromHex(s: string) {
  const h = s.replace(/0x|\\x|%/gi, '').replace(/[^0-9a-f]/gi, '');
  if (h.length % 2) throw new Error('Hex 位数为奇数');
  return Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
}
export const hex = (b: Bytes, sep = '') => [...b].map((x) => x.toString(16).padStart(2, '0')).join(sep);

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function toBase32(b: Bytes) {
  let bits = 0, val = 0, out = '';
  for (const x of b) {
    val = (val << 8) | x;
    bits += 8;
    while (bits >= 5) out += B32[(val >>> (bits -= 5)) & 31];
  }
  if (bits) out += B32[(val << (5 - bits)) & 31];
  return out + '='.repeat((8 - (out.length % 8)) % 8);
}
function fromBase32(s: string) {
  s = s.toUpperCase().replace(/[\s=]/g, '');
  if (/[^A-Z2-7]/.test(s)) throw new Error('不是合法的 Base32');
  const out: number[] = [];
  let bits = 0, val = 0;
  for (const c of s) {
    val = (val << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) out.push((val >>> (bits -= 8)) & 255);
  }
  return Uint8Array.from(out);
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase58(b: Bytes) {
  let n = BigInt('0x' + (hex(b) || '0'));
  let out = '';
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const x of b) {
    if (x) break;
    out = '1' + out;
  }
  return out;
}
function fromBase58(s: string) {
  s = s.trim();
  let n = 0n;
  for (const c of s) {
    const i = B58.indexOf(c);
    if (i < 0) throw new Error(`Base58 非法字符 ${c}`);
    n = n * 58n + BigInt(i);
  }
  let h = n ? n.toString(16) : '';
  if (h.length % 2) h = '0' + h;
  const lead = s.match(/^1*/)![0].length;
  return Uint8Array.from([...new Array(lead).fill(0), ...fromHex(h)]);
}

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-',
  L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-',
  W: '.--', X: '-..-', Y: '-.--', Z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..',
  "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', _: '..--.-', '"': '.-..-.', $: '...-..-', '@': '.--.-.',
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

/* ---------- Hashes ---------- */
const MD5_S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
export function md5(data: Bytes) {
  const len = data.length;
  const blocks = ((len + 8) >>> 6) + 1;
  const buf = new Uint8Array(blocks * 64);
  buf.set(data);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(blocks * 64 - 8, (len * 8) >>> 0, true);
  dv.setUint32(blocks * 64 - 4, Math.floor((len * 8) / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < buf.length; off += 64) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) (F = (B & C) | (~B & D)), (g = i);
      else if (i < 32) (F = (D & B) | (~D & C)), (g = (5 * i + 1) % 16);
      else if (i < 48) (F = B ^ C ^ D), (g = (3 * i + 5) % 16);
      else (F = C ^ (B | ~D)), (g = (7 * i) % 16);
      F = (F + A + MD5_K[i] + dv.getUint32(off + g * 4, true)) >>> 0;
      const s = MD5_S[(i >> 4) * 4 + (i % 4)];
      A = D;
      D = C;
      C = B;
      B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const o = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => o.setUint32(i * 4, v, true));
  return out;
}

const CRC_T = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Bytes) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC_T[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const digest = async (alg: string, b: Bytes) => new Uint8Array(await crypto.subtle.digest(alg, b));
const hexOut = (b: Bytes) => utf8(hex(b));

/* ---------- Keys & ciphers ---------- */
export function keyBytes(k: KeyArg) {
  if (k.f === 'Hex') {
    if (/[^0-9a-f\s:]/i.test(k.v.replace(/0x|\\x/gi, ''))) throw new Error('密钥不是合法的 Hex，或把格式切到 UTF8');
    return fromHex(k.v);
  }
  if (k.f === 'Base64') return fromBase64(k.v);
  return utf8(k.v);
}

function rc4(data: Bytes, key: Bytes) {
  if (!key.length) throw new Error('密钥不能为空');
  const S = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 255;
    [S[i], S[j]] = [S[j], S[i]];
  }
  const out = new Uint8Array(data.length);
  for (let n = 0, i = 0, j = 0; n < data.length; n++) {
    i = (i + 1) & 255;
    j = (j + S[i]) & 255;
    [S[i], S[j]] = [S[j], S[i]];
    out[n] = data[n] ^ S[(S[i] + S[j]) & 255];
  }
  return out;
}

async function aes(decrypt: boolean, data: Bytes, [mode, k, iv]: [string, KeyArg, KeyArg]) {
  const key = keyBytes(k);
  if (key.length !== 16 && key.length !== 32) throw new Error(`密钥需 16 或 32 字节，当前 ${key.length} 字节`);
  const ivb = keyBytes(iv);
  const name = `AES-${mode}`;
  const need = mode === 'GCM' ? 12 : 16;
  if (ivb.length !== need) throw new Error(`${mode} 模式的 IV 需 ${need} 字节，当前 ${ivb.length} 字节`);
  const ck = await crypto.subtle.importKey('raw', key, name, false, [decrypt ? 'decrypt' : 'encrypt']);
  const algo =
    mode === 'CTR' ? { name, counter: ivb, length: 64 } : { name, iv: ivb };
  try {
    const r = await (decrypt ? crypto.subtle.decrypt(algo, ck, data) : crypto.subtle.encrypt(algo, ck, data));
    return new Uint8Array(r);
  } catch {
    throw new Error(decrypt ? '解密失败：密钥、IV 或模式不匹配' : '加密失败');
  }
}

async function pipe(b: Bytes, ts: TransformStream<Uint8Array, Uint8Array>) {
  try {
    return new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(ts)).arrayBuffer());
  } catch {
    throw new Error('数据格式不对，无法解压');
  }
}

function vigenere(s: string, key: string, sign: 1 | -1) {
  const k = key.toLowerCase().replace(/[^a-z]/g, '');
  if (!k) throw new Error('密钥需包含字母');
  let j = 0;
  return s.replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    const shift = (k.charCodeAt(j++ % k.length) - 97) * sign;
    return String.fromCharCode(((c.charCodeAt(0) - base + shift + 26) % 26) + base);
  });
}

const rot = (s: string, n: number) =>
  s.replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((((c.charCodeAt(0) - base + n) % 26) + 26) % 26) + base);
  });

/* ---------- Registry ---------- */
const HEX_SEP: Record<string, string> = { 无: '', 空格: ' ', '\\x': '\\x', '0x': ' 0x', ':': ':' };
const KEY = (name: string, v = '', f: KeyArg['f'] = 'UTF8'): Param => ({ name, type: 'key', value: { v, f } });

export const OPS: Op[] = [
  // 编码
  {
    id: 'b64e', name: 'To Base64', group: '编码',
    params: [{ name: 'URL 安全', type: 'bool', value: false }],
    run: (b, [u]) => utf8(toBase64(b, u)),
  },
  { id: 'b64d', name: 'From Base64', group: '编码', desc: '兼容 URL 安全字母表与缺省填充', run: (b) => fromBase64(text(b)) },
  {
    id: 'hexe', name: 'To Hex', group: '编码',
    params: [{ name: '分隔', type: 'select', value: '无', options: Object.keys(HEX_SEP) }],
    run: (b, [sep]) => {
      const s = HEX_SEP[sep];
      if (s === '\\x') return utf8(hex(b).replace(/../g, '\\x$&'));
      if (s === ' 0x') return utf8(hex(b, ' ').replace(/\b(?=[0-9a-f]{2}\b)/g, '0x'));
      return utf8(hex(b, s));
    },
  },
  { id: 'hexd', name: 'From Hex', group: '编码', desc: '忽略空格、0x、\\x 等分隔', run: (b) => fromHex(text(b)) },
  { id: 'urle', name: 'URL Encode', group: '编码',
    params: [{ name: '编码全部字符', type: 'bool', value: false }],
    run: mapText((s, [all]) => (all ? [...utf8(s)].map((x) => '%' + x.toString(16).toUpperCase().padStart(2, '0')).join('') : encodeURIComponent(s))),
  },
  { id: 'urld', name: 'URL Decode', group: '编码', run: mapText((s) => decodeURIComponent(s.replace(/\+/g, ' '))) },
  { id: 'b32e', name: 'To Base32', group: '编码', run: (b) => utf8(toBase32(b)) },
  { id: 'b32d', name: 'From Base32', group: '编码', run: (b) => fromBase32(text(b)) },
  { id: 'b58e', name: 'To Base58', group: '编码', desc: '比特币字母表', run: (b) => utf8(toBase58(b)) },
  { id: 'b58d', name: 'From Base58', group: '编码', run: (b) => fromBase58(text(b)) },
  { id: 'bine', name: 'To Binary', group: '编码', run: (b) => utf8([...b].map((x) => x.toString(2).padStart(8, '0')).join(' ')) },
  {
    id: 'bind', name: 'From Binary', group: '编码',
    run: (b) => {
      const s = text(b).replace(/[^01]/g, '');
      if (s.length % 8) throw new Error('位数不是 8 的倍数');
      return Uint8Array.from(s.match(/.{8}/g) ?? [], (x) => parseInt(x, 2));
    },
  },
  { id: 'dece', name: 'To Decimal', group: '编码', run: (b) => utf8([...b].join(' ')) },
  {
    id: 'decd', name: 'From Decimal', group: '编码',
    run: (b) => Uint8Array.from(text(b).match(/\d+/g) ?? [], (x) => {
      if (+x > 255) throw new Error(`${x} 超出字节范围`);
      return +x;
    }),
  },
  {
    id: 'htmle', name: 'HTML Entity Encode', group: '编码',
    params: [{ name: '编码全部字符', type: 'bool', value: false }],
    run: mapText((s, [all]) =>
      all
        ? [...s].map((c) => `&#${c.codePointAt(0)};`).join('')
        : s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!),
    ),
  },
  {
    id: 'htmld', name: 'HTML Entity Decode', group: '编码',
    run: mapText((s) => {
      const ta = document.createElement('textarea');
      ta.innerHTML = s;
      return ta.value;
    }),
  },
  {
    id: 'unie', name: 'Unicode Escape', group: '编码', desc: '非 ASCII 字符 → \\uXXXX',
    run: mapText((s) => [...s].map((c) => {
      const cp = c.codePointAt(0)!;
      if (cp < 128) return c;
      return cp > 0xffff ? `\\u{${cp.toString(16)}}` : '\\u' + cp.toString(16).padStart(4, '0');
    }).join('')),
  },
  {
    id: 'unid', name: 'Unicode Unescape', group: '编码', desc: '\\uXXXX、\\u{…}、\\xXX',
    run: mapText((s) =>
      s
        .replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))),
    ),
  },
  {
    id: 'morsee', name: 'To Morse', group: '编码',
    run: mapText((s) => s.toUpperCase().split(/\s+/).filter(Boolean).map((w) => [...w].map((c) => MORSE[c] ?? '').filter(Boolean).join(' ')).join(' / ')),
  },
  {
    id: 'morsed', name: 'From Morse', group: '编码',
    run: mapText((s) => s.trim().split(/\s*[/|]\s*|\s{3,}/).map((w) => w.split(/\s+/).map((c) => MORSE_REV[c] ?? '?').join('')).join(' ')),
  },

  // 文本
  {
    id: 'rot13', name: 'ROT13 / 凯撒', group: '古典密码',
    params: [{ name: '位移', type: 'number', value: 13 }],
    run: mapText((s, [n]) => rot(s, +n || 0)),
  },
  { id: 'rot47', name: 'ROT47', group: '古典密码', run: mapText((s) => s.replace(/[!-~]/g, (c) => String.fromCharCode(33 + ((c.charCodeAt(0) + 14) % 94)))) },
  { id: 'atbash', name: 'Atbash', group: '古典密码', run: mapText((s) => s.replace(/[a-z]/gi, (c) => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(b + 25 - (c.charCodeAt(0) - b)); })) },
  {
    id: 'vige', name: 'Vigenère 加密', group: '古典密码',
    params: [{ name: '密钥', type: 'text', value: 'KEY' }],
    run: mapText((s, [k]) => vigenere(s, k, 1)),
  },
  {
    id: 'vigd', name: 'Vigenère 解密', group: '古典密码',
    params: [{ name: '密钥', type: 'text', value: 'KEY' }],
    run: mapText((s, [k]) => vigenere(s, k, -1)),
  },
  {
    id: 'xor', name: 'XOR', group: '加密',
    params: [KEY('密钥', '00', 'Hex')],
    run: (b, [k]) => {
      const key = keyBytes(k);
      if (!key.length) throw new Error('密钥不能为空');
      return b.map((x, i) => x ^ key[i % key.length]);
    },
  },
  {
    id: 'aese', name: 'AES 加密', group: '加密', desc: 'WebCrypto；GCM 输出末尾附 16 字节 tag',
    params: [
      { name: '模式', type: 'select', value: 'CBC', options: ['CBC', 'CTR', 'GCM'] },
      KEY('密钥', '000102030405060708090a0b0c0d0e0f', 'Hex'),
      KEY('IV', '00000000000000000000000000000000', 'Hex'),
    ],
    run: (b, a) => aes(false, b, a as any),
  },
  {
    id: 'aesd', name: 'AES 解密', group: '加密', desc: 'CBC 自动去除 PKCS#7 填充',
    params: [
      { name: '模式', type: 'select', value: 'CBC', options: ['CBC', 'CTR', 'GCM'] },
      KEY('密钥', '000102030405060708090a0b0c0d0e0f', 'Hex'),
      KEY('IV', '00000000000000000000000000000000', 'Hex'),
    ],
    run: (b, a) => aes(true, b, a as any),
  },
  { id: 'rc4', name: 'RC4', group: '加密', desc: '加解密同一操作', params: [KEY('密钥', 'secret')], run: (b, [k]) => rc4(b, keyBytes(k)) },

  // 哈希
  { id: 'md5', name: 'MD5', group: '哈希', run: (b) => hexOut(md5(b)) },
  { id: 'sha1', name: 'SHA-1', group: '哈希', run: async (b) => hexOut(await digest('SHA-1', b)) },
  { id: 'sha256', name: 'SHA-256', group: '哈希', run: async (b) => hexOut(await digest('SHA-256', b)) },
  { id: 'sha384', name: 'SHA-384', group: '哈希', run: async (b) => hexOut(await digest('SHA-384', b)) },
  { id: 'sha512', name: 'SHA-512', group: '哈希', run: async (b) => hexOut(await digest('SHA-512', b)) },
  {
    id: 'hmac', name: 'HMAC', group: '哈希',
    params: [{ name: '算法', type: 'select', value: 'SHA-256', options: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] }, KEY('密钥', 'key')],
    run: async (b, [h, k]) => {
      const key = keyBytes(k);
      if (!key.length) throw new Error('密钥不能为空');
      const ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: h }, false, ['sign']);
      return hexOut(new Uint8Array(await crypto.subtle.sign('HMAC', ck, b)));
    },
  },
  { id: 'crc32', name: 'CRC32', group: '哈希', run: (b) => utf8(crc32(b).toString(16).padStart(8, '0')) },

  // 压缩
  { id: 'gzip', name: 'Gzip', group: '压缩', run: (b) => pipe(b, new CompressionStream('gzip')) },
  { id: 'gunzip', name: 'Gunzip', group: '压缩', run: (b) => pipe(b, new DecompressionStream('gzip')) },
  { id: 'deflate', name: 'Raw Deflate', group: '压缩', run: (b) => pipe(b, new CompressionStream('deflate-raw')) },
  { id: 'inflate', name: 'Raw Inflate', group: '压缩', run: (b) => pipe(b, new DecompressionStream('deflate-raw')) },
  { id: 'zinflate', name: 'Zlib Inflate', group: '压缩', run: (b) => pipe(b, new DecompressionStream('deflate')) },

  // 文本
  {
    id: 'jsonf', name: 'JSON 格式化', group: '文本',
    params: [{ name: '缩进', type: 'select', value: '2', options: ['2', '4', 'Tab', '压缩'] }],
    run: mapText((s, [ind]) => {
      let v: unknown;
      try {
        v = JSON.parse(s);
      } catch (e) {
        throw new Error('不是合法的 JSON');
      }
      return ind === '压缩' ? JSON.stringify(v) : JSON.stringify(v, null, ind === 'Tab' ? '\t' : +ind);
    }),
  },
  { id: 'rev', name: '反转', group: '文本', run: mapText((s) => [...s].reverse().join('')) },
  { id: 'upper', name: '转大写', group: '文本', run: mapText((s) => s.toUpperCase()) },
  { id: 'lower', name: '转小写', group: '文本', run: mapText((s) => s.toLowerCase()) },
  {
    id: 'ts', name: 'Unix 时间戳', group: '文本', desc: '秒或毫秒 → 本地时间与 UTC',
    run: mapText((s) =>
      (s.match(/\d{9,13}/g) ?? [])
        .map((t) => {
          const d = new Date(t.length > 11 ? +t : +t * 1000);
          return `${t} → ${d.toLocaleString('zh-CN', { hour12: false })}  (${d.toISOString()})`;
        })
        .join('\n') || (() => { throw new Error('没有找到时间戳'); })(),
    ),
  },
];

export const OP = Object.fromEntries(OPS.map((o) => [o.id, o]));

/* ---------- Magic: peel known encodings layer by layer ---------- */
const printable = (b: Bytes) => {
  if (!b.length) return false;
  let s: string;
  try {
    s = new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return false;
  }
  const bad = [...s].filter((c) => /[\x00-\x08\x0e-\x1f\x7f�]/.test(c)).length;
  return bad / s.length < 0.02;
};

const CANDIDATES: [string, (s: string, b: Bytes) => boolean][] = [
  ['gunzip', (_, b) => b[0] === 0x1f && b[1] === 0x8b],
  ['bind', (s) => /^[01]{8}(?:\s?[01]{8})*$/.test(s.trim())],
  ['morsed', (s) => /^[.\-]+(?:[ /|]+[.\-]+)+$/.test(s.trim())],
  ['hexd', (s) => /^(?:(?:0x|\\x)?[0-9a-f]{2}[\s:,]?){4,}$/i.test(s.trim())],
  ['b32d', (s) => /^[A-Z2-7]{8,}=*$/.test(s.trim()) && s.trim().length % 8 === 0],
  ['b64d', (s) => /^[A-Za-z0-9+/_-]{8,}={0,2}$/.test(s.replace(/\s+/g, ''))],
  ['urld', (s) => /%[0-9a-f]{2}/i.test(s)],
  ['htmld', (s) => /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(s)],
  ['unid', (s) => /\\u[0-9a-f]{4}|\\x[0-9a-f]{2}/i.test(s)],
];

export async function magic(input: Bytes) {
  const steps: string[] = [];
  let cur = input;
  for (let depth = 0; depth < 10; depth++) {
    let s = '';
    try {
      s = new TextDecoder('utf-8', { fatal: true }).decode(cur);
    } catch {}
    let next: Bytes | null = null;
    for (const [id, test] of CANDIDATES) {
      if (!test(s, cur)) continue;
      try {
        const out = await OP[id].run(cur, []);
        // Accept a layer if it yields text, or binary that another layer can still peel (gzip)
        if (out.length && (printable(out) || (out[0] === 0x1f && out[1] === 0x8b))) {
          if (text(out) === s) continue;
          next = out;
          steps.push(id);
          break;
        }
      } catch {}
    }
    if (!next) break;
    cur = next;
  }
  return steps;
}
