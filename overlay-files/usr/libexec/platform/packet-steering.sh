#!/bin/sh
# BE7000: packet steering without pulling Ethernet onto one CPU.
#
# /etc/init.d/packet_steering runs this file instead of the generic
# /usr/libexec/network/packet-steering.uc when it exists. The generic script
# sees the EDMA ports (lan1-3, wan) as one device with four RX queues but no
# per-queue NAPI threads, and in that case it points every queue's RPS at a
# single CPU. EDMA already spreads received frames over all four CPUs with its
# own hash (rxdesc_20..23 have one IRQ per CPU), so RPS only drags everything
# back to CPU0, which also takes all the 5 GHz Wi-Fi interrupts.
#
# Keep what the generic script does for Wi-Fi and clear RPS on the EDMA
# queues, leaving the hardware distribution alone.

mode="$1"
flows="$(uci -q get network.@globals[0].steering_flows)"
opts=
[ "${flows:-0}" -gt 0 ] && opts="-l $flows"

/usr/libexec/network/packet-steering.uc $opts "$mode"

[ "$mode" = 0 ] && exit 0

for dev in /sys/class/net/*; do
	drv="$(readlink "$dev/device/driver" 2>/dev/null)"
	[ "${drv##*/}" = qcom_ppe ] || continue
	for q in "$dev"/queues/rx-*/rps_cpus; do
		[ -e "$q" ] && echo 0 > "$q"
	done
done
exit 0
