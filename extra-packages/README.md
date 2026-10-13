Packages that need no compiler: LuCI pages and scripts. Each directory holds
PKG (name, version, description, depends, license), the file tree under root/
and optional post-install, post-upgrade, pre-deinstall scripts. The workflow
extra-feed.yml packs them with apk mkpkg as noarch, signs them with the feed
key and publishes feed/extra/aarch64_cortex-a73 on gh-pages.

i18n/ holds the translations; po2lmo turns them into the .lmo files under
root/usr/lib/lua/luci/i18n.
