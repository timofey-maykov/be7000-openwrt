#!/bin/sh
# Run ON the native OpenWrt. Boots the OTHER slot (where the stock firmware lives) on the next reboot.
# Usage: sh rollback-to-stock.sh        (then: reboot)
# Matched word by word: newer images add a second ubi.mtd= for the spare
# overlay partition, and a greedy match would return that one instead.
CUR=""
for arg in $(cat /proc/cmdline); do
	case "$arg" in
	ubi.mtd=rootfs)   CUR=rootfs ;;
	ubi.mtd=rootfs_1) CUR=rootfs_1 ;;
	esac
done
case "$CUR" in rootfs) OTHER=1 ;; rootfs_1) OTHER=0 ;; *) echo "unexpected ubi.mtd=$CUR"; exit 1 ;; esac
# If bigoverlay took the stock settings partition, tell stock to repopulate
# /data/etc from its ROM on the next boot; otherwise it comes up with an empty
# /etc/config and even SSH will not start.
grep -q "ubi.mtd=overlay" /proc/cmdline && fw_setenv flag_format_overlay 1
fw_setenv flag_boot_rootfs $OTHER && fw_setenv flag_last_success $OTHER && fw_setenv flag_boot_success 1 \
 && fw_setenv flag_try_sys1_failed 0 && fw_setenv flag_try_sys2_failed 0 && fw_setenv flag_ota_reboot 0 \
 && echo "next boot: slot $OTHER (was $CUR). Now run: reboot"
