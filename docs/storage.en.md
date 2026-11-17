# Space for settings and packages

[Русская версия](storage.md) · [中文](storage.zh.md)

Inside the slot about 8 MB is left for rootfs_data, and that is not much. Starting with 1.2, on first boot the system moves /overlay to a separate 28 MB flash partition where the factory firmware keeps its settings. Free space becomes 19.4 MB instead of 7.4.

Since 1.2.6 the partition is not formatted. Stock keeps its settings in a UBI volume cfg that spans the whole partition, and OpenWrt keeps its upper and work directories inside that same volume, next to the stock directories. On boot stock deletes foreign volumes, but it does not touch foreign directories in its own volume, so after a rollback it comes up with its settings and with the same root over SSH, and after going back to OpenWrt its settings are in place as well. Only a stock factory reset wipes the whole partition. The idea came from FOV5.

In versions 1.2 through 1.2.5 the partition was formatted, and after a rollback stock came up in factory state. When updating from those versions, the volume is renamed to cfg on first boot, there are no stock settings in it, and in that case rollback-to-stock.sh asks stock to repopulate /data/etc from its ROM. If you do not want the move to the shared partition at all, set the value in /etc/config/bigoverlay to 0 before the first boot.

If you need more space, the be7000-extroot command moves /overlay entirely to an external disk. In LuCI the same thing is on the page System, "Накопитель" (Storage).

```
be7000-extroot list
be7000-extroot use /dev/sda1 --yes
be7000-extroot status
be7000-extroot revert --yes
```

It refuses to work with a mounted disk or with the internal flash, only formats after --yes, carries over the current overlay and writes fstab by UUID. Separately, it filters out partitions whose whole disk is mounted. After the partition table changes, the kernel keeps showing old nodes like /dev/sda1 even though the filesystem occupies the whole disk, and formatting such a node would wipe live data.

Since 1.5.8, the wizard creates a missing fstab before formatting and verifies committed settings. If reset has not finished, System, Storage shows the reason and offers cancellation with a backup.

If USB extroot was already prepared but the router booted on internal storage, restore mounting without formatting with

```sh
be7000-extroot-repair --reboot
```

The command detects one ext4 drive labelled be7000_overlay and reads its UUID, keeps current settings, backs up previous configurations and restores fstab. With several matching drives it stops, use --device to choose one.

For older firmware, the same repair-extroot.sh is attached to release 1.5.8 and included in its ZIP. Run sh repair-extroot.sh --reboot. An incomplete reset job must be cancelled first.
