---
title: "深入解析僵尸网络 Botnet"
slug: "深入解析僵尸网络Botnet"
pubDate: 2025-04-23T13:40:00.000Z
updatedDate: 2025-05-19T11:55:40.439Z
description: "本文全面梳理了 Botnet 僵尸网络的组成结构、攻击模式、捕获分析与反制路径，适用于安全研究者、情报分析员和系统工程师。"
categories: ["安全专题", "僵尸网络"]
tags: ["僵尸网络", "安全分析", "botnet", "DDoS", "样本分析"]
---

## 0x0 僵尸网络简介

### 什么是僵尸网络（Botnet）

僵尸网络是一组被恶意软件感染并受控制的计算机集合。每台设备称为“僵尸”（bot），整体由控制者通过命令与控制（C2）服务器统一管理。

### 僵尸网络的用途

僵尸网络常被用于执行下列非法行为：

-   **发送垃圾邮件**：全球垃圾邮件中，约35%–40%由僵尸网络生成。BCMUPnP\_Hunter僵尸网络家族，360netlab 2018年首发，该家族僵尸网络用于分发垃圾邮件。（[文章链接](https://blog.netlab.360.com/bcmupnp_hunter-a-100k-botnet-is-seeming-abusing-home-routers-for-spam-emails/)）

    <!-- TODO 图片缺失：image-20250423203201269.png（原图只在旧电脑的 Typora 缓存里） -->
-   **窃取数据**：case1:如KekSec组织利用僵尸网络监听敏感端口，转发数据至C2。

    <!-- TODO 图片缺失：image-20250423203243001.png（原图只在旧电脑的 Typora 缓存里） -->

    case2:针对 MikroTik RouterOS路由器设备的。通过僵尸网络样本，该设备已经被攻击者非法监听，并转发TZSP流量到指定的IP地址，通信端口UDP/37008。37.1.207.114（受感染设备） 在控制范围上显著区别于其他所有攻击者。该IP监听了大部分MikroTik RouterOS设备，主要监听TCP协议20，21，25，110，143端口，分别对应FTP-data，FTP，SMTP，POP3，IMAP协议流量。这些应用协议都是通过明文传输数据的，攻击者可以完全掌握连接到该设备下的所有受害者的相关网络流量，包括FTP文件，FTP账号密码，电子邮件内容，电子邮件账号密码等。

-   **投放勒索软件**：Meris家族利用MikroTik设备发起高达2180万QPS的DDoS攻击。

    <!-- TODO 图片缺失：image-20250423203353801.png（原图只在旧电脑的 Typora 缓存里） -->
-   **广告欺诈**：Windows平台的驱魔家族通过插件刷广告，另有国内DNS劫持插入广告。

-   **DDoS攻击**：包括应用层攻击、协议攻击（如SYN Flood）和反射放大攻击（如DNS放大）。

### 僵尸网络的结构模型

#### 1. 客户端/服务器模型（C/S）

-   如Mirai、Gafgyt
-   控制便捷但存在单点失效问题

#### 2. 点对点模型（P2P）

-   控制节点分布式，抗查杀能力强
-   如加密通信+DHT协议的Mozi家族

#### 3. 混合模型（C/S + P2P）

-   实现集中调度与分布传播并存，结合两者优势

## 0x1 僵尸网络捕获

### 样本来源

#### 渠道一：蜜罐系统

-   **蜜罐类型**：cowrie, dionaea, conpot 等
-   **发展形态**：蜜罐 → 蜜网 → 蜜场 → 蜜标
-   **案例**：Anglerfish蜜罐具备全端口监听+RCE模拟能力

#### 渠道二：开源情报平台与主动探测

-   使用 VirusTotal + Yara 规则进行样本捕获
-   利用文件名指纹和下载器C2地址主动探测

#### 渠道三：网关流量

-   获取来自省级/国际出口的数据流量，捕获C2通信行为

## 0x2 僵尸网络分析

### 样本处理流程

1.  样本分类：平台+架构维度划分
2.  自动化分析（静态+动态）提取IOC（C2、域名、IP、MD5等）
3.  人工配合确认新样本逻辑与加密
4.  使用Docker+eBPF沙箱或轻量模拟器提取通信行为

### 自动化分析工具链

-   汇编指令分析：x86/ARM/MIPS
-   样本结构识别：ELF结构、stripped样本符号恢复
-   网络协议还原：socket调用追踪+流量分析
-   自动化框架：基于 IDAPython、radare2、Qiling 模拟器、Unicorn + LWE（轻量动态执行）

### 示例：

-   利用 Qiling 模拟器对 Mirai 样本自动提取 C2 地址

## 0x3 僵尸网络跟踪与反制

### 国内跟踪生态

-   绿盟 Bothunter 在2021年追踪15个主流家族：如 Mirai、XorDDoS、Gafgyt
-   月均百万级DDoS攻击事件，活跃指令多来源于8大主力家族

### 反制手段

1.  **域名控制**：抢注C2域名、预测DGA域名实现接管
2.  **C2服务器攻陷**：利用已知漏洞（如 HFS命令注入）控制其管理面板
3.  **模拟C2下发自毁命令**：破解通信密钥后模拟C2下发指令清除节点

### 参考平台与资料

-   [urlhaus.abuse.ch](https://urlhaus.abuse.ch/browse/) — 样本收集
-   [360 Netlab Blog](https://blog.netlab.360.com/) — Botnet 家族持续追踪
-   [NSFocus Blog](http://blog.nsfocus.net/) — 国内DDoS监控情报
-   [Botconf.eu](https://www.botconf.eu/) — 欧洲权威 Botnet 会议

* * *

📌 **更多内容**将持续更新，建议订阅博客或关注我推特：[0x7773](https://x.com/0x7773)
