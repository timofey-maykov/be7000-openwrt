# Patches

[Русская версия](patches.md) · [中文](patches.zh.md)

Everything added to OpenWrt main (commit d958caf) and the kravasuper port, which is kept as a patch series in [patches/port](../patches/port). The kernel patches are in [patches](../patches) and are copied into target/linux/qualcommbe/patches-6.18, the changes to the OpenWrt tree itself are in [patches/tree](../patches/tree).

## Why the first patches were needed

The image from the port would not start on my board. The LED blinks white rapidly, there is no network and no Wi-Fi, and after seven power cycles the bootloader goes back to stock. In the port's discussion thread I am not the only one describing this, and it usually gets blamed on board revisions. The UART on the board is 1.8 V and I had no adapter for it, so I looked for the cause in logs that the firmware itself writes to flash. How that was done is in [debugging.en.md](debugging.en.md).

It turned out that startup is broken by three bugs that feed into each other.

1. **The QCA8084 PHY driver**, right after configuration, waits 100 ms for the BaseR link and returns an error if it fails. But the link depends on a signal sent by the SoC, and the SoC only starts sending it once the port is opened. If the bootloader managed to configure the SerDes, the check passes. On mine it did not, the log had `BaseR link failed!` and `PPE port 1 failed to connect phylink`. Patch 0901 turns the error into a warning.
2. **qcom-ppe**, after that error, tears itself down and calls `napi_disable()` on a NAPI that is already disabled. Such a call never returns. `insmod` hangs, and since modules are loaded by `S10boot`, nothing after that starts at all. No network, no SSH, no Wi-Fi. Patch 0900.
3. **In the same place, in the port cleanup**, once the hang is removed, the index `i` goes negative and the code reads memory before the start of the array. The result is an oops. Patch 0902.

The last two patches fix real driver bugs and do not depend on the board, they are worth sending upstream. The first one is a workaround, the proper fix would be to configure the SoC's SerDes before attaching the PHY.

## Kernel patches

| Patch | What it does |
|------|-----------|
| 0900 | qcom-ppe: do not disable NAPI a second time when tearing down the rings, otherwise insmod hangs forever holding RTNL |
| 0901 | QCA8084: missing BaseR when attaching the PHY is no longer an error but a warning |
| 0902 | qcom-ppe: the index does not go negative when rolling back the port setup |
| 0903 | QCA8084: if BaseR did not lock when attaching, redo the XPCS setup on the first link up |
| 0904 | qcom-ppe: EDMA receive buffers are mapped and unmapped with the same DMA direction (from OpenWrt main, 0362) |
| 0905 | qcom-ppe: EDMA receive takes the next buffer on every round, before, after a dropped frame the loop took one already freed |
| 0906 | qcom-ppe: rows of multi-word PPE tables are written whole, the hardware loses a single-word write |
| 0907 | qcom-ppe: bridging the ports in the PPE is enabled by the module parameter bridge_offload, off by default |
| 0908 | spi-qpic-snand: when 8 bit ECC does not fit the page and its OOB, 4 bit is used. Needed for newer BE7000 boards with the ESMT F50D1G41LB flash (64 bytes of OOB), where stock runs ECC4 and 8 bits cannot fit |

## OpenWrt tree changes

| Patch | What it does |
|------|-----------|
| 001 | BE7000 DTS: switching of the 5 GHz RF path (TLMM6 and TLMM7) as on stock, without it 5 GHz reception is weak; kernel parameters for mtdoops and the settings volume |
| 002 | device profile: kmod-ath11k-ahb, without it the built-in 2.4 GHz radio is left without a driver |
| 003 | sysupgrade writes to the slot it booted from |
| 004 | mtdoops in the kernel config |
| 006 | BE7000 DTS: a 12 MB reservation for the MLO global memory of the 5 GHz dual-MAC firmware, like stock mlo_global_mem |
| 014 | PPE hardware offload, the series from OpenWrt PR 24178, see below |
| 005 | BE7000 DTS: the kernel does not vote the l2 regulator over RPM, same as stock. With that request some boards had no reception on the UNIPHY0 lane from the QCA8084, i.e. no Ethernet at all. USB gets a fixed 1.8 V supply |
| 015 | ath11k-firmware: the hash of the archive made from git is not checked. It depends on the git, tar and zstd of the build machine, and after the CI runner image changed the same commit packed to another hash and the build stopped with "Hash mismatch". The source commit itself stays pinned |

## Hardware offload (PPE)

The PPE network engine can route and do NAT by itself, but in OpenWrt its driver still only passes packets to the CPU. The offload is based on the open OpenWrt PR 24178, the series 0500-0520 in tree 014 without its documentation. It has switchdev bridging, an L3 flow table, netfilter flowtable offload, IPv6, PPPoE, VLAN on the WAN and virtual ports for Wi-Fi. On the BE7000 it did not work as is, it took our fixes.

