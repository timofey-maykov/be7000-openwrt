include $(TOPDIR)/rules.mk
include $(INCLUDE_DIR)/kernel.mk

PKG_NAME:=kmod-amneziawg
PKG_VERSION:=2026.09.06
PKG_RELEASE:=1
AWG_SHA:=4569c4c67f3a57414969260cafbbd04694fbaae0
PKG_SOURCE:=amneziawg-linux-kernel-module-$(AWG_SHA).tar.gz
PKG_SOURCE_URL:=https://codeload.github.com/amnezia-vpn/amneziawg-linux-kernel-module/tar.gz/$(AWG_SHA)?
PKG_HASH:=6d7608935adbcdd4c6e9fed705951e2ee85311ac212a8e8f1274abcf9b06f83e
PKG_BUILD_DIR:=$(KERNEL_BUILD_DIR)/amneziawg-linux-kernel-module-$(AWG_SHA)
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=openwrt-hybrid-failover

include $(INCLUDE_DIR)/package.mk

define KernelPackage/amneziawg
  SECTION:=kernel
  CATEGORY:=Kernel modules
  SUBMENU:=Network Support
  TITLE:=AmneziaWG kernel module (WireGuard with obfuscation)
  URL:=https://amnezia.org/
  DEPENDS:=+kmod-udptunnel4 +kmod-udptunnel6 +kmod-crypto-lib-chacha20poly1305 +kmod-crypto-lib-curve25519
  FILES:=$(PKG_BUILD_DIR)/src/amneziawg.ko
  AUTOLOAD:=$(call AutoProbe,amneziawg)
endef

define Build/Compile
	$(KERNEL_MAKE) M="$(PKG_BUILD_DIR)/src" WIREGUARD_VERSION="1.0.0" modules
endef

$(eval $(call KernelPackage,amneziawg))
