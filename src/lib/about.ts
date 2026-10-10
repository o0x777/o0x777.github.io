// Everything the About page says lives here — edit copy in this file only.
// Facts come from the original About page and the two published reports.

export const ABOUT = {
  lead:
    '网络安全从业者，深耕二进制安全、僵尸网络分析与黑灰产溯源打击。日常是拆解恶意样本、追踪 C2 基础设施，再把藏在暗处的链条一环环拉到光下。目前在大型业务环境中，持续攻坚安全攻防与平台治理难题。',

  /** Case-file fields. `redacted: true` renders a classified bar instead of a value. */
  profile: [
    { k: '代号', en: 'HANDLE', v: '0x777' },
    { k: '别名', en: 'ALIAS', v: '@0x7773' },
    { k: '真名', en: 'NAME', redacted: true, width: 7 },
    { k: '所在', en: 'BASE', redacted: true, width: 4 },
    { k: '方向', en: 'FOCUS', v: 'Binary · Botnet · Fraud' },
    { k: '首份报告', en: 'FIRST REPORT', v: '2021.04.23' },
  ],

  creed: [
    { title: '保持好奇。', body: '任何一个样本都值得拆开看看：它从哪里来，和谁通信，想做什么。' },
    { title: '保持隐秘。', body: '追踪者先要藏好自己。好的研究，从 OPSEC 开始。' },
    { title: '追踪暗影。', body: '顺着 C2、域名与资金链路，把暗处的网络一点点画出来。' },
  ],

  method: [
    {
      title: '捕获',
      en: 'Capture',
      body: '蜜罐、开源情报与网关流量，三条渠道捕获活跃样本。',
      tools: ['Cowrie', 'Dionaea', 'Conpot', 'VirusTotal', 'YARA', 'URLhaus'],
    },
    {
      title: '分析',
      en: 'Analyze',
      body: '按平台与架构分类，静态 + 动态分析，提取 C2、域名、哈希等 IOC。',
      tools: ['IDA · IDAPython', 'radare2', 'Qiling', 'Unicorn', 'x86 / ARM / MIPS'],
    },
    {
      title: '追踪',
      en: 'Track',
      body: '盯住 C2 基础设施与家族演化：IRC、DGA、Tor、P2P，一个版本都不放过。',
      tools: ['Docker + eBPF 沙箱', '流量还原', 'DGA 预测'],
    },
    {
      title: '反制',
      en: 'Counter',
      body: '抢注与预测 DGA 域名、攻陷 C2 面板、模拟下发自毁指令，让网络失去控制。',
      tools: ['域名接管', 'C2 攻陷', '指令仿真'],
    },
  ],

  focus: [
    {
      title: '威胁情报与僵尸网络追踪',
      body: '样本分析、C2 追踪与家族演化。从 IRC 到 Tor，从 C/S 到 P2P，跟着僵尸网络一起进化。',
      icon: 'graph',
      featured: true,
    },
    { title: '二进制漏洞挖掘与逆向分析', body: '在汇编层面理解程序真正做了什么。', icon: 'chip' },
    { title: '黑灰产溯源与治理打击', body: '顺着基础设施与资金链路，溯源并协同打击。', icon: 'target' },
    { title: '业务安全建设与防御', body: '把攻防经验沉淀为业务侧的防御体系。', icon: 'shield' },
    { title: '安全 BP 与平台化', body: '安全 BP 机制与平台化能力建设，让安全能力规模化。', icon: 'layers' },
  ],

  /** Highlights per report, keyed by the post's `slug`. Numbers come from the reports themselves. */
  reportHighlights: {
    Necro僵尸网络: [
      { n: '4', label: '个版本' },
      { n: '16', label: '种 C2 指令' },
      { n: '8', label: '种漏洞利用' },
    ],
    深入解析僵尸网络Botnet: [
      { n: '3', label: '种结构模型' },
      { n: '3', label: '条捕获渠道' },
      { n: '3', label: '种反制手段' },
    ],
  } as Record<string, { n: string; label: string }[]>,

  countries: '10+',
  interests: {
    travel: '到访 10+ 个国家，参加安全会议，探索各地的黑客文化。',
    games: '热爱复古游戏与解谜挑战。这个页面里，也藏了一道题。',
    books: ['行为经济学', '黑客历史', '科幻'],
  },

  contact: {
    title: '有线索？发个信号。',
    body: '威胁情报线索、样本交流、安全研究合作，都欢迎来信。',
  },
};

/** base64 of the flag hidden in the About terminal (`ls -a`, `cat .flag`, `submit`). */
export const FLAG_B64 = 'ZmxhZ3tzdDR5X2N1cjEwdXNfc3Q0eV9oMWRkM259';
