# 常用做法

[Русский](cookbook.md) · [English](cookbook.en.md)

这里是常见任务的现成做法。命令通过 SSH 在路由器上执行（`ssh root@192.168.1.1`）。软件包从固件的软件源安装，所以路由器需要能上网。如果哪里不成功，请把命令输出发到 4PDA 的帖子或 issues 里。

## LTE 或 5G USB 调制解调器

现在的大多数调制解调器需要 ModemManager 以及 QMI、MBIM 和 NCM 驱动。

```
apk update
apk add modemmanager luci-proto-modemmanager kmod-usb-net-qmi-wwan kmod-usb-net-cdc-mbim kmod-usb-net-cdc-ncm kmod-usb-serial-option
```

插上调制解调器，等半分钟，确认系统能识别到它。

```
mmcli -L
```

然后在 LuCI 里打开 "网络, 接口"，点 "添加"。协议选 ModemManager，设备选调制解调器，再填上运营商的 APN。防火墙区域选 wan。走 NCM 的华为调制解调器还需要装 `kmod-usb-net-huawei-cdc-ncm`。

## 用手机通过 USB 上网

Android。新手机用 NCM 共享，老手机用 RNDIS，所以两个驱动都装上。

```
apk update
apk add kmod-usb-net-cdc-ncm kmod-usb-net-rndis
```

iPhone。需要 ipheth 驱动和 usbmuxd 服务，usbmuxd 负责和手机通信。

```
apk update
apk add kmod-usb-net-ipheth usbmuxd
/etc/init.d/usbmuxd enable
/etc/init.d/usbmuxd start
```

在 iPhone 上确认 "信任此电脑"，然后打开个人热点。

插上手机，看看出现了哪个接口。

```
dmesg | tail -20
```

一般是 `usb0`，或者一个带新编号的 `eth`。在 LuCI 里打开 "网络, 接口"，点 "添加"。协议选 DHCP 客户端，设备选这个接口，区域选 wan。

## Docker

Docker 镜像放不进内部闪存，需要一个 USB 硬盘。插上硬盘，按 [storage.zh.md](storage.zh.md) 里的说明格式化并挂载。然后运行下面的命令。

```
be7000-docker setup
```

脚本会找到一个已挂载且有空闲空间的硬盘，把 Docker 数据移过去。它还会安装 Dockerman，也就是管理容器、镜像和网络的页面。现成的容器组合在 "服务, Docker 堆栈" 里启动。

### 容器无法上网

如果 qBittorrent 什么也下载不了，其他容器连不上网，或者容器的网页界面无法从局域网打开，原因在防火墙。Docker 会为自己的容器建立单独的 docker 区域，而路由器的防火墙默认不会在区域之间转发任何流量。需要两条转发规则，从 docker 到 wan 让容器访问互联网，从 lan 到 docker 让局域网访问已发布的端口。此外还必须在该区域中写明 docker0 网桥。否则防火墙不会把容器的数据包交给这个区域，即使两条转发规则都在，也会被丢弃。用户网络和堆栈使用的网桥会自动加入该区域。

用 be7000-docker setup 安装时会自动设置好。如果 Docker 是之前装的，请运行下面的命令，或者在 "服务, Docker 堆栈" 页面点击 "允许" 按钮。

```
be7000-docker firewall
```

手动设置的方法如下，在任何版本上都可以使用。docker 区域必须已经存在，也就是说 Docker 至少启动过一次。

```
uci set firewall.docker_wan=forwarding
uci set firewall.docker_wan.src='docker'
uci set firewall.docker_wan.dest='wan'
uci set firewall.docker_lan=forwarding
uci set firewall.docker_lan.src='lan'
uci set firewall.docker_lan.dest='docker'
uci add_list firewall.docker.device='docker0'
uci commit firewall
/etc/init.d/firewall restart
```

如果转发规则已经有了，但 `uci show firewall` 里看不到 docker 区域，请停止 Docker，然后用标准命令创建它。

```
/etc/init.d/dockerd stop
/etc/init.d/dockerd uciadd
/etc/init.d/dockerd start
```

如果容器仍然没有网络，`be7000-docker diag` 会输出防火墙区域和规则、网络接口以及 dockerd 的状态。把输出附在问题报告里会很方便。

