#!/bin/sh
# Xiaomi BE7000: install the native OpenWrt image into the INACTIVE firmware slot, keeping the stock
# firmware in the active slot as a fallback. Run ON the router (stock shell, root).
#
#   scp -O openwrt-...-squashfs-factory.ubi root@192.168.31.1:/tmp/openwrt.ubi
#   sh install-from-stock.sh /tmp/openwrt.ubi          # add "reboot" as 2nd arg to reboot at the end
#
# Never touches the bootloader (appsbl). Rollback: see README (fw_setenv flags).
set -e
IMG=${1:-/tmp/openwrt.ubi}
[ -s "$IMG" ] || { echo "image $IMG not found"; exit 1; }

# Matched word by word: newer images add a second ubi.mtd= for the spare
# overlay partition, and a greedy match would return that one instead.
CUR=""
for arg in $(cat /proc/cmdline); do
	case "$arg" in
	ubi.mtd=rootfs)   CUR=rootfs ;;
	ubi.mtd=rootfs_1) CUR=rootfs_1 ;;
	esac
done
case "$CUR" in
	rootfs)   TARGET=rootfs_1; SLOT=1 ;;   # stock runs from slot 0 -> write slot 1
	rootfs_1) TARGET=rootfs;   SLOT=0 ;;   # stock runs from slot 1 -> write slot 0
	*) echo "unexpected kernel arg ubi.mtd=$CUR - stop"; exit 1 ;;
esac

# Cross-check the boot flag with the running slot (Xiaomi keeps them consistent)
FLAG=$(nvram get flag_boot_rootfs)
if { [ "$CUR" = rootfs ] && [ "$FLAG" != 0 ]; } || { [ "$CUR" = rootfs_1 ] && [ "$FLAG" != 1 ]; }; then
	echo "flag_boot_rootfs=$FLAG disagrees with ubi.mtd=$CUR - stop"; exit 1
fi

MTD=$(grep "\"$TARGET\"" /proc/mtd | cut -d: -f1)
[ -n "$MTD" ] || { echo "partition $TARGET not found"; exit 1; }
for u in /sys/class/ubi/ubi[0-9]*; do
	[ -e "$u/mtd_num" ] || continue
	[ "mtd$(cat "$u/mtd_num")" = "$MTD" ] && { echo "$TARGET is attached (in use) - stop"; exit 1; }
done

echo "stock runs from: $CUR   ->   writing OpenWrt into: $TARGET (/dev/$MTD), next boot slot: $SLOT"
ubiformat "/dev/$MTD" -y -f "$IMG"

# Point the bootloader at the new slot, but do NOT claim the boot succeeded:
# flag_boot_success stays 0 and flag_last_success keeps pointing at the stock
# slot, so the bootloader's own fallback still works if OpenWrt never comes up.
# OpenWrt confirms the boot itself (see /etc/init.d/be7000-bootconfirm), which
# is what flips flag_boot_success to 1.
STOCK_SLOT=$FLAG
nvram set flag_boot_rootfs=$SLOT
nvram set flag_last_success=$STOCK_SLOT
nvram set flag_boot_success=0
nvram set flag_try_sys1_failed=0
nvram set flag_try_sys2_failed=0
nvram set flag_ota_reboot=0
nvram commit
sync
echo "done. flags: boot_rootfs=$(nvram get flag_boot_rootfs) last_success=$(nvram get flag_last_success) boot_success=$(nvram get flag_boot_success)"
echo "if OpenWrt does not come up, power-cycle a few times: the stock slot ($STOCK_SLOT) is still marked as the last good one."
[ "$2" = reboot ] && reboot
exit 0
