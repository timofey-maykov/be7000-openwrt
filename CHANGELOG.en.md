# Versions

[Русская версия](CHANGELOG.md) · [中文](CHANGELOG.zh.md)

**1.5.1**, October 29, 2026.
- When a flash drive with extroot starts dying, the router no longer ends up on the stock firmware. Before, every boot with such a drive broke off, and after six tries the bootloader switched to stock. Now, if the previous boot did not finish, the router starts without USB on its built-in storage and stays reachable.
- Install scripts of third-party packages no longer complain about the version. To them the firmware is now OpenWrt 25.12.6, while Beam WRT and its number show in the description, the banner and LuCI.
- The update page downloads the image in the background, shows how much is in, and takes the image from a mirror on GitHub Pages. Before, on a slow link to GitHub the dialog spun forever.
- roamd: a BE7000 node with Beam WRT gets roamd from the controller, there is no need to install it on the node by hand.
- The SSH login banner shows the version and the thanks again.

**1.5.0**, October 23, 2026.
- Fixed a bug that sometimes kept routers from the latest batches from booting after an install or a reboot, with the indicator staying orange.
- On the System, Slots page the second slot can be given over to packages. It is joined with the settings partition, and packages get about 57 MB instead of 20. Before that the router saves a copy of the slot, which brings the slot back.
- A reset to factory settings now also works when the settings live outside the firmware's own partition.
- The router boots about 8 seconds faster.
- Zapret Manager is updated to 3.97-r2, Steer modules can be added from the panel again.
- The CPU voltage no longer goes below the stock level.

**1.4.9**, October 21, 2026.
- The firmware installs and runs on routers from the latest batches, where it did not boot before. Routers that already run it see no change.
- Steer installs from Zapret Manager. Zapret Manager is updated to 3.97.
- roamd: a BE7000 can join as a node a network that another BE7000 on Beam WRT manages. A node is reset to factory settings when it joins.
- The feed has a Status, Modem page for USB modems: signal, cell, bands, mode selection and an AT command console. Install it with apk add luci-app-beam-modem.

**1.4.8**, October 11, 2026.
- If the 5 GHz module firmware crashed while hostapd was reconfiguring the MLO network with clients connected, for example after a Wi-Fi settings change, the ath12k driver used tables that had already been freed, the kernel crashed and the router rebooted. Now the firmware restarts and the router keeps running.
- After installing a package with a new protocol (GRE, L2TP, 6in4 and others), its interface did not come up until the network was restarted: the network learns its protocols only when it starts. LuCI now shows a Restart network button in the top bar with an explanation, and apk prints the same after the install.
- The Services, Add-ons page now has roamd, seamless Wi-Fi roaming: moving clients from 2.4 to 5 GHz, 802.11k/v/r and a network of several OpenWrt routers. It is built in the Beam WRT feed with two changes. It leaves the MLO network alone, because 802.11r on it crashed the 5 GHz module firmware and rebooted the router. Updates come from the feed rather than its built-in check.
- The release archive has install-from-openwrt.sh for moving to Beam WRT from another OpenWrt with the factory bootloader. If the other slot holds the factory firmware, it switches the boot to it and erases nothing. If it holds something else, it writes Beam WRT there right away. See the end of 1-install-en.txt.
- The instruction and the Slots page now say that the nvram commands for coming back from stock run in the factory firmware. Beam WRT has no nvram, there the Slots page switches the slot.

**1.4.7**, October 9, 2026.
- An AmneziaWG interface created in LuCI on the Network, Interfaces page did not come up. The amneziawg-tools package lacked the script netifd uses to bring such an interface up, so the protocol was unknown. The script and amneziawg_watchdog are part of the package now. Hybrid Failover was not affected, it brings AWG up on its own.
- The feed now has the kernel modules and LuCI packages for GRE, L2TP, PPTP, IPIP, VXLAN, 6in4, 6rd, 6to4, DS-Lite, MAP, 464XLAT, relayd, bonding, SSTP, OpenConnect, vpnc and OpenFortiVPN, plus LuCI for MBIM and NCM modems. Before, such interfaces could not be created because the packages were missing from the feed. They are not in the image, install them in LuCI on the System, Software page or with apk. The kernel modules are built for the 1.4.7 kernel, so they need the firmware update.

