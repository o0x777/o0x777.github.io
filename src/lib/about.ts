// Everything the About page says lives here — edit copy in this file only.
// De-identified on purpose: no employers, business lines, places or dates for
// each career stage. Keep it that way when editing.

export const ABOUT = {
  lead: '从 CTF 逆向起步，先后深耕二进制安全、威胁情报与僵尸网络、业务安全与黑产对抗，如今专注安全治理与数据安全。',

  /** One-line keyword path shown under the headline */
  path: ['Reverse', 'Threat Intel', 'BizSec', 'Security BP', 'Data Security'],

  /** Case-file fields. `redacted: true` renders a classified bar instead of a value. */
  profile: [
    { k: '代号', en: 'HANDLE', v: '0x777' },
    { k: '真名', en: 'NAME', redacted: true, width: 7 },
    { k: '雇主', en: 'EMPLOYER', redacted: true, width: 9 },
    { k: '所在', en: 'BASE', redacted: true, width: 4 },
    { k: '方向', en: 'FOCUS', v: '逆向 · 情报 · 风控 · 数据' },
    { k: '当前', en: 'NOW', v: '数据安全' },
  ],

  /** Career stages, oldest first. No dates or organisations. */
  career: [
    {
      title: 'CTF · 逆向',
      en: 'Reverse',
      body: '从 CTF 起步，专攻 Android 与 Windows 逆向，深入二进制漏洞。',
      keys: ['Android 逆向', 'Windows 逆向', '二进制漏洞'],
    },
    {
      title: '威胁情报',
      en: 'Threat Intel',
      body: '跟踪活跃的 Botnet 家族，分析恶意样本，提取 C2 与 IOC。',
      keys: ['Botnet 跟踪', '样本分析', 'C2 / IOC'],
    },
    {
      title: '业务安全',
      en: 'Biz Security',
      body: '进入互联网甲方，正面对抗黑产：溯源打击，建设业务风控。',
      keys: ['黑产溯源', '打击治理', '业务风控'],
    },
    {
      title: '安全 BP',
      en: 'Security BP',
      body: '作为业务线安全 BP，统筹业务侧的整体安全与风险。',
      keys: ['安全 BP', '安全治理', '风险评估'],
    },
    {
      title: '数据安全',
      en: 'Data Security',
      body: '负责国际化业务的数据安全与合规。',
      keys: ['数据安全', '数据防泄漏', '跨境合规', '隐私保护'],
      now: true,
    },
  ],

  /** Skills by domain — keywords only, kept deliberately short */
  skills: [
    {
      domain: '逆向与漏洞',
      en: 'Reverse & Vuln',
      icon: 'chip',
      items: ['Android 逆向', 'Windows 逆向', '脱壳与反混淆', '二进制漏洞', 'Fuzzing', 'IDA / Frida'],
    },
    {
      domain: '威胁情报',
      en: 'Threat Intel',
      icon: 'graph',
      items: ['Botnet 跟踪', '恶意样本分析', 'C2 / IOC', 'YARA', '蜜罐', '情报运营'],
    },
    {
      domain: '业务安全',
      en: 'Biz Security',
      icon: 'target',
      items: ['黑产溯源', '反欺诈', '业务风控', '设备指纹', '账号安全', '策略与模型'],
    },
    {
      domain: '安全治理',
      en: 'Governance',
      icon: 'shield',
      items: ['安全 BP', '风险评估', '安全架构评审', 'SDL', '应急响应'],
    },
    {
      domain: '数据安全',
      en: 'Data Security',
      icon: 'lock',
      items: ['分类分级', '跨境数据合规', '隐私保护', '数据防泄漏', '权限治理'],
    },
  ],
};

/** base64 of the flag hidden in the About terminal (`ls -a`, `cat .flag`, `submit`). */
export const FLAG_B64 = 'ZmxhZ3tzdDR5X2N1cjEwdXNfc3Q0eV9oMWRkM259';
