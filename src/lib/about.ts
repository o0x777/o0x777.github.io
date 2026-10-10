// Everything the About page says lives here — edit copy in this file only.
// De-identified on purpose: no employers, business lines, places or dates for
// each career stage. Keep it that way when editing.

export const ABOUT = {
  lead: '攻防出身。拆解过代码，追踪过暗影，如今守护数据。',

  /** Case-file fields. `redacted: true` renders a classified bar instead of a value. */
  profile: [
    { k: '代号', en: 'HANDLE', v: '0x777' },
    { k: '真名', en: 'NAME', redacted: true, width: 7 },
    { k: '雇主', en: 'EMPLOYER', redacted: true, width: 9 },
    { k: '所在', en: 'BASE', redacted: true, width: 4 },
    { k: '方向', en: 'FOCUS', v: '逆向 · 情报 · 风控 · 数据' },
    { k: '当前', en: 'NOW', v: '数据安全' },
  ],

  /** Career stages, oldest first: one verb each. No dates or organisations. */
  career: [
    { verb: '拆解', domain: '逆向 · CTF', en: 'Reverse', line: '从 CTF 开始，读懂每一行汇编。', keys: ['Android', 'Windows', '二进制漏洞'] },
    { verb: '追踪', domain: '威胁情报', en: 'Threat Intel', line: '盯住僵尸网络的每一个 C2。', keys: ['Botnet', '恶意样本', 'C2 / IOC'] },
    { verb: '对抗', domain: '业务安全', en: 'Biz Security', line: '与黑产正面交锋。', keys: ['黑产溯源', '业务风控'] },
    { verb: '统筹', domain: '安全 BP', en: 'Security BP', line: '为业务守住整条防线。', keys: ['安全 BP', '风险治理'] },
    {
      verb: '守护',
      domain: '数据安全',
      en: 'Data Security',
      line: '让数据安全地流向世界。',
      keys: ['数据防泄漏', '跨境合规', '隐私保护'],
      now: true,
    },
  ],

  /** Skills by domain — four keywords each */
  skills: [
    { domain: '逆向', en: 'Reverse', items: ['Android', 'Windows', '漏洞挖掘', 'IDA / Frida'] },
    { domain: '威胁情报', en: 'Threat Intel', items: ['Botnet', '样本分析', 'YARA', '蜜罐'] },
    { domain: '业务安全', en: 'Biz Security', items: ['黑产溯源', '反欺诈', '风控策略', '设备指纹'] },
    { domain: '安全治理', en: 'Governance', items: ['安全 BP', '风险评估', '架构评审', '应急响应'] },
    { domain: '数据安全', en: 'Data Security', items: ['数据防泄漏', '分类分级', '跨境合规', '隐私保护'] },
  ],
};

/** base64 of the flag hidden in the About terminal (`ls -a`, `cat .flag`, `submit`). */
export const FLAG_B64 = 'ZmxhZ3tzdDR5X2N1cjEwdXNfc3Q0eV9oMWRkM259';
