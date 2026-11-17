# 设置和软件包的空间

[Русский](storage.md) · [English](storage.en.md)

槽位里留给 rootfs_data 的空间大约只有 8 MB，不太够用。从 1.2 开始，系统在第一次启动时把 /overlay 搬到闪存上一个单独的 28 MB 分区，原厂固件的设置就存在这个分区里。可用空间从 7.4 MB 变成 19.4 MB。

从 1.2.6 开始，这个分区不再格式化。原厂固件把设置放在一个占满整个分区的 UBI 卷 cfg 里，OpenWrt 把自己的 upper 和 work 目录也放在这个卷里，和原厂的目录并排。原厂固件启动时会删掉不认识的卷，但不会动自己卷里不认识的目录。所以回滚以后原厂固件带着原来的设置启动，SSH 上的 root 也还在，再回到 OpenWrt 时 OpenWrt 的设置也都在。只有原厂固件的恢复出厂设置会清空整个分区。这个思路来自 FOV5。

1.2 到 1.2.5 版本会格式化这个分区，回滚以后原厂固件是出厂状态。从这些版本升级时，第一次启动会把卷改名为 cfg，里面没有原厂设置，这种情况下 rollback-to-stock.sh 会让原厂固件从它的 ROM 里重新填充 /data/etc。如果你根本不想搬到这个共用分区，在第一次启动之前把 /etc/config/bigoverlay 里的值设为 0。

如果还需要更多空间，be7000-extroot 命令可以把整个 /overlay 搬到外接磁盘上。在 LuCI 里同样的功能在 系统, 存储 页面。

```
be7000-extroot list
be7000-extroot use /dev/sda1 --yes
be7000-extroot status
be7000-extroot revert --yes
```

它不会处理已经挂载的磁盘，也不会处理内部闪存，只有加了 --yes 才会格式化，会把当前的 overlay 搬过去，并按 UUID 写 fstab。另外它会过滤掉整块磁盘已经被挂载的分区。分区表改过以后，内核还会继续显示 /dev/sda1 这样的旧节点，虽然文件系统其实占的是整块磁盘，这时格式化这个节点就会把正在用的数据清掉。

从 1.5.8 开始，向导会在格式化前创建缺失的 fstab，并检查已保存的设置。如果重置尚未完成，“系统，存储”页面会显示原因，并可取消旧任务、保留备份。

如果 USB extroot 已准备好，但路由器仍从内部存储启动，可使用以下命令恢复挂载，不会格式化

```sh
be7000-extroot-repair --reboot
```

命令会自动检测一个带有 be7000_overlay 标签的 ext4 存储设备并读取 UUID，保留当前设置、备份原配置，再恢复 fstab。检测到多个匹配设备时会停止，可用 --device 指定设备。

旧版固件可使用 1.5.8 发布附件或 ZIP 中相同的 repair-extroot.sh，通过 sh repair-extroot.sh --reboot 运行。必须先取消未完成的重置任务。
