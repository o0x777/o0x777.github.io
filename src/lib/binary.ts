// Static file dissection for /tools/sample/: PE, ELF and ZIP/APK headers,
// entropy, strings and suspicious-API tagging. Pure parsing, nothing executes.

export type Section = { name: string; va: number; vsize: number; off: number; size: number; flags: string; entropy: number };
export type Fact = [label: string, value: string, note?: string];
export type Flag = { sev: 'high' | 'mid' | 'low' | 'info'; text: string };
export type Mitigation = { name: string; on: boolean; note?: string };
export type ImportGroup = { lib: string; fns: string[] };
export type Report = {
  kind: string;
  facts: Fact[];
  sections: Section[];
  imports: ImportGroup[];
  exports: string[];
  mitigations: Mitigation[];
  flags: Flag[];
  imphashInput?: string;
  extra?: { title: string; rows: string[][] };
};

/* ---------- Entropy & strings ---------- */
export function entropy(b: Uint8Array, start = 0, end = b.length) {
  const n = end - start;
  if (n <= 0) return 0;
  const c = new Uint32Array(256);
  for (let i = start; i < end; i++) c[b[i]]++;
  let h = 0;
  for (const x of c) if (x) h -= (x / n) * Math.log2(x / n);
  return h;
}

export function entropyBlocks(b: Uint8Array, maxBlocks = 800) {
  const size = Math.max(256, Math.ceil(b.length / maxBlocks));
  const out: number[] = [];
  for (let i = 0; i < b.length; i += size) out.push(entropy(b, i, Math.min(b.length, i + size)));
  return { size, values: out };
}

