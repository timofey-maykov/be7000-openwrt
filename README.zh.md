<img src="docs/img/beam-wrt-logo.svg" alt="" width="72" height="72" align="left">

# Beam WRT

基于 OpenWrt 的 Xiaomi BE7000 固件。
<br clear="left">

[Русский](README.md) · [English](README.en.md) · <a href="#支持项目"><img alt="支持项目" src="https://img.shields.io/badge/%E6%94%AF%E6%8C%81%E9%A1%B9%E7%9B%AE-Boosty%20%C2%B7%20crypto-F15F2C?style=flat-square"></a>

Beam WRT 是给 Xiaomi BE7000 (RC06 主板，IPQ9554 处理器) 用的新版 OpenWrt，取自 main 分支，内核 6.18，不用 kexec。1.3.1 之前这个固件就叫 be7000-openwrt，和仓库同名。系统直接从闪存启动，原厂固件留在另一个槽位里，随时都可以切回去。

**固件能做什么，1.4 有哪些新东西，和别的固件有什么区别，都写在 [features.zh.md](docs/features.zh.md) 里。**

从 1.4.0 开始，固件基于 OpenWrt main (提交 d958caf，2026 年 9 月 29 日)，上面叠加 kravasuper 的移植，放在 patches/port 里作为补丁系列。1.4.0 之前用的是 kravasuper 的 xiaomi_be7000 分支，提交 790d036a。在这个基础上我修了以太网驱动，不修的话我这块板子上的系统连网络都起不来 ([patches.zh.md](docs/patches.zh.md))。另外还加了一组服务，让双槽位和原厂引导程序的行为变得可预期。

