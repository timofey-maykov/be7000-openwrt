# Check for and install newer builds of this firmware from GitHub Releases:
# the be7000-update command plus a LuCI page under System. Packaged so that a
# router already running an older image can pick it up from the feed with
# apk add luci-app-be7000-update.
include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-be7000-update
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=timofey-maykov

LUCI_TITLE:=Firmware updates from GitHub for the BE7000 build
LUCI_DEPENDS:=+luci-base +uclient-fetch +libustream-mbedtls +ca-bundle +jsonfilter
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