**1.4.6**, October 8, 2026.
- Importing the settings from stock refused to run when the factory firmware reported the mode `whc_cap`, and said it was not running as a router. Stock sets that mode on the main router of a mesh network, and it still routes. It is accepted now, and the import is refused only for the extender and the access point modes.

**1.4.5**, October 8, 2026.
- On the Slots page the button that switches to the slot with the factory firmware could answer `slot 0 holds no firmware this can boot ()` although the firmware was there. The slot that the page had looked at sometimes did not detach in time, and the second look made when switching failed. The detach is now retried a few times, what is left of the look is cleared before the switch, and the error message shows the real reason.

**1.4.4**, October 3, 2026.
- If your /overlay is on a USB disk and bigoverlay is turned off, then after updating to 1.4.3 the router stayed on the small internal partition and its packages and Hybrid Failover were gone until you restarted it by hand, I broke that myself in 1.4.3 while changing the check before the extra reboot, and now the check looks at the disk from the extroot settings and a turned off bigoverlay does not get in the way.
- On the Build update page the release text is shown formatted, with headings, lists and highlighted code, and only in the interface language instead of one run of text in three languages.

**1.4.3**, October 3, 2026.
- The router tells you about a new version by itself. A button appears in the top bar and a block with an install button on Status, Overview. The check runs once a day and has a switch on the Build update page.
- Services, Docker: stacks now has a description of what Docker is and how it works here. If containers cannot reach the internet, there is a button at the top that fixes it. The commands `be7000-docker firewall` and `be7000-docker diag` do the same.
- Zapret Manager on the Add-ons page has a Finish install button. It appears when the package is installed but the panel itself was not created, for example because the internet was down during the install.
- LEDs. The stock LED Configuration page has a new trigger, State (Beam WRT). Any LED can show whether a process is running, an address answers or a command exits with code 0, lit or blinking, inverted if you like. The amber network LED shows Wi-Fi 2.4 GHz traffic by default, it sits on the same page and is set there.
- Docker containers had no internet and their ports did not open from the local network. The docker zone in the firewall had no docker0 device, so container packets were dropped. `be7000-docker setup` and `firewall` now set what is needed, and the bridges of user networks and compose stacks are added and removed automatically.
- After Docker was installed, some devices on the network could no longer open sites that go through Hybrid Failover. Docker turned on `bridge-nf-call-iptables`, it is now kept off.
- Hybrid Failover 1.7.54 steers containers like the other devices on the network. With an older version the containers get public DNS servers, otherwise they received service addresses they cannot reach.
- Removing Zapret Manager from its own panel stopped `rpcd` and left its cron jobs behind. `rpcd` now keeps running, and removing the package cleans up its files too.
- Switching to MLO could be cut off by a timeout before the fallback to two radios, leaving 5 GHz off. The time allowance is larger.
- Routers updated from 1.4.1 did not get the new feeds in the repository list. The missing lines are now added at boot.
- If Hybrid Failover could not start within the allowed time after an update, direct DNS could stay for good. The switch back is now retried on the next boot.
- After an update with bigoverlay turned off, the router could reboot once more and come up on factory settings.
- The Zapret Manager button on the Add-ons page could stay inactive after a reboot until `apk update` was run by hand. The index now refreshes by itself. Installing Zapret Manager no longer downloads all its dependencies as well.
- Translations of the Add-ons page into English and Chinese were added. The new-version block on Overview shows its title.
- Services, Dockerman now speaks Russian and Chinese, the translations are installed together with Docker. Long values on the Overview page no longer stick out of the table.
- In MLO mode the 5 GHz Wi-Fi LED stayed dark: it was tied to the interface of one radio, which does not exist in MLO. It now switches to the shared MLO interface with the mode and goes back.
- When the stock settings import fails it says why, and `be7000-stock-import diag` shows what the router sees on the stock settings partition.
- The wireless page no longer shows NaN instead of the frequency when the channel is set to auto. The Hybrid Failover running indicator on the Add-ons page no longer lights for the bot alone.
- If the firewall setup for Docker was interrupted, `dockerd` stayed stopped together with the containers. It now always starts. The daily update check does not run on builds without a version number and writes its state in one piece.
- The documentation and the Hardware offload page describe MLO, two radios, offload and Docker as tested, the experimental labels are gone. What was not measured is stated separately.

