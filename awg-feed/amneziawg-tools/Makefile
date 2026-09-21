include $(TOPDIR)/rules.mk

PKG_NAME:=amneziawg-tools
PKG_VERSION:=2026.08.12
PKG_RELEASE:=1
AWG_SHA:=ee0f0a9aa34ff0a0da4b3433b9512781cfe02843
PKG_SOURCE:=amneziawg-tools-$(AWG_SHA).tar.gz
PKG_SOURCE_URL:=https://codeload.github.com/amnezia-vpn/amneziawg-tools/tar.gz/$(AWG_SHA)?
PKG_HASH:=22438f231d39ea27e4bdc69707ec3103357f3cecc9ad3eecba18a61e5b39c9b9
PKG_BUILD_DIR:=$(BUILD_DIR)/amneziawg-tools-$(AWG_SHA)
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=openwrt-hybrid-failover

include $(INCLUDE_DIR)/package.mk

define Package/amneziawg-tools
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=VPN
  TITLE:=AmneziaWG userspace tools (awg)
  URL:=https://amnezia.org/
  DEPENDS:=+kmod-amneziawg
endef

define Build/Compile
	$(MAKE) -C $(PKG_BUILD_DIR)/src $(TARGET_CONFIGURE_OPTS) PLATFORM=linux WITH_WGQUICK=no WITH_SYSTEMDUNITS=no WITH_BASHCOMPLETION=no wg
endef

define Package/amneziawg-tools/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/src/wg $(1)/usr/bin/awg
endef

$(eval $(call BuildPackage,amneziawg-tools))
