include $(TOPDIR)/rules.mk

PKG_NAME:=zapret-manager-beam
PKG_VERSION:=9.90.3.97
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/StressOzz/Zapret-Manager.git
PKG_SOURCE_VERSION:=37c0474ee1db1d49903d128cd4a3eed1a1b20158
PKG_MIRROR_HASH:=skip

PKG_MAINTAINER:=Timofey Maykov <itnitro@gmail.com>

include $(INCLUDE_DIR)/package.mk

define Package/zapret-manager-beam
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Zapret
  TITLE:=Zapret Manager for Beam WRT
  URL:=https://github.com/StressOzz/Zapret-Manager
  DEPENDS:=+bash +curl +unzip +uhttpd-mod-ubus
  PKGARCH:=all
endef

define Package/zapret-manager-beam/description
  Zapret Manager packaged for Beam WRT. All native programs and kernel
  modules are installed from the signed Beam WRT package feed.
endef

define Build/Compile
endef

define Package/zapret-manager-beam/install
	$(INSTALL_DIR) $(1)/usr/share/zapret-manager-beam
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/ZapretManager_LuCI.sh $(1)/usr/share/zapret-manager-beam/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/Zapret-Manager.sh $(1)/usr/share/zapret-manager-beam/
	sed -i 's/apk add --allow-untrusted/apk add/g' $(1)/usr/share/zapret-manager-beam/ZapretManager_LuCI.sh
	sed -i 's/apk add --allow-untrusted/apk add/g' $(1)/usr/share/zapret-manager-beam/Zapret-Manager.sh
	sed -i '\|> /usr/bin/zms|d' $(1)/usr/share/zapret-manager-beam/Zapret-Manager.sh
	$(INSTALL_DIR) $(1)/usr/libexec
	$(INSTALL_BIN) ./files/zapret-manager-beam-install $(1)/usr/libexec/
	$(INSTALL_BIN) ./files/zapret-manager-beam-patch $(1)/usr/libexec/
	$(INSTALL_DATA) ./files/zapret-manager-beam-functions $(1)/usr/libexec/
	$(INSTALL_DATA) ./files/zapret-manager-beam-cli-functions $(1)/usr/libexec/
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/zms $(1)/usr/bin/zms
endef

define Package/zapret-manager-beam/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || /usr/libexec/zapret-manager-beam-install
exit 0
endef

define Package/zapret-manager-beam/postrm
#!/bin/sh
# what the upstream installer and our patch step wrote outside the package
[ -z "$${IPKG_INSTROOT}" ] || exit 0
rm -rf /opt/zapret-manager-luci /usr/bin/zmsA /www/zm /www/luci-static/resources/view/zapret-manager
rm -rf /usr/lib/zapret-manager* /etc/zapret_manager_expert_mode* /tmp/zapret-manager* /tmp/luci-indexcache* /tmp/luci-modulecache
if grep -q zapret-manager-luci /etc/crontabs/root 2>/dev/null; then
	sed -i '/zapret-manager-luci/d' /etc/crontabs/root
	/etc/init.d/cron restart >/dev/null 2>&1
fi
/etc/init.d/rpcd reload >/dev/null 2>&1 || true
exit 0
endef

$(eval $(call BuildPackage,zapret-manager-beam))