**1.4.2**, October 3, 2026.
- Zapret Manager was added to Services, Add-ons. The manager is installed separately and does not enable anything until the user chooses it.
- Zapret, Zapret2, ByeDPI, NetShift, sing-box, hev-socks5-tunnel and the AmneziaWG interface are built for Beam WRT and installed from its signed feed.
- Zapret Manager keeps APK signature checks enabled and does not replace the `zms` command with an Internet downloader. Its terminal interface runs through Bash, installed as a regular dependency.
- After a firmware update, `/overlay` moves back to the selected USB disk. If the first boot used the internal `rootfs_data`, the service reboots once and cannot create a reboot loop.
- Package recovery after an update temporarily uses direct DNS when Hybrid Failover settings already point to `127.0.0.42` but the package has not been restored yet. The previous DNS settings return after the service starts.
- The incompatible official target snapshot was removed from the repository list. Kernel modules now come only from the feed built for the Beam WRT kernel.

**1.4.1**, October 3, 2026.
- A temporary failure of one MLO link no longer permanently switches the router to two-radio mode. Both radios start without scanning, the firmware retries after radio recovery, and the saved MLO choice is kept.
- LuCI no longer treats a short loss of connection during a 5 GHz mode switch as a failure and waits for the real result.
- The Wireless page handles MLO on two radios correctly, hides parked network copies and shows the lower radio channel and width.
- The 5 GHz mode block shows both MLO links as active with their own channels and widths.
- Status, Overview shows MLO on both radios and leaves out parked network copies.
- The Build update page reads multiline release notes with quotes after a line break. The 1.4.0 notes also work with the older page.
- The update page and `be7000-update` no longer treat a separate Nimbus release as new firmware. Only Beam WRT releases with a sysupgrade image and checksums are selected.
- Hybrid Failover installs from Add-ons again. Packages are downloaded and checked first, and `rpcd` is started again after installation.
- Hybrid Failover APKs are signed and verified before publication. Feed filenames that made `apk` receive 404 were fixed.
- The Docker script checks OverlayFS support before writing a new `data_root` and does not leave Docker on an incompatible filesystem.
- Docker command messages were translated into Chinese. Their language follows LuCI.

