# What Beam WRT can do

[Русский](features.md) · [中文](features.zh.md)

Beam WRT is OpenWrt-based firmware for the Xiaomi BE7000 router. This page covers what it has, what is new in version 1.4 and how it differs from the factory firmware and other builds.

## How Beam WRT differs from other firmware

**A fresh OpenWrt instead of old vendor code.** The factory firmware runs Linux 5.4.164, built in September 2023. Builds based on it stay on the same Qualcomm code. Beam WRT has kernel 6.18.52 and the latest Wi-Fi drivers, and with them security fixes and new features.

**Everything is open.** Sources, patches and a description of every patch are in this repository. Anyone can build the same firmware and check what is in it. Builds run in GitHub Actions, images and checksums are published in the releases.

**Its own package feed.** More than 600 packages install with apk right on the router. Among them are modem drivers, Docker, tcpdump, htop and much more. AmneziaWG is already built into the firmware. hybrid-failover lives in a separate feed and updates itself there as soon as a new version is out. It installs with one button on the Services, Add-ons page, which also explains what it is and why.

**One-click updates.** The System, Build update page finds a new version, checks its checksum and installs it keeping your settings. Packages you installed yourself come back automatically after the update. The router tells you about a new release by itself, with a button in the top bar and a block on Status, Overview.

**The factory firmware is always close.** Beam WRT takes one slot in flash, the factory firmware stays in the other. You can go back to it with a button. If a new version does not boot after the install, the router goes back to the factory firmware by itself.

**A boot log in flash.** The firmware writes its boot log to a separate partition. It can be read even from the factory firmware, so a problem can be found without opening the router.

**Docs in Russian, English and Chinese.** Installing, updating, going back, recipes for common tasks and measurements with a method you can repeat yourself.

## New in 1.4

The main part came in 1.4.0, and 1.4.1, 1.4.2, 1.4.3 and 1.4.4 added and fixed many smaller things, the full list is in [CHANGELOG.en.md](../CHANGELOG.en.md). The notable ones after 1.4.0 are the Add-ons page with Zapret Manager, the new-version notice, the fixed firewall for Docker, the State trigger for the LEDs and a more reliable update with a USB disk.

### A new base

The firmware moved to a fresh OpenWrt with kernel 6.18.52. The Wi-Fi drivers come from backports 7.2, the latest ath12k and mac80211. Everything that worked in 1.3.1 works here too. The update was tested on a live router with PPPoE, both Wi-Fi bands and a USB disk.

### Three 5 GHz modes

The mode is chosen at the top of Network, Wireless. The router does not reboot, the 5 GHz network is down for about half a minute.

- **One radio.** One network for the whole band up to 160 MHz. The highest speed for a single device.
- **Two radios.** Like 5G-1 and 5G-2 in the factory firmware. The lower one runs on channels 36-64, the upper one from 149, each with its own clients. Handy with many devices.
- **MLO.** One Wi-Fi 7 network on both radios, a client connection on one link has been tested, simultaneous use of two links by one client has not been verified.

With country code RU the radio turns Wi-Fi 7 off without any warning, and the access point runs as Wi-Fi 6. Now the firmware says so, and a button next to it sets US for 5 GHz only.

![5 GHz Wi-Fi speed in one-radio and MLO mode](img/bench-wifi-5g-en.svg)

The measurement details are in [benchmarks.en.md](benchmarks.en.md).

### Settings import from the factory firmware

On the first install the firmware takes the Wi-Fi names and passwords, the internet connection and the router address from the factory firmware. It works with PPPoE, DHCP and a static address. After the install the router stays at its old address, devices join Wi-Fi by themselves and the internet works without setup.

The factory firmware keeps its settings encrypted. Beam WRT opens them read-only and from a copy, so everything is in place if you go back. Status, Overview shows what was taken, with an undo button.

### Slots and going back to the factory firmware

The System, Slots page shows what each of the two slots holds, which one runs and which one boots. You can go back to the factory firmware with a button, without flashing and without a programmer. The page explains in detail how the bootloader picks a slot and how to come back to Beam WRT later.

### Hardware NAT offload

The IPQ9554 has a separate network block, the PPE. It can route and do NAT by itself, but OpenWrt has not used it so far. Version 1.4.0 adds offload on it. It is based on open work for OpenWrt, but on the BE7000 it did not work until three bugs were fixed. They are described in [patches.en.md](patches.en.md).

![Where download packets go with offload on](img/ppe-packet-path-en.svg)

The feature is tested and works, and it is off by default. It is turned on at Network, Hardware offload, which also describes what is offloaded and what it does not mix with. On a wired 2.5 Gbit/s connection a measurement by zh8416 showed that the speed does not change, because the port is at the TCP limit without offload anyway, while CPU load drops from 60 to 41 % down and from 43 to 37 % up. Details and caveats are in [benchmarks.en.md](benchmarks.en.md).

### Fixes

- Changing the 5 GHz mode can no longer reboot the router.
- The Wireless page no longer fails with an error when an MLO network is set up.
- Settings moved to a USB disk survive an update, SSDs in UAS enclosures are seen at boot.
- The Storage page no longer offers to wipe a disk in use.
- Dropdowns in the theme open again, wide tables fit the screen.
- USB tethering from an iPhone installs from the feed again.

The full list of changes is in [CHANGELOG.en.md](../CHANGELOG.en.md).

## What else the firmware has

- Moving settings and packages to a USB disk with one button on System, Storage.
- Docker with ready-made container sets (AdGuard Home, Home Assistant, Portainer and more) on Services, "Docker: stacks". The firewall for the containers is set up by itself, including the networks of compose stacks, and Docker works together with Hybrid Failover.
- LEDs: the LED Configuration page has a State (Beam WRT) trigger, any LED can show a process, an address or the result of a command. The amber network LED shows Wi-Fi 2.4 GHz traffic.
- The Nimbus theme.
- The interface in Russian, English and Chinese.
- UPnP, off by default.
- Kernel modules for transparent proxying.

## What is not tested yet

One thing needs testing on live routers, and there is no way to run such a test yet.

- **Settings import from the factory firmware** was tested on test data but has not run on a real factory firmware yet. You can safely see what the firmware finds with `be7000-stock-import preview`, it changes nothing.

If you can help, post the results in the 4PDA topic or in issues. How to measure is described in [benchmarks.en.md](benchmarks.en.md).