最新版本的 Hybrid Failover 会像对待网络中的其他设备一样处理容器，并自动识别 Docker 网桥。如果是旧版本，`be7000-docker firewall` 会为容器设置公共 DNS 服务器，否则容器会从路由器拿到 Hybrid Failover 的内部地址而无法连接。没有 Hybrid Failover 时不会改动 DNS。

## 5 GHz 模式

模式在 "网络, 无线" 页面顶部的 "5 GHz 模式" 区域选择。切换模式时路由器不会重启，5 GHz Wi-Fi 会断开大约半分钟。

- 单射频。整个频段一个网络，所有信道都能用，最高 160 MHz。单台设备速度最快。
- 双射频，和原厂固件的 5G-1、5G-2 一样。低频段用 36-64 信道，高频段从 149 开始。低频段在设置里可以开到 160 MHz，高频段最高 80 MHz。设备多的时候很方便。
- MLO。两个射频组成一个 Wi-Fi 7 网络，已验证客户端通过一条链路连接，尚未验证同一客户端同时使用两条链路。

在双射频和 MLO 模式下，每个射频只分到一半天线。所以单台设备比单射频模式下慢。具体数字见 [benchmarks.zh.md](benchmarks.zh.md)。

某些国家代码下（包括 RU），射频固件会关掉 Wi-Fi 7，接入点按 Wi-Fi 6 工作。"5 GHz 模式" 区域会提示这一点，旁边的按钮可以把代码改成 US。信道和功率的规则会随代码一起变化。

在命令行里这样切换模式。

```
be7000-5g-split mode           # 当前模式
be7000-5g-split mode split     # 双射频
be7000-5g-split mode mlo       # MLO
be7000-5g-split mode single    # 单射频
```

## 从原厂固件导入设置

如果路由器是从原厂固件刷过来的，而且原厂里已经设置好了 Wi-Fi 和上网，Beam WRT 第一次启动时会从那里取出 Wi-Fi 名称和密码、上网方式（PPPoE、DHCP 或静态地址）以及路由器地址。"状态, 概览" 会显示导入了什么，还有一个撤销按钮。

想看看原厂固件里有什么，又不改动任何东西，运行这个命令。

```
be7000-stock-import preview
```

手动导入设置和撤销用这两个命令。

```
be7000-stock-import apply
be7000-stock-import undo
```

原厂固件把设置存在一个加密容器里。脚本只读打开它，而且是从副本读取，所以路由器回到原厂固件时设置原封不动。

## 槽位和回到原厂固件

闪存里有两个槽位。"系统, 槽位" 显示每个槽位里装了什么，当前运行的是哪个，默认启动的是哪个，也可以切换到另一个。启动起来的固件会把自己的槽位设为默认，所以切换是长期生效的。切换之前页面会告诉你以后怎么从原厂固件回来。引导程序的更多说明见 [bootloader.zh.md](bootloader.zh.md)。

## 硬件加速

加速在 "网络, 硬件加速" 里开启。PPE 网络引擎可以接管 NAT 和路由，也可以接管 LAN 口的网桥。这个功能已经测试过并能正常工作，默认关闭。页面上说明了哪些流量会被加速，以及它和哪些功能不能一起用，比如 SQM。

在命令行里这样开启。

```
/usr/libexec/be7000-ppe status
/usr/libexec/be7000-ppe nat on        # 立即生效
/usr/libexec/be7000-ppe bridge on     # 重启后生效
```

下面的命令显示现在有多少连接经过 PPE。

```
grep -c HW_OFFLOAD /proc/net/nf_conntrack
```

## 更新

路由器每天会自己向 GitHub 查询是否有新版本。有新版本时，"状态, 概览" 页面会出现提示块，Nimbus 主题的顶部栏会出现一个按钮。可以在 "系统, 固件更新" 页面关闭这项检查，新版本也在这里一键安装。设置会保留。在命令行里这样做。

```
be7000-update check     # 有没有新版本
be7000-update apply     # 下载、校验并安装
```

你装过的软件包会在更新后、路由器联网时为新内核重新安装。如果你是从 1.x 更新到 1.4，请先读 docs/instruction/2-update-zh.txt 开头关于这次更新的部分。这个文件在发布压缩包里也有。