**1.4.0**, October 1, 2026.
- Three 5 GHz modes instead of two. Besides one radio and two radios there is now MLO. In MLO one Wi-Fi 7 network runs on both radios at once, the lower one on channels 36-64 up to 160 MHz, the upper one from 149 up to 80 MHz. Wi-Fi 7 devices keep a link on two channels at once, the rest join one of them like an ordinary network. The mode changes in the 5 GHz mode block on Network, Wireless or with be7000-5g-split mode, without a reboot.
- Older devices can join the MLO network too. Its base protection is WPA2 and WPA3, and Wi-Fi 7 gets its own WPA3 with GCMP-256. Before, a Mac with Wi-Fi 7 stayed on 2.4 GHz with such a network.
- The Wireless page no longer fails with an error when an MLO network is set up.
- Changing the 5 GHz mode can no longer reboot the router. The radios now stop completely before the driver reloads the radio firmware.
- When the chosen country code makes the radio firmware turn Wi-Fi 7 off on 5 GHz (RU does, for example), the 5 GHz mode block says so. A button next to it sets US for 5 GHz only, and after it the access point runs as Wi-Fi 7 again.
- Importing stock settings. On the first boot after installing from stock, Beam WRT takes the Wi-Fi names and passwords, the internet connection (PPPoE, DHCP or a static address) and the router address from there. Status, Overview shows what was taken, with an undo button. Stock keeps its settings in an encrypted container, the script opens it read-only and from a copy. To look without changing anything, run be7000-stock-import preview.
- New page System, Slots. It shows which firmware each slot holds, which one runs and which one boots, and switches to the other slot, back to stock included. The page explains in full how the bootloader picks a slot and how to come back.
- Hardware NAT offload on the PPE network engine, experimental and off by default. Page Network, Hardware offload, with a full description. It is built on open work for OpenWrt. Without three fixes of ours it did not work. The PPE now gets its table rows written whole, the path to Wi-Fi clients behind a bridge is no longer lost, and a bug in packet receive of the network driver is fixed. Bridging the LAN ports on the PPE is a separate switch.
- The interface now comes in Chinese too. All Beam WRT pages, the theme and LuCI itself are translated, the language is picked on System, System, Language and Style or automatically from the browser.
- New page Services, Add-ons. hybrid-failover installs there with one button, and the page explains in detail what it is and why.
- hybrid-failover is now in the feed. It lives in its own directory and rebuilds itself with every new release, so `apk upgrade` picks up the latest version. kmod-nft-queue and coreutils-sleep were added to the feed as well.
- The docs got recipes for common tasks (modem, phone over USB, Docker, 5 GHz modes, stock, slots) and a measurements page with the method.
- The build moved to a fresh OpenWrt main (d958caf). Kernel 6.18.52 instead of 6.18.36, Wi-Fi drivers from backports 7.2. Installed packages are reinstalled for the new kernel from the new feed after the upgrade. Packages for 1.3.x stay in the old feed directory and no longer change.
- A package the new feed does not have, such as an old-base library with a date in its name, is skipped and the rest are installed. Before, one such name broke the reinstall of every package.
- After an upgrade, old copies of firmware files in the shared settings volume no longer shadow the new ones. Such a copy could take 5 GHz Wi-Fi away on a new version. Settings stay, the moved files go to .be7000-replaced.
- The memory TrustZone uses is reserved, as on stock. We counted these 6.5 MB as free and they could get silently corrupted. Free memory is smaller by the same amount.
- /overlay on a USB disk survives an upgrade. Before, the router came up on internal flash after an upgrade although the settings named the disk. The entry is now restored and the router reboots onto the disk once. SSDs in UAS enclosures are seen at boot, the uas driver is in the image. Found by kazanova-sgh.
- The Storage page no longer offers to move /overlay onto a disk whose partitions are in use, or onto a swap partition. That button would have erased data. A full internal overlay shows as 0 MB instead of a dash.
- Nimbus theme. Dropdowns in multi-value fields open again, for example the MAC of a static DHCP lease, found by Alex Zaguzin. Wide tables fit their card, row buttons no longer stick out. After an upgrade the browser picks up the new styles by itself, before it took a hard reload.
- USB tethering from an iPhone installs from the feed again, the new feed lacked a dependency of usbmuxd.
- The 5 GHz driver no longer crashes when a scan fails on a radio that is not created yet.