当前版本是 **1.4.9**。镜像在 [Releases](../../releases) 里，校验和在 sha256sums.txt 里。安装方法见 [安装、更新和回滚](#安装更新和回滚) 一节。

## 目录

- [测试过的内容](#测试过的内容)
- [已知问题](#已知问题)
- [安装、更新和回滚](#安装更新和回滚)
- [镜像里有什么](#镜像里有什么)
- [文档](#文档)
- [主题](#主题)
- [许可证](#许可证)
- [致谢](#致谢)
- [支持项目](#支持项目)

## 测试过的内容

我自己的板子是 RC06，IPQ9554 rev 1.1，原厂固件 1.1.38，1 GB 内存。

- 系统 25 秒启动完成，LuCI 和 SSH 都能进。
- 千兆口用 iperf3 测，双向都在 940 Mbit/s 左右，没有 CRC 错误，也不丢包。
- 2.5 Gbit/s 口。有一位用户跑通了 2500 Mbit/s 的连接，一个方向过了 72 GB，另一个方向 30 GB，没有错误。我自己的板子只测过 100 和 1000。
- 2.4 和 5 GHz Wi-Fi 以 Wi-Fi 6 模式工作，能读到 ART 分区里的校准数据，5 GHz 的 TLMM6 和 TLMM7 修正已经生效。
- 接入点模式下的 Wi-Fi 7 (EHT80) 能用，用笔记本测过。macOS 显示 PHY Mode 802.11be，36 信道 80 MHz，iperf3 945 Mbit/s。5 GHz 自动选信道也正常。
- 国家代码设成 RU 时，QCN9274 的射频固件自己会禁用 802.11be (`iw reg get` 里能看到 NO-EHT)，接入点就按 Wi-Fi 6 工作。这是射频固件的决定，不是驱动的问题。从 1.4.0 开始，5 GHz 模式块里会提示这一点，旁边有个按钮，只给 5 GHz 设成 US。
- MLO 模式几秒钟就能起来，低频段射频在 36 信道 160 MHz，高频段射频在 149 信道 80 MHz。MLO 已经测试过，能正常工作。Wi-Fi 7 笔记本连上这种网络时只用一条链路，一台设备上两条链路叠加没有测过，目前没有条件做这项测试。
- 真实线路上的 PPPoE、保留设置和已启用服务列表的 sysupgrade、WireGuard 和 AmneziaWG (模块和 awg 工具都是按这个内核编译的)。

## 已知问题

- **1.3.0 之前部分板子上的以太网问题。** 网口有连接，但路由器一帧都收不到。原因是内核通过 RPM 请求了 l2 稳压器，1.3.0 已经修好，详情见 [patches.zh.md](docs/patches.zh.md)。如果你的板子上网线还是不通，请到 [issue #1](https://github.com/timofey-maykov/be7000-openwrt/issues/1) 或 4PDA 帖子里反馈。可以先通过 Wi-Fi 连进去 (网络 OpenWrt-BE7000，密码 be7000openwrt)。
- 在双射频和 MLO 模式下，每个射频只分到一半天线，所以单台设备的速度比单射频模式慢。模式在 网络, 无线 页面上选，或者用 be7000-5g-split mode 命令切换，详情见 [patches.zh.md](docs/patches.zh.md)。
- /overlay 只有大约 20 MB 空间。要装大东西，最好用 be7000-extroot 命令把它搬到 USB 上。
- 内核用的是主线的 qcom-ppe，不是厂商的 NSS。PPE 上的硬件 NAT 加速在 1.4.0 里加上了，已经测试过并能正常工作，默认关闭。Wi-Fi 客户端的数据包仍然要经过一次 CPU。
- 这个移植落后于 OpenWrt main，更新基础版本时可能需要重做补丁。

## 安装、更新和回滚

所有步骤都写在 [docs/instruction](docs/instruction) 里，发布压缩包里也是同样的文件。

- [从原厂固件安装](docs/instruction/1-install-zh.txt)
- [更新](docs/instruction/2-update-zh.txt)，包括通过 系统, 固件更新 页面更新
- [回滚到原厂固件，以及出问题时怎么办](docs/instruction/3-rollback-and-problems-zh.txt)
- [固件功能](docs/instruction/4-features-zh.txt)，软件包、5 GHz 模式和 MLO、导入原厂设置、槽位、硬件加速、USB 存储、Docker

如果从任何 1.x 版本更新到 1.4，请先读更新文件的第一节。

无论如何都不要动引导程序 (0:APPSBL 和 0:APPSBL_1)，这是唯一能把板子彻底搞坏的地方。

## 镜像里有什么

OpenWrt main r20260929-d958caf，内核 6.18.52，Wi-Fi 驱动来自 backports 7.2，架构 aarch64_cortex-a73，软件包格式 apk。软件源固定在同一天 (feeds-pins.txt)。确切的软件包列表在 manifest 文件里，编译配置在 config.buildinfo 里。

镜像里值得一提的有带 PPE 加速的 qcom-ppe 模块、firewall4 和 nftables、PPPoE、dnsmasq-full、WireGuard 和 AmneziaWG、用于限速的 tc 和 ifb、ath11k (2.4 GHz) 和 ath12k (5 GHz) 驱动及其固件、完整版 wpad、带 https 以及俄文和中文的 LuCI、USB 存储支持、iperf3。移植的配置里原本没有 kmod-ath11k-ahb 软件包，是我加上的。没有它，内置的 2.4 GHz 射频就没有驱动。

普通 OpenWrt 里没有的服务放在 overlay-files 里。

| 服务 | 作用 |
|--------|-----------|
| be7000-bootconfirm | 启动结束时向引导程序确认当前槽位，并清零尝试计数 |
| bigoverlay | 首次启动时把 /overlay 搬到原厂设置分区，见 [storage.zh.md](docs/storage.zh.md) |
| be7000-wifi-defaults | 全新安装时打开两个射频，网络名为 OpenWrt-BE7000 |
| be7000-feeds | 让内核模块软件源的路径和 ROM 里内核的哈希保持一致 |
| be7000-romsync | 镜像更换后重置 overlay 里的 apk 数据库副本，并重新安装用户自己装的软件包 |
| be7000-bootlog | 把启动日志写到闪存里 (crash_syslog)，见 [debugging.zh.md](docs/debugging.zh.md) |
| 79_be7000_stale_modules | 在 preinit 阶段把上一个镜像留下的内核模块挪开，免得它们盖住 ROM 里的模块 |
| be7000-stock-import | 从原厂固件安装后的第一次启动时，从原厂固件里取出 Wi-Fi、上网连接和路由器地址 |
| be7000-5g-split | 5 GHz 的几种模式 (单射频、双射频和 MLO)，在驱动加载前准备好模式 |
| be7000-extroot | 把 /overlay 搬到 USB 磁盘上，更新后也留在那里 |
| be7000-ppe | 在模块加载前，把 PPE 网桥加速的选择写进模块参数 |
| be7000-slots | 显示各个槽位里装的是什么，切换启动槽位，对应 系统, 槽位 页面 |
| be7000-docker | 把 Docker 安装到磁盘，并为容器设置防火墙和 DNS，命令有 setup、firewall、diag |
| be7000-update | 检查并安装新版本，每天提示一次是否有新版本发布 |
| be7000-leds | 指示灯的状态触发器，LED 配置页面中的 状态（Beam WRT），以及琥珀色 2.4 GHz Wi-Fi 指示灯 |

软件包开箱即可安装。官方镜像站给 qualcommbe 编译的是 cortex-a53，而这个固件的目标是 cortex-a73，所以镜像站上没有 aarch64_cortex-a73 目录，所有常用软件源都返回 404。镜像里配好了自己的软件源，用同一套源码树编译，签名用的密钥镜像本身已经信任。执行 `apk update` 之后有 600 多个软件包可装，包括 nano、htop、tcpdump、strace、tmux、rsync、jq、带 USB 调制解调器驱动的 modemmanager、ksmbd 和 ttyd。内核模块放在单独的软件源里，因为镜像站上的模块是给别的内核编译的。还有一个单独的软件源放 hybrid-failover，每次发布新版本它都会自己重新编译。

## 文档

- [features.zh.md](docs/features.zh.md)，固件能做什么，和别的固件有什么区别
- [cookbook.zh.md](docs/cookbook.zh.md)，常见操作的做法，包括调制解调器、USB 连接手机、Docker、5 GHz 模式和 MLO、原厂设置、槽位、更新
- [benchmarks.zh.md](docs/benchmarks.zh.md)，测试数据和复现方法
- [patches.zh.md](docs/patches.zh.md)，给移植加了什么，为什么加，还在做的补丁
- [bootloader.zh.md](docs/bootloader.zh.md)，闪存槽位、引导程序怎么选槽位、什么时候会启用网络
- [storage.zh.md](docs/storage.zh.md)，设置和软件包的空间、和原厂固件共用的卷、搬到 USB
- [building.zh.md](docs/building.zh.md)，固件在 CI 里怎么编译，自己怎么编译
- [debugging.zh.md](docs/debugging.zh.md)，没有 UART 时怎么找原因，闪存里的启动日志
- [CHANGELOG.zh.md](CHANGELOG.zh.md)，各版本之间改了什么

## 主题

我给 LuCI 做了一个自己的主题，叫 Nimbus。菜单在左侧，能快速搜索页面，有浅色和深色两种配色，在手机上看也没问题。源码、截图和安装说明在 [luci-theme-nimbus](luci-theme-nimbus) 文件夹里，打好的软件包在发布页里。这个主题不绑定 BE7000，任何带 LuCI 23.05 及更新版本的 OpenWrt 都能装。主题界面有俄文、英文和中文。

![Nimbus](luci-theme-nimbus/screenshots/overview-dark.png)

## 许可证

patches 里的补丁和 Linux 内核一样，按 GPL-2.0-only 发布。脚本和文字随便用。镜像由 OpenWrt 源码、kravasuper 的移植、这些补丁以及 awg-feed 里的软件包编译而成。版本和配置列在 config.buildinfo 和 feeds-pins.txt 里。

## 致谢

带链接的完整名单在 LuCI 的 系统, 致谢 页面上，SSH 登录欢迎信息里也是同一份名单。特别感谢 zerc00l 提供路由器的远程访问，以太网不通的原因就是在那块板子上找到的。也感谢 kravasuper，所有东西都建立在他的移植上。

## 支持项目

这个固件是我用业余时间做的。这意味着要在别人的板子上调试，要做几十个测试镜像，还有 CI。如果它对你有用，可以支持一下这项工作。谢谢！

<a href="https://boosty.to/itnitro"><img alt="Boosty" src="https://img.shields.io/badge/Boosty-itnitro-F15F2C?style=for-the-badge&logo=boosty&logoColor=white"></a>

| 方式 | 详情 |
|------|-----------|
| <img alt="USDT TON" src="https://img.shields.io/badge/USDT-TON-26A17B?style=for-the-badge&logo=tether&logoColor=white"> | `UQBZhwBuZCgQOtrgRGMu4PKiiOcf9dTKxRpapZt1oDn0m3yH` |
| <img alt="USDT ETH ERC-20" src="https://img.shields.io/badge/USDT%20%2F%20ETH-ERC--20-627EEA?style=for-the-badge&logo=ethereum&logoColor=white"> | `0xeb05803030afB64C903C7BfB79d18957efD6bcCd` |
| <img alt="SOL" src="https://img.shields.io/badge/SOL-Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white"> | `GcKxgUeSfKnsPL9iEaYKJArosfYKMtE4W5wVDdHrRVTu` |
| <img alt="BTC" src="https://img.shields.io/badge/BTC-Bitcoin-F7931A?style=for-the-badge&logo=bitcoin&logoColor=white"> | `bc1qcyd3kaa3y2cv2yn90rsa628y3ptz56zs05z2jq` |
| <img alt="WeChat" src="https://img.shields.io/badge/WeChat-itnitro-07C160?style=for-the-badge&logo=wechat&logoColor=white"> | `itnitro` |

<img src="docs/img/wechat-itnitro-qr.jpg" alt="WeChat itnitro" width="200">