export type Str = { off: number; s: string; wide: boolean; tag?: string };
const STR_TAGS: [string, RegExp][] = [
  ['PDB', /\.pdb$/i],
  ['URL', /\b(?:https?|ftp):\/\/[^\s"'<>]{3,}/i],
  ['IP', /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/],
  ['注册表', /\b(?:HKEY_|HKLM\\|HKCU\\|SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run)/i],
  ['命令', /\b(?:cmd(?:\.exe)?\s+\/c|powershell|bash\s+-c|\/bin\/sh|wget\s|curl\s|schtasks|vssadmin|bcdedit|certutil)/i],
  ['路径', /\b[A-Z]:\\[^\s"]{3,}|%(?:APPDATA|TEMP|SYSTEMROOT|PROGRAMDATA)%|\/(?:tmp|etc|proc|dev\/shm)\/\w/i],
  ['邮箱', /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/],
  ['加密货币', /\b(?:bc1[a-z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40})\b/],
];

// Version strings (1.0.0.0, 6.1.7601.17514) look like IPs; drop those
const realIp = (s: string) => {
  if (/version|\bv\d|assembly/i.test(s)) return false;
  const m = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/.exec(s);
  return !!m && m.slice(1).some((x) => +x >= 32);
};

export function extractStrings(b: Uint8Array, min = 5, cap = 6000): Str[] {
  const out: Str[] = [];
  const printable = (x: number) => (x >= 0x20 && x < 0x7f) || x === 9;
  // ASCII
  for (let i = 0; i < b.length && out.length < cap; ) {
    if (!printable(b[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < b.length && printable(b[j])) j++;
    if (j - i >= min) out.push({ off: i, s: String.fromCharCode(...b.subarray(i, Math.min(j, i + 400))), wide: false });
    i = j + 1;
  }
  // UTF-16LE
  for (let i = 0; i + 1 < b.length && out.length < cap * 2; ) {
    if (!(printable(b[i]) && b[i + 1] === 0)) {
      i++;
      continue;
    }
    let j = i;
    let s = '';
    while (j + 1 < b.length && printable(b[j]) && b[j + 1] === 0) {
      if (s.length < 400) s += String.fromCharCode(b[j]);
      j += 2;
    }
    if ((j - i) / 2 >= min) out.push({ off: i, s, wide: true });
    i = j;
  }
  for (const x of out) x.tag = STR_TAGS.find(([t, re]) => re.test(x.s) && (t !== 'IP' || realIp(x.s)))?.[0];
  return out.sort((a, b) => a.off - b.off);
}

/* ---------- Suspicious APIs ---------- */
const API_TAGS: Record<string, string[]> = {
  进程注入: ['VirtualAllocEx', 'WriteProcessMemory', 'CreateRemoteThread', 'NtCreateThreadEx', 'RtlCreateUserThread', 'QueueUserAPC', 'NtQueueApcThread', 'SetThreadContext', 'NtUnmapViewOfSection', 'ZwUnmapViewOfSection', 'NtWriteVirtualMemory'],
  动态加载: ['LoadLibrary', 'GetProcAddress', 'LdrLoadDll', 'LdrGetProcedureAddress', 'dlopen', 'dlsym'],
  反调试: ['IsDebuggerPresent', 'CheckRemoteDebuggerPresent', 'NtQueryInformationProcess', 'OutputDebugString', 'NtSetInformationThread', 'ptrace'],
  网络: ['InternetOpen', 'InternetOpenUrl', 'InternetConnect', 'HttpOpenRequest', 'HttpSendRequest', 'URLDownloadToFile', 'WinHttpOpen', 'WinHttpConnect', 'WinHttpSendRequest', 'WSAStartup', 'socket', 'connect', 'gethostbyname', 'getaddrinfo', 'send', 'recv'],
  命令执行: ['WinExec', 'ShellExecute', 'CreateProcess', 'CreateProcessAsUser', 'system', 'popen', 'execve', 'execl', 'execvp', 'fork'],
  持久化: ['RegSetValue', 'RegCreateKey', 'CreateService', 'StartService', 'ChangeServiceConfig'],
  钩子键盘: ['SetWindowsHookEx', 'GetAsyncKeyState', 'GetKeyboardState', 'RegisterRawInputDevices'],
  加密: ['CryptEncrypt', 'CryptDecrypt', 'CryptAcquireContext', 'CryptGenKey', 'CryptImportKey', 'BCryptEncrypt', 'BCryptDecrypt', 'BCryptGenerateSymmetricKey'],
  提权: ['AdjustTokenPrivileges', 'OpenProcessToken', 'LookupPrivilegeValue', 'ImpersonateLoggedOnUser', 'DuplicateTokenEx'],
  内存权限: ['VirtualProtect', 'VirtualProtectEx', 'mprotect', 'NtProtectVirtualMemory'],
  枚举进程: ['CreateToolhelp32Snapshot', 'Process32First', 'Process32Next', 'EnumProcesses'],
};
const API_INDEX = new Map(Object.entries(API_TAGS).flatMap(([tag, names]) => names.map((n) => [n, tag] as const)));
/** Category for an imported function, ignoring A/W/Ex suffixes. */
export function apiTag(fn: string) {
  return API_INDEX.get(fn) ?? API_INDEX.get(fn.replace(/(?:Ex)?[AW]$/, '')) ?? API_INDEX.get(fn.replace(/Ex$/, ''));
}

/* ---------- Helpers ---------- */
const cstr = (b: Uint8Array, off: number, max = 256) => {
  let s = '';
  for (let i = off; i < b.length && i < off + max && b[i]; i++) s += String.fromCharCode(b[i]);
  return s;
};
const latin1 = (b: Uint8Array) => new TextDecoder('latin1').decode(b);
const hex = (n: number | bigint, pad = 8) => '0x' + n.toString(16).toUpperCase().padStart(pad, '0');
const date = (sec: number) => new Date(sec * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

const PACKERS: [RegExp, string][] = [
  [/^UPX\d?$/i, 'UPX'],
  [/^\.aspack|^\.adata$/i, 'ASPack'],
  [/^\.MPRESS/i, 'MPRESS'],
  [/^\.themida|^\.winlice/i, 'Themida / WinLicense'],
  [/^\.vmp\d/i, 'VMProtect'],
  [/^\.enigma/i, 'Enigma Protector'],
  [/^\.petite|^petite$/i, 'Petite'],
  [/^\.nsp\d|^nsp\d/i, 'NsPack'],
  [/^\.packed$|^\.RLPack/i, 'RLPack'],
  [/^PEC2|^PECompact2/i, 'PECompact'],
];

/* ---------- PE ---------- */
const MACHINES: Record<number, string> = { 0x14c: 'x86', 0x8664: 'x86-64', 0xaa64: 'ARM64', 0x1c0: 'ARM', 0x1c4: 'ARMv7 Thumb-2', 0x200: 'IA-64' };
const SUBSYSTEMS: Record<number, string> = { 1: 'Native（驱动）', 2: 'Windows GUI', 3: 'Windows 控制台', 9: 'Windows CE', 10: 'EFI 应用', 11: 'EFI 引导驱动', 12: 'EFI 运行时驱动', 14: 'Xbox', 16: 'Windows 启动应用' };

export function parsePE(b: Uint8Array): Report | null {
  if (b.length < 0x40 || b[0] !== 0x4d || b[1] !== 0x5a) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const peOff = dv.getUint32(0x3c, true);
  if (peOff + 24 > b.length || dv.getUint32(peOff, true) !== 0x4550) return null;

  const machine = dv.getUint16(peOff + 4, true);
  const nSec = dv.getUint16(peOff + 6, true);
  const ts = dv.getUint32(peOff + 8, true);
  const optSize = dv.getUint16(peOff + 20, true);
  const chars = dv.getUint16(peOff + 22, true);
  const opt = peOff + 24;
  const magic = dv.getUint16(opt, true);
  const is64 = magic === 0x20b;
  const entry = dv.getUint32(opt + 16, true);
  const imageBase = is64 ? dv.getBigUint64(opt + 24, true) : BigInt(dv.getUint32(opt + 28, true));
  const subsystem = dv.getUint16(opt + 68, true);
  const dllChars = dv.getUint16(opt + 70, true);
  const nDirs = dv.getUint32(opt + (is64 ? 108 : 92), true);
  const dirBase = opt + (is64 ? 112 : 96);
  const dir = (i: number) => (i < nDirs ? { rva: dv.getUint32(dirBase + i * 8, true), size: dv.getUint32(dirBase + i * 8 + 4, true) } : { rva: 0, size: 0 });

  const sections: Section[] = [];
  const secTable = opt + optSize;
  for (let i = 0; i < nSec && secTable + (i + 1) * 40 <= b.length; i++) {
    const s = secTable + i * 40;
    const ch = dv.getUint32(s + 36, true);
    const off = dv.getUint32(s + 20, true);
    const size = dv.getUint32(s + 16, true);
    sections.push({
      name: cstr(b, s, 8),
      vsize: dv.getUint32(s + 8, true),
      va: dv.getUint32(s + 12, true),
      size,
      off,
      flags: (ch & 0x40000000 ? 'R' : '-') + (ch & 0x80000000 ? 'W' : '-') + (ch & 0x20000000 ? 'X' : '-'),
      entropy: entropy(b, off, Math.min(b.length, off + size)),
    });
  }
  const rva2off = (rva: number) => {
    for (const s of sections) if (rva >= s.va && rva < s.va + Math.max(s.vsize, s.size)) return rva - s.va + s.off;
    return rva < (sections[0]?.va ?? 0x1000) ? rva : -1;
  };
  const strAt = (rva: number, max = 256) => {
    const o = rva2off(rva);
    return o >= 0 ? cstr(b, o, max) : '';
  };

  // Imports
  const imports: ImportGroup[] = [];
  const impParts: string[] = [];
  const imp = dir(1);
  let o = imp.rva ? rva2off(imp.rva) : -1;
  for (let guard = 0; o >= 0 && o + 20 <= b.length && guard < 512; o += 20, guard++) {
    const oft = dv.getUint32(o, true);
    const nameRva = dv.getUint32(o + 12, true);
    const ft = dv.getUint32(o + 16, true);
    if (!nameRva && !ft) break;
    const lib = strAt(nameRva, 128);
    const fns: string[] = [];
    let t = rva2off(oft || ft);
    const step = is64 ? 8 : 4;
    for (let k = 0; t >= 0 && t + step <= b.length && k < 4096; t += step, k++) {
      const lo = dv.getUint32(t, true);
      const hi = is64 ? dv.getUint32(t + 4, true) : 0;
      if (!lo && !hi) break;
      const byOrdinal = is64 ? hi & 0x80000000 : lo & 0x80000000;
      fns.push(byOrdinal ? `ord${lo & 0xffff}` : strAt(lo + 2, 256));
    }
    imports.push({ lib, fns });
    const base = lib.toLowerCase().replace(/\.(dll|ocx|sys)$/, '');
    for (const f of fns) impParts.push(`${base}.${f.toLowerCase()}`);
  }

  // Exports
  const exports: string[] = [];
  const exp = dir(0);
  const eo = exp.rva ? rva2off(exp.rva) : -1;
  if (eo >= 0 && eo + 40 <= b.length) {
    const n = dv.getUint32(eo + 24, true);
    const names = rva2off(dv.getUint32(eo + 32, true));
    for (let i = 0; names >= 0 && i < Math.min(n, 2000); i++) exports.push(strAt(dv.getUint32(names + i * 4, true), 256));
  }

  // Rich header: XOR-masked compiler fingerprint between the DOS stub and PE header
  let rich: string[][] | undefined;
  for (let i = 0x80; i + 8 <= peOff; i += 4) {
    if (dv.getUint32(i, true) !== 0x68636952) continue; // "Rich"
    const key = dv.getUint32(i + 4, true);
    let start = -1;
    for (let j = i - 4; j >= 0x40; j -= 4) if ((dv.getUint32(j, true) ^ key) === 0x536e6144) { start = j; break; } // "DanS"
    if (start < 0) break;
    rich = [];
    for (let j = start + 16; j < i; j += 8) {
      const id = dv.getUint32(j, true) ^ key;
      const count = dv.getUint32(j + 4, true) ^ key;
      rich.push([`0x${(id >>> 16).toString(16).padStart(4, '0')}`, String(id & 0xffff), String(count)]);
    }
    break;
  }

  // Overlay: bytes after the last section's raw data
  const rawEnd = Math.max(0, ...sections.map((s) => s.off + s.size));
  const cert = dir(4);
  const overlay = b.length - Math.max(rawEnd, cert.rva && cert.rva >= rawEnd ? cert.rva + cert.size : 0);

  const mitigations: Mitigation[] = [
    { name: 'ASLR', on: !!(dllChars & 0x40) },
    { name: 'DEP / NX', on: !!(dllChars & 0x100) },
    { name: 'CFG', on: !!(dllChars & 0x4000) },
    ...(is64 ? [{ name: 'High-Entropy VA', on: !!(dllChars & 0x20) }] : []),
    { name: 'Authenticode', on: cert.size > 0, note: cert.size ? '含签名（未校验有效性）' : '未签名' },
  ];

  const flags: Flag[] = [];
  const isNet = dir(14).rva !== 0;
  const isDll = !!(chars & 0x2000);
  for (const s of sections) {
    const p = PACKERS.find(([re]) => re.test(s.name));
    if (p) flags.push({ sev: 'mid', text: `节区名 ${s.name} 指向 ${p[1]} 加壳` });
  }
  const hot = sections.filter((s) => s.flags.includes('X') && s.entropy > 7.2 && s.size > 1024);
  if (hot.length) flags.push({ sev: 'mid', text: `可执行节 ${hot.map((s) => s.name || '?').join('、')} 熵 > 7.2，疑似压缩或加密` });
  const wx = sections.filter((s) => s.flags.includes('W') && s.flags.includes('X'));
  if (wx.length) flags.push({ sev: 'mid', text: `节区 ${wx.map((s) => s.name || '?').join('、')} 同时可写可执行` });
  const entrySec = sections.find((s) => entry >= s.va && entry < s.va + Math.max(s.vsize, s.size));
  if (entry && !isNet && entrySec && !/^\.text|^CODE|^\.code/i.test(entrySec.name))
    flags.push({ sev: 'low', text: `入口点位于 ${entrySec.name || '无名节'}，而非 .text` });
  const nImp = impParts.length;
  if (!isNet && nImp > 0 && nImp < 10 && imports.some((g) => g.fns.some((f) => /^(LoadLibrary|GetProcAddress)/.test(f))))
    flags.push({ sev: 'mid', text: `仅 ${nImp} 个导入且含 LoadLibrary / GetProcAddress，API 很可能运行时解析` });
  if (dir(9).rva) flags.push({ sev: 'low', text: '存在 TLS 目录：代码可能在入口点之前执行' });
  if (overlay > 512) flags.push({ sev: 'low', text: `文件尾部附加数据 ${overlay.toLocaleString()} 字节（Overlay）` });
  const now = Date.now() / 1000;
  if (ts > now + 86400) flags.push({ sev: 'info', text: '编译时间戳在未来：可能是可复现构建的哈希值，或被伪造' });
  if (isNet) flags.push({ sev: 'info', text: '.NET 程序集：逻辑在 IL 中，建议用 dnSpy / ILSpy 继续分析' });

  const facts: Fact[] = [
    ['格式', `${is64 ? 'PE32+' : 'PE32'} ${isDll ? 'DLL' : chars & 0x0002 ? 'EXE' : '映像'}${isNet ? ' · .NET' : ''}`],
    ['架构', MACHINES[machine] ?? hex(machine, 4)],
    ['子系统', SUBSYSTEMS[subsystem] ?? String(subsystem)],
    ['编译时间', ts ? date(ts) : '0（被清空）', ts > now + 86400 ? '在未来' : undefined],
    ['入口点', hex(entry), entrySec ? `位于 ${entrySec.name}` : undefined],
    ['映像基址', hex(imageBase, is64 ? 16 : 8)],
    ['节区 / 导入', `${sections.length} 个节 · ${imports.length} 个库 ${nImp} 个函数`],
  ];

  return {
    kind: 'PE',
    facts,
    sections,
    imports,
    exports,
    mitigations,
    flags,
    imphashInput: impParts.join(','),
    extra: rich?.length ? { title: 'Rich Header', rows: [['ProdID', 'Build', '次数'], ...rich] } : undefined,
  };
}

/* ---------- ELF ---------- */
const ELF_MACHINES: Record<number, string> = { 3: 'x86', 0x3e: 'x86-64', 0x28: 'ARM', 0xb7: 'AArch64', 8: 'MIPS', 0x14: 'PowerPC', 0x15: 'PowerPC64', 0xf3: 'RISC-V', 0x2b: 'SPARC V9', 0x16: 'S390', 0x102: 'LoongArch' };
const ELF_TYPES: Record<number, string> = { 1: '可重定位 (.o)', 2: '可执行', 3: '共享对象 / PIE', 4: 'Core dump' };

export function parseELF(b: Uint8Array): Report | null {
  if (b.length < 52 || b[0] !== 0x7f || b[1] !== 0x45 || b[2] !== 0x4c || b[3] !== 0x46) return null;
  const is64 = b[4] === 2;
  const le = b[5] === 1;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = (o: number) => dv.getUint16(o, le);
  const u32 = (o: number) => dv.getUint32(o, le);
  const addr = (o: number) => (is64 ? Number(dv.getBigUint64(o, le)) : u32(o));

  const type = u16(16);
  const machine = u16(18);
  const entry = addr(24);
  const phoff = addr(is64 ? 32 : 28);
  const shoff = addr(is64 ? 40 : 32);
  const phentsize = u16(is64 ? 54 : 42);
  const phnum = u16(is64 ? 56 : 44);
  const shentsize = u16(is64 ? 58 : 46);
  const shnum = u16(is64 ? 60 : 48);
  const shstrndx = u16(is64 ? 62 : 50);

  type Sh = { name: number; type: number; flags: number; addr: number; off: number; size: number; link: number; entsize: number };
  const shs: Sh[] = [];
  for (let i = 0; i < shnum && shoff + (i + 1) * shentsize <= b.length; i++) {
    const s = shoff + i * shentsize;
    shs.push(
      is64
        ? { name: u32(s), type: u32(s + 4), flags: Number(dv.getBigUint64(s + 8, le)), addr: addr(s + 16), off: addr(s + 24), size: addr(s + 32), link: u32(s + 40), entsize: addr(s + 56) }
        : { name: u32(s), type: u32(s + 4), flags: u32(s + 8), addr: u32(s + 12), off: u32(s + 16), size: u32(s + 20), link: u32(s + 24), entsize: u32(s + 36) },
    );
  }
  const strtab = shs[shstrndx];
  const sections: Section[] = shs
    .map((s) => ({
      name: strtab ? cstr(b, strtab.off + s.name, 64) : '',
      va: s.addr,
      vsize: s.size,
      off: s.off,
      size: s.type === 8 ? 0 : s.size, // SHT_NOBITS (.bss) has no file bytes
      flags: (s.flags & 2 ? 'R' : '-') + (s.flags & 1 ? 'W' : '-') + (s.flags & 4 ? 'X' : '-'),
      entropy: s.type === 8 ? 0 : entropy(b, s.off, Math.min(b.length, s.off + s.size)),
    }))
    .filter((s, i) => i > 0 || s.name);

  // Program headers → mitigations
  let nx = true, relro = false, interp = '', hasPh = false;
  for (let i = 0; i < phnum && phoff + (i + 1) * phentsize <= b.length; i++) {
    hasPh = true;
    const p = phoff + i * phentsize;
    const pt = u32(p);
    const pflags = is64 ? u32(p + 4) : u32(p + 24);
    if (pt === 0x6474e551) nx = !(pflags & 1);
    if (pt === 0x6474e552) relro = true;
    if (pt === 3) interp = cstr(b, addr(p + (is64 ? 8 : 4)), 128);
  }

  // Dynamic symbols & DT_NEEDED
  const imported: string[] = [];
  const exported: string[] = [];
  const needed: string[] = [];
  let bindNow = false;
  const dynsym = shs.find((s) => s.type === 11);
  if (dynsym && shs[dynsym.link]) {
    const str = shs[dynsym.link];
    const ent = dynsym.entsize || (is64 ? 24 : 16);
    for (let o = dynsym.off + ent; o + ent <= Math.min(b.length, dynsym.off + dynsym.size); o += ent) {
      const name = cstr(b, str.off + u32(o), 256);
      if (!name) continue;
      const shndx = is64 ? u16(o + 6) : u16(o + 14);
      (shndx === 0 ? imported : exported).push(name);
    }
  }
  const dynamic = shs.find((s) => s.type === 6);
  if (dynamic && shs[dynamic.link]) {
    const str = shs[dynamic.link];
    const ent = is64 ? 16 : 8;
    for (let o = dynamic.off; o + ent <= Math.min(b.length, dynamic.off + dynamic.size); o += ent) {
      const tag = is64 ? Number(dv.getBigInt64(o, le)) : dv.getInt32(o, le);
      const val = is64 ? Number(dv.getBigUint64(o + 8, le)) : u32(o + 4);
      if (tag === 0) break;
      if (tag === 1) needed.push(cstr(b, str.off + val, 128));
      if (tag === 24 || (tag === 30 && val & 8) || (tag === 0x6ffffffb && val & 1)) bindNow = true;
    }
  }
  const has = (n: string) => imported.includes(n);
  const stripped = !shs.some((s) => s.type === 2);

  const mitigations: Mitigation[] = [
    { name: 'NX', on: nx, note: hasPh ? undefined : '无程序头' },
    { name: 'PIE', on: type === 3, note: type === 3 && !interp ? '共享库' : undefined },
    { name: 'RELRO', on: relro, note: relro ? (bindNow ? 'Full' : 'Partial') : undefined },
    { name: 'Stack Canary', on: has('__stack_chk_fail') || has('__stack_chk_guard') },
    { name: 'FORTIFY', on: imported.some((n) => /_chk$/.test(n) && n !== '__stack_chk_fail') },
    { name: '符号表', on: !stripped, note: stripped ? '已去除' : '保留' },
  ];

  const flags: Flag[] = [];
  if (!nx) flags.push({ sev: 'mid', text: '栈可执行（PT_GNU_STACK 带 X）' });
  if (!shs.length) flags.push({ sev: 'mid', text: '没有节区头：常见于加壳或刻意抹除' });
  if (sections.some((s) => /^UPX/i.test(s.name)) || /UPX!/.test(latin1(b.subarray(0, 4096))))
    flags.push({ sev: 'mid', text: '发现 UPX 特征，样本被加壳' });
  const hot = sections.filter((s) => s.flags.includes('X') && s.entropy > 7.2 && s.size > 1024);
  if (hot.length) flags.push({ sev: 'mid', text: `可执行节 ${hot.map((s) => s.name).join('、')} 熵 > 7.2` });
  if (!dynsym && type === 2) flags.push({ sev: 'info', text: '静态链接：不依赖系统库，常见于 IoT 恶意软件与 Go 程序' });
  if (sections.some((s) => s.name === '.gopclntab' || s.name === '.go.buildinfo')) flags.push({ sev: 'info', text: 'Go 编译产物' });

  const facts: Fact[] = [
    ['格式', `ELF${is64 ? '64' : '32'} ${le ? '小端' : '大端'}`],
    ['类型', ELF_TYPES[type] ?? String(type)],
    ['架构', ELF_MACHINES[machine] ?? hex(machine, 4)],
    ['入口点', hex(entry, is64 ? 12 : 8)],
    ['解释器', interp || (dynsym ? '—' : '无（静态）')],
    ['依赖库', needed.join('、') || '—'],
    ['节区 / 符号', `${sections.length} 个节 · 导入 ${imported.length} · 导出 ${exported.length}`],
  ];

  return {
    kind: 'ELF',
    facts,
    sections,
    imports: imported.length ? [{ lib: needed.length ? needed.join(' / ') : '动态符号', fns: imported }] : [],
    exports: exported,
    mitigations,
    flags,
  };
}

/* ---------- ZIP / APK / JAR / Office ---------- */
export function parseZIP(b: Uint8Array): Report | null {
  if (b.length < 22 || b[0] !== 0x50 || b[1] !== 0x4b) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--)
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) return null;
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const rows: string[][] = [['文件', '压缩前', '压缩后']];
  const names: string[] = [];
  let encrypted = 0, total = 0;
  for (let i = 0; i < n && p + 46 <= b.length && dv.getUint32(p, true) === 0x02014b50; i++) {
    const flags = dv.getUint16(p + 8, true);
    const csize = dv.getUint32(p + 20, true);
    const usize = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true);
    const el = dv.getUint16(p + 30, true);
    const cl = dv.getUint16(p + 32, true);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl));
    names.push(name);
    if (flags & 1) encrypted++;
    total += usize;
    if (rows.length <= 400) rows.push([name, usize.toLocaleString(), csize.toLocaleString()]);
    p += 46 + nl + el + cl;
  }
  const has = (re: RegExp) => names.some((x) => re.test(x));
  const kind = has(/^AndroidManifest\.xml$/)
    ? 'APK'
    : has(/^META-INF\/MANIFEST\.MF$/) && has(/\.class$/)
      ? 'JAR'
      : has(/^word\//)
        ? 'DOCX'
        : has(/^xl\//)
          ? 'XLSX'
          : has(/^ppt\//)
            ? 'PPTX'
            : has(/^[^/]+\.dist-info\//)
              ? 'Python Wheel'
              : 'ZIP';

  const flags: Flag[] = [];
  if (encrypted) flags.push({ sev: 'low', text: `${encrypted} 个文件加密，常用于绕过网关扫描` });
  if (b.length && total / b.length > 100) flags.push({ sev: 'mid', text: `压缩比 ${Math.round(total / b.length)}:1，警惕压缩炸弹` });
  if (has(/\.(exe|scr|dll|js|vbs|hta|lnk|bat|ps1|iso)$/i) && kind !== 'APK')
    flags.push({ sev: 'mid', text: '包内含可执行或脚本文件' });
  if (kind.startsWith('DOC') || kind.startsWith('XLS') || kind.startsWith('PPT')) {
    if (has(/vbaProject\.bin$/i)) flags.push({ sev: 'high', text: '文档含 VBA 宏 (vbaProject.bin)' });
    if (has(/oleObject\d*\.bin$/i)) flags.push({ sev: 'mid', text: '文档嵌入 OLE 对象' });
  }
  if (kind === 'APK') {
    const dex = names.filter((x) => /^classes\d*\.dex$/.test(x)).length;
    const abis = [...new Set(names.map((x) => /^lib\/([^/]+)\//.exec(x)?.[1]).filter(Boolean))];
    if (dex > 1) flags.push({ sev: 'info', text: `${dex} 个 dex（MultiDex）` });
    if (abis.length) flags.push({ sev: 'info', text: `原生库 ABI：${abis.join('、')}` });
    if (!has(/^META-INF\/.*\.(RSA|DSA|EC)$/i)) flags.push({ sev: 'info', text: '未发现 v1 签名文件，可能仅有 v2/v3 签名块' });
    if (has(/^assets\/.*\.(dex|jar|apk|so)$/i)) flags.push({ sev: 'mid', text: 'assets 中藏有 dex / jar / so，常见于动态加载与加固' });
  }

  return {
    kind,
    facts: [
      ['格式', kind],
      ['条目', `${n.toLocaleString()} 个`],
      ['解压后', `${total.toLocaleString()} 字节`],
    ],
    sections: [],
    imports: [],
    exports: [],
    mitigations: [],
    flags,
    extra: { title: '内容', rows },
  };
}

/* ---------- Magic sniffing for everything else ---------- */
const MAGICS: [number[], string][] = [
  [[0xcf, 0xfa, 0xed, 0xfe], 'Mach-O 64 位'],
  [[0xce, 0xfa, 0xed, 0xfe], 'Mach-O 32 位'],
  [[0xca, 0xfe, 0xba, 0xbe], 'Mach-O Universal / Java Class'],
  [[0x64, 0x65, 0x78, 0x0a], 'Android DEX'],
  [[0x25, 0x50, 0x44, 0x46], 'PDF'],
  [[0xd0, 0xcf, 0x11, 0xe0], 'OLE2（旧版 Office / MSI）'],
  [[0x1f, 0x8b], 'Gzip'],
  [[0x37, 0x7a, 0xbc, 0xaf], '7-Zip'],
  [[0x52, 0x61, 0x72, 0x21], 'RAR'],
  [[0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00], 'Windows 快捷方式 (LNK)'],
  [[0x89, 0x50, 0x4e, 0x47], 'PNG'],
  [[0xff, 0xd8, 0xff], 'JPEG'],
  [[0x00, 0x61, 0x73, 0x6d], 'WebAssembly'],
  [[0x23, 0x21], '脚本 (#!)'],
];
export function sniff(b: Uint8Array) {
  for (const [m, name] of MAGICS) if (m.every((x, i) => b[i] === x)) return name;
  if (b.length > 0x8006 && String.fromCharCode(...b.subarray(0x8001, 0x8006)) === 'CD001') return 'ISO 9660 镜像';
  return null;
}

export function dissect(b: Uint8Array): Report {
  const r = parsePE(b) ?? parseELF(b) ?? parseZIP(b);
  if (r) return r;
  const kind = sniff(b) ?? '未知 / 数据';
  const flags: Flag[] = [];
  if (kind.startsWith('PDF')) {
    const head = latin1(b.subarray(0, 4_000_000));
    for (const [re, t] of [
      [/\/JavaScript|\/JS\b/, '含 JavaScript'],
      [/\/OpenAction|\/AA\b/, '打开即触发动作 (OpenAction / AA)'],
      [/\/Launch/, '含 /Launch 外部程序'],
      [/\/EmbeddedFile/, '嵌入文件'],
    ] as const)
      if (re.test(head)) flags.push({ sev: t.startsWith('含 J') || t.includes('Launch') ? 'high' : 'mid', text: `PDF ${t}` });
  }
  if (kind.startsWith('OLE2')) flags.push({ sev: 'info', text: '旧版 Office 格式：可能含宏，建议用 oletools 进一步分析' });
  return { kind, facts: [['格式', kind]], sections: [], imports: [], exports: [], mitigations: [], flags };
}