**1.3.1**, September 30, 2026.
- The build got a name, Beam WRT, and its own logo. They are in LuCI (tab icon, sidebar, login page, Project block), in the SSH greeting, on the Credits page and in the version string. The default hostname OpenWrt became BeamWRT, a hostname you set stays. Image files keep their old names, openwrt-qualcommbe-...
- The 5 GHz module can be split into two independent radios, like 5G-1 and 5G-2 on stock. The lower one runs on channels 36-64, the upper one from 149 up, each with its own channel and clients. The mode is changed in the 5 GHz mode block at the top of Network, Wireless or with be7000-5g-split on, the router does not reboot. Like stock, the driver loads the dual-MAC firmware with board data 0x1008, flips the RF lines TLMM6 and TLMM7 and takes a separate calibration from ART. The choice survives reboots and updates. Tested on zerc00l's board, both radios hold MCS 9, cable and USB work as before.
- With two radios LuCI offers each radio only its own channels.
- The wireless network list is aligned. Badges, descriptions and buttons sit in even columns, networks are marked under their radio.
- The Storage, Build update and Docker: stacks pages are translated to English and follow the LuCI language, like Credits. The be7000-docker and be7000-update console tools follow it too.
- A Project block at the top of Status, Overview with the build version and links to the sources, releases, the 4PDA topic, issues, build update and credits.
- LuCI, /etc/openwrt_release and the SSH greeting show the build version, Beam WRT 1.3.1, not OpenWrt SNAPSHOT.
- The feed gained USB tethering from a phone. Android connects over RNDIS, iPhone over ipheth and usbmuxd. Also Huawei NCM modems and the QMI and 3G protocols for LuCI. All of it installs with apk.
- 12 MB of memory are reserved for the two-radio firmware, free memory is that much lower.

**1.3.0**, September 29, 2026.
- On some boards Ethernet reception did not work after installation: there was a link, but the router did not receive a single frame, on LAN or WAN. The cause was power. The DTS had the l2 regulator from the Qualcomm reference board, the kernel requested it over RPM at boot, and stock never makes such requests. After that request the SoC receiver on the lane to the QCA8084 went silent, although every lane register and clock matched stock. The kernel no longer votes l2, USB gets a fixed 1.8 V supply. On zerc00l's board the cable works, iperf3 941 Mbit/s both ways without a single lane error. Huge thanks to zerc00l for remote access to his router, and to BurmecianKnight, Denchik777, xiaoqi2020, tera2null, kazanova-sgh and fufliks862 for the logs and patience.
- EDMA receive DMA fix from OpenWrt main (0362, by krava): receive buffers were mapped with one DMA direction and unmapped with another, so on IPQ95xx the CPU could read stale data instead of the frame.
- Ethernet reception is no longer moved to a single core. The generic packet-steering sent RPS of all qcom_ppe queues to CPU0, which already handles the 5 GHz Wi-Fi interrupts. EDMA spreads reception over four cores by itself, Wi-Fi is unchanged.
- Rolling back to stock no longer resets stock settings kept in the encrypted sec_cfg.
- A System, Credits page in LuCI: who tested the build on their boards, who found bugs and whose work it stands on, each with a link to their profile or work. The same list is shown in the SSH login greeting.

**1.2.7**, September 26, 2026.
- On boards coming straight from stock, the stock settings volume has number 1 (/dev/ubi1_1), while fstab expected /dev/ubi1_0: fstools searched for the partition for fifteen seconds and fell back to the slot's internal overlay, the shared volume was not used, and bigoverlay rebooted the router twice. Now the device is looked up by volume name and the fstab entry fixes itself. This showed up in the logs from Denchik777 and dima-dior1999.
- Wi-Fi was not enabled on a clean install in 1.2.6: the service treated as an update any installation where /etc/config/wireless already existed, and hotplug generates that file before the service runs. Now an update is detected by a marker from sysupgrade.conf, and for old images by whether the network has a password set. Thanks to Denchik777 for the hint.
- The log in flash is written across the whole partition (480 KB) and contains port state and counters, interrupts, addresses, routes, neighbours, network, Wi-Fi, DHCP and fstab configs, nftables rules, processes, service lines and the tail of the system log. The copy in preinit is still dmesg only. It is written every 15 seconds for five minutes, then at the seventh and tenth minute.
- The instructions and README have been cleaned up, outdated advice about the stock version and wget has been removed.
- The workflow can do debug builds from debug-* tags: a separate overlay, tcpdump-mini, a pre-release without publishing the feed.