- 0906. The PPE applies a row of a multi-word table only when the whole row is written. The series changed single words, so the ports had no L3 interface and PPPoE had no router MAC bit. Flows were installed but never hit, all traffic went to the CPU with code L3 no-route.
- mac80211 393 (patches/mac80211-subsys). ath12k has no net_fill_forward_path, mac80211 returned an error then, and the kernel dropped the whole path through the bridge to a Wi-Fi client. The flow kept br-lan as its output device and the PPE rejected every reply direction. Now the path ends at the Wi-Fi interface itself for an access point.
- 0905. A bug in the receive path of the driver itself, there without offload too.
- 0907. The PPE bridge started as soon as a port joined a bridge. Now it is a separate choice.

What it looks like in practice. During a download with offload on we counted what the PPE does with the packets coming from the WAN. Without the fixes every one of them went to the CPU as a packet with no route. With the fixes 86 % of the packets are routed and translated by the PPE itself. About 2 % still go to the CPU, those are the first packets of new connections. The remaining 12 % the PPE hands to the CPU for other reasons we have not sorted out yet.

![Where download packets go with offload on](img/ppe-packet-path-en.svg)

It is turned on at Network, Hardware offload. For Wi-Fi clients packets still pass the CPU once, because ath12k cannot hand them to the radio directly.

## Ethernet reception on some boards

Before 1.3.0, on some boards Ethernet reception did not work after installation. There was a link, but the MAC did not receive a single frame, while Wi-Fi worked. The cause was power. The l2 regulator in the DTS came from the Qualcomm reference board, and the kernel's RPM request for it silenced the SoC receiver on the 10G-QXGMII lane to the QCA8084, while every lane register and clock matched stock. Found on zerc00l's board, which we could reach remotely for testing. The fix is patch 005. The history of the search is in [issue #1](https://github.com/timofey-maykov/be7000-openwrt/issues/1) and in the 4PDA thread.

## Two radios on 5 GHz

On stock the QCN9274 5 GHz module can run as two independent radios (5G-1 and 5G-2). For that stock loads a different firmware, dual-MAC, with different board data (board id 0x1008 instead of 0x02). It is already inside firmware-2.bin and ath12k can load it, but chose it only from the OTP board id, which the BE7000 does not have.

| Patch (mac80211, ath12k) | What it does |
|------|-----------|
| 308 | the DTS board id also selects the dual-MAC firmware |
| 309 | with fixed radio memory, hand the firmware every segment it asked for: dual-MAC asks for six, including MLO global memory, and never answers a reply with fewer |
| 310 | ath12k board_id module parameter: overrides the DTS board id, with bit 0x1000 it lifts the DTS radio count cap |

The mode is switched by be7000-5g-split (on, off, status) or the 5 GHz mode block at the top of Network, Wireless. The script sets the parameter, rebinds the module on the PCI bus without rebooting the router and adds a second 5 GHz radio to the Wi-Fi config with copies of the first one's networks. The choice is kept in /etc/config/be7000. At boot an init script at S09, before ath12k loads, prepares the mode and the module starts in it right away. The board data for dual-MAC is the stock one (bdwlan.b1008), shipped as board.bin.

Like stock (set_5g_split), in the two-radio mode the script flips the RF lines. TLMM6 goes to 1 and TLMM7 to 0, the other way round for one radio. The DTS sets these lines with a pinctrl state instead of gpio-hogs, otherwise they could not be changed at runtime (tree 007). Stock has its own calibration for two radios, at ART offset 0x33000, for one radio 0x65000. The script puts the right one into the file ath12k asks for.

With two radios iwinfo gives each radio only its own channels (tree 008), before that LuCI offered the lower radio the upper one's channels and the AP did not start.

## 5 GHz firmware crash

When the QCN9274 firmware crashes, ath12k restarts it and builds the datapath again. If hostapd was removing an MLO interface with connected clients or LuCI was asking for channel statistics at that moment, the kernel crashed and the router rebooted.

| Patch (mac80211, ath12k) | What it does |
|------|-----------|
| 312 | the peer address table is no longer freed under a reader during firmware recovery, and a lookup in a missing table finds nothing instead of reading address zero |
| 313 | CRASH_FLUSH is cleared only after the CE and DP rings are set up again, otherwise WMI commands sent during recovery went into rings pointing at freed memory |
| 314 | the same for the link station address table, and after a failed recovery WMI commands and data are refused at once instead of going into half torn down rings |
| 315 | removing an MLO station skips links that were left without a vdev by a firmware crash, before the kernel read address zero on such a link |