**1.2.6**, September 25, 2026.
- bigoverlay no longer formats the stock settings partition: overlay lives as a directory inside stock's own cfg volume, a rollback keeps the stock settings and root over SSH, and going back to OpenWrt keeps the OpenWrt settings. Suggested by FOV5.
- Checking for and installing updates from GitHub Releases: the be7000-update command and the page System, "Обновление сборки" (firmware update).
- be7000-feeds on every boot brings the kernel modules feed path in line with the hash of the kernel in ROM (customfeeds.list is a conffile, sysupgrade kept the old path). be7000-romsync on an image change resets the copy of the apk database in overlay to the database from ROM and reinstalls the user's packages; otherwise apk after an update considered the old kernel installed and refused to install modules.
- Kernel modules installed through apk live in overlay under the same kernel version number as the new image, and after an image change they shadowed the modules from ROM. OpenWrt does not check their compatibility, they got loaded and crashed the kernel about twenty seconds after startup, six times in a row, until the bootloader rolled back to the other slot. The preinit hook 79_be7000_stale_modules, before overlay is mounted, compares the kernel hash in the copy of the apk database with the ROM kernel and, if they differ, moves the modules directory aside to lib/modules.stale-<hash>, and be7000-romsync installs the right modules from the feed again.
- Wi-Fi is enabled on a clean install, network OpenWrt-BE7000 with password be7000openwrt. On two boards after installing 1.2.5 the system booted but did not respond over the cable on 192.168.1.1, and since the system had confirmed the boot, the bootloader will no longer return to stock. Without a second way in, that is a dead end.
- The log in flash, besides dmesg, records ip addr, the network config, the state of board.json and the tail of logread. In 1.2.5 the interfaces block was empty, busybox's ip has no -br option.
- An empty /etc/board.json is removed in preinit so that board_detect rebuilds it.
- The first boot after sysupgrade moves to the shared partition by itself, instead of living once on the slot's internal overlay with factory settings.

**1.2.5**, September 25, 2026.
- A clean install from stock in 1.2.3 and 1.2.4 bounced back to stock: bigoverlay rebooted the router before be7000-bootconfirm confirmed the trial boot. Now bigoverlay re-arms the trial boot before its own reboot.
- The Nimbus theme is back in the image, CI was not building it.
- The image now includes ca-bundle and libustream-mbedtls, without them apk update over https failed with a certificate error, and wget could not do https.

**1.2.4**, September 25, 2026.
- The first release built entirely on GitHub Actions.
- The feed now has packages and modules for Docker, the be7000-docker command and Docker pages in LuCI.
- bigoverlay sets the flag flag_format_overlay=1 for stock. Without it, stock after a return saw a foreign UBI on mtd28, deleted our volume, created an empty one and did not copy its settings, and ended up coming up with an empty /etc/config, without web settings and without SSH (in xmir-patcher this looked like "dropbear is found, but it cannot run"). If you already ran into this: on stock `nvram set restore_defaults=1 && nvram commit && reboot -f`, or reset with the button.
- The image writes a boot log to flash: dmesg to crash_syslog (mtd27), kernel panics through mtdoops to crash (mtd26).

**1.2.3**, September 24, 2026.
- The be7000-bootconfirm service at the end of startup resets the bootloader's attempt counters and marks its slot as good. In images up to 1.2.2 nothing did this, and after seven reboots the router silently went to stock.
- The installer from stock follows the regular OTA path, and if OpenWrt did not come up, the very next power-on returns stock.

**1.2.2**, September 24, 2026. The radios are no longer turned off on update: the first-boot service's marker was not carried over by sysupgrade, and every update looked like a clean install to it.

**1.2.1**, September 24, 2026. The "Накопитель" (Storage) page under System. In 1.2 it ended up by mistake inside the hybrid-failover app, which is not in the public image.

**1.2**, September 24, 2026. sysupgrade writes to the slot it booted from. Services enabled by hand survive an update. /overlay moved to a separate partition, 19.4 MB instead of 7.4. The be7000-extroot command. Own package feed, apk update gives 658 packages instead of 404.

**1.1**, September 22, 2026. The Nimbus LuCI theme by default, UPnP with a LuCI page, and nft_tproxy modules.

**1.0**, September 22, 2026. The first public build with the three Ethernet driver fixes.
