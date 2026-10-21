'use strict';
'require view';
'require rpc';
'require ui';
'require poll';

// Services, Add-ons: programs that are not part of the image but are built
// for it and install from the Beam WRT feeds in one click. The work is
// /usr/libexec/be7000-addons behind the rpcd object be7000-addons.

var callStatus = rpc.declare({ object: 'be7000-addons', method: 'status', params: [ 'id' ] });
var callInstall = rpc.declare({ object: 'be7000-addons', method: 'install', params: [ 'id', 'bot' ] });
var callLog = rpc.declare({ object: 'be7000-addons', method: 'log' });

var CSS = `
.ba-card{padding:16px 18px;border-radius:12px;border:1px solid var(--nb-border,rgba(128,128,128,.3));background:var(--nb-surface-2,rgba(128,128,128,.05));max-width:900px;margin:12px 0 18px}
.ba-card h3{margin:0 0 6px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:17px}
.ba-badge{font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;background:var(--nb-accent,#4f46e5);color:var(--nb-on-accent,#fff)}
.ba-badge.soft{background:var(--nb-surface-3,rgba(128,128,128,.18));color:var(--nb-text,inherit)}
.ba-lead{font-size:14px;margin:0 0 10px}
.ba-card h4{margin:14px 0 4px;font-size:14px}
.ba-card p,.ba-card li{font-size:13px;line-height:1.55}
.ba-card ul{margin:4px 0 8px 18px;padding:0}
.ba-act{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px}
.ba-act label{font-size:13px;display:flex;align-items:center;gap:6px}
.ba-note{font-size:12px;color:var(--nb-muted,#888);margin-top:8px}
.ba-log{font-size:12px;max-height:260px;overflow:auto;padding:8px 10px;border-radius:8px;background:var(--nb-surface-2,rgba(128,128,128,.08));white-space:pre-wrap;margin-top:10px}
`;

return view.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(callStatus('hybrid-failover'), {}),
			L.resolveDefault(callStatus('zapret-manager'), {}),
			L.resolveDefault(callStatus('roamd'), {})
		]);
	},

	install: function(st, botBox, logBox) {
		var self = this;
		return callInstall('hybrid-failover', botBox.checked).then(function(r) {
			if (!r || !r.ok) {
				ui.addNotification(null, E('p', (r && r.output) || _('Не удалось начать установку')), 'danger');
				return;
			}
			logBox.style.display = '';
			var tick = function() {
				return L.resolveDefault(callLog(), {}).then(function(l) {
					var text = (l && l.log) || '';
					logBox.textContent = text;
					logBox.scrollTop = logBox.scrollHeight;
					if (/^=== (done|failed)/m.test(text)) {
						poll.remove(tick);
						if (/^=== done/m.test(text))
							window.setTimeout(function() { window.location.reload(); }, 1500);
					}
				});
			};
			poll.add(tick, 2);
		});
	},

	installSimple: function(id, logBox) {
		return callInstall(id, false).then(function(r) {
			if (!r || !r.ok) {
				ui.addNotification(null, E('p', (r && r.output) || _('Не удалось начать установку')), 'danger');
				return;
			}
			logBox.style.display = '';
			var tick = function() {
				return L.resolveDefault(callLog(), {}).then(function(l) {
					var text = (l && l.log) || '';
					logBox.textContent = text;
					logBox.scrollTop = logBox.scrollHeight;
					if (/^=== (done|failed)/m.test(text)) {
						poll.remove(tick);
						if (/^=== done/m.test(text))
							window.setTimeout(function() { window.location.reload(); }, 1500);
					}
				});
			};
			poll.add(tick, 2);
		});
	},

	render: function(data) {
		var st = data[0] || {};
		var zm = data[1] || {};
		var installed = st.installed || '';
		var feed = st.feed || '';
		var badges = [];

		if (installed)
			badges.push(E('span', { 'class': 'ba-badge' }, _('установлен %s').format(installed)));
		else if (st.manual)
			badges.push(E('span', { 'class': 'ba-badge soft' }, _('установлен вручную')));
		else
			badges.push(E('span', { 'class': 'ba-badge soft' }, _('не установлен')));
		if (installed && st.service)
			badges.push(E('span', { 'class': 'ba-badge' }, _('работает')));

		var upToDate = installed && feed && installed == feed;
		var label = !installed ? _('Установить') : upToDate ? _('Переустановить') : _('Обновить до %s').format(feed);

		var botBox = E('input', { 'type': 'checkbox' });
		if (st.bot) botBox.checked = true;
		var logBox = E('pre', { 'class': 'ba-log', 'style': 'display:none' });

		var act = E('div', { 'class': 'ba-act' }, [
			E('button', {
				'class': 'cbi-button cbi-button-action important',
				'disabled': st.running ? true : null,
				'click': ui.createHandlerFn(this, 'install', st, botBox, logBox)
			}, label),
			E('label', {}, [ botBox, _('вместе с ботом для Telegram') ]),
			installed ? E('a', { 'class': 'cbi-button cbi-button-neutral', 'href': L.url('admin/services/hybrid-failover') }, _('Открыть Hybrid Failover')) : ''
		]);

		var notes = [];
		if (!feed)
			notes.push(_('Версию в фиде узнать не удалось. Проверьте интернет на роутере.'));
		else if (!installed)
			notes.push(_('В фиде версия %s.').format(feed));
		if (st.manual)
			notes.push(_('Сейчас Hybrid Failover стоит не из фида, а своим скриптом установки. Установка отсюда заменит его пакетами из фида, настройки сохранятся. После этого обновления будут приходить вместе с остальными пакетами.'));

		var zmInstalled = zm.installed || '';
		var zmFeed = zm.feed || '';
		// the package is there but its installer step did not finish
		var zmBroken = zmInstalled && !zm.panel;
		var zmBadges = [ E('span', { 'class': 'ba-badge ' + (zmInstalled ? '' : 'soft') },
			zmInstalled ? _('установлен %s').format(zmInstalled) : _('не установлен')) ];
		if (zmBroken)
			zmBadges.push(E('span', { 'class': 'ba-badge soft' }, _('нужно доустановить')));
		var zmLabel = zmBroken ? _('Доустановить') : !zmFeed ? (zmInstalled ? _('Установлен') : _('Пока недоступен')) :
			!zmInstalled ? _('Установить') : zmInstalled == zmFeed ? _('Переустановить') : _('Обновить до %s').format(zmFeed);
		var zmLog = E('pre', { 'class': 'ba-log', 'style': 'display:none' });

		var rd = data[2] || {};
		var rdInstalled = rd.installed || '';
		var rdFeed = rd.feed || '';
		var rdBadges = [ E('span', { 'class': 'ba-badge ' + (rdInstalled ? '' : 'soft') },
			rdInstalled ? _('установлен %s').format(rdInstalled) : _('не установлен')) ];
		if (rdInstalled && rd.service)
			rdBadges.push(E('span', { 'class': 'ba-badge' }, _('работает')));
		var rdLabel = !rdFeed ? (rdInstalled ? _('Установлен') : _('Пока недоступен')) :
			!rdInstalled ? _('Установить') : rdInstalled == rdFeed ? _('Переустановить') : _('Обновить до %s').format(rdFeed);
		var rdLog = E('pre', { 'class': 'ba-log', 'style': 'display:none' });

		return E([], [
			E('style', {}, CSS),
			E('h2', {}, _('Дополнения')),
			E('div', { 'class': 'cbi-map-descr' }, _('Программы, которые не входят в прошивку, но собраны для неё и ставятся из фида Beam WRT одной кнопкой. Новые версии появляются в фиде сами, после выхода каждого релиза.')),

			E('div', { 'class': 'ba-card' }, [
				E('h3', {}, [ 'Zapret Manager' ].concat(zmBadges)),
				E('p', { 'class': 'ba-lead' }, _('Панель для установки и настройки Zapret, Zapret2, ByeDPI, ByeTube, NetShift, AmneziaWG и других средств маршрутизации и обхода блокировок.')),

				E('h4', {}, _('Версия для Beam WRT')),
				E('p', {}, _('Менеджер адаптирован под архитектуру aarch64_cortex-a73 и пакетный менеджер apk. Zapret, Zapret2, ByeDPI, NetShift, sing-box, hev-socks5-tunnel и интерфейс AmneziaWG ставятся из подписанного фида Beam WRT.')),

				E('h4', {}, _('Что произойдёт при установке')),
				E('ul', {}, [
					E('li', {}, _('Поставится только панель Zapret Manager и её служебные зависимости. Zapret и другие способы обхода не включаются автоматически.')),
					E('li', {}, _('После установки откройте панель и выберите нужный способ. Его пакеты будут установлены из фида Beam WRT с проверкой подписи.')),
					E('li', {}, _('Внешние модули AmneziaWG не используются. Менеджер оставляет встроенный модуль, который собран вместе с ядром этой прошивки.'))
				]),

				E('div', { 'class': 'ba-act' }, [
					E('button', {
						'class': 'cbi-button cbi-button-action important',
					'disabled': zm.running || (!zmFeed && !zmBroken) ? true : null,
						'click': ui.createHandlerFn(this, 'installSimple', 'zapret-manager', zmLog)
					}, zmLabel),
					zm.panel ? E('a', { 'class': 'cbi-button cbi-button-neutral', 'href': L.url('admin/services/zapret-manager') }, _('Открыть Zapret Manager')) : ''
				]),
				zmBroken ? E('div', { 'class': 'ba-note' }, _('Пакет Zapret Manager стоит, но сама панель не создалась. Обычно так бывает, когда во время установки не было интернета. Нажмите кнопку, чтобы завершить установку, роутеру понадобится доступ в интернет.')) : '',
				!zmFeed && !zmBroken ? E('div', { 'class': 'ba-note' }, _('Пакет пока не найден в фиде. Сначала нужно опубликовать новую сборку фида.')) : '',
				zmLog,
				E('div', { 'class': 'ba-note' }, [
					_('Исходный проект'), ' ',
					E('a', { 'href': 'https://github.com/StressOzz/Zapret-Manager', 'target': '_blank', 'rel': 'noopener' }, 'StressOzz/Zapret-Manager')
				])
			]),

			E('div', { 'class': 'ba-card' }, [
				E('h3', {}, [ 'roamd' ].concat(rdBadges)),
				E('p', { 'class': 'ba-lead' }, _('Бесшовный роуминг Wi-Fi. Уводит клиентов с 2,4 ГГц на 5 ГГц, когда они рядом с роутером, и помогает им быстро переходить между точками доступа одной сети.')),

				E('h4', {}, _('Что умеет')),
				E('ul', {}, [
					E('li', {}, _('Сам включает в настройках Wi-Fi 802.11k (соседние точки), 802.11v (переход по подсказке роутера) и 802.11r (быстрый переход без повторного входа).')),
					E('li', {}, _('Переводит клиента в другой диапазон только тогда, когда связь от этого точно не станет хуже.')),
					E('li', {}, _('Собирает из нескольких роутеров OpenWrt одну сеть Wi-Fi: настраивает их как точки доступа и показывает общую таблицу клиентов.'))
				]),

				E('h4', {}, _('Особенности на Beam WRT')),
				E('ul', {}, [
					E('li', {}, _('Сеть MLO roamd не меняет. 802.11r на ней приводил к сбою прошивки модуля 5 ГГц и перезагрузке роутера, поэтому в сборке для Beam WRT такие сети пропускаются.')),
					E('li', {}, _('BE7000 может управлять сетью из нескольких роутеров и сам подключаться узлом к сети, которой управляет другой BE7000 с Beam WRT. К контроллеру на обычной OpenWrt узлом он не подключится: тот ищет roamd для узла в фиде roamd, а там нет сборки под процессор BE7000. При захвате узел сбрасывается к заводским настройкам, MLO на нём после этого выключен.')),
					E('li', {}, _('Обновления roamd приходят из фида Beam WRT вместе с остальными пакетами, а не через встроенную проверку обновлений.'))
				]),

				E('h4', {}, _('Что произойдёт при установке')),
				E('ul', {}, [
					E('li', {}, _('Поставятся служба roamd, страница Сеть, Роуминг Wi-Fi и её перевод.')),
					E('li', {}, _('Служба сразу запустится и пропишет 802.11k/v/r в настройки Wi-Fi. Wi-Fi при этом перезапустится на несколько секунд.'))
				]),

				E('div', { 'class': 'ba-act' }, [
					E('button', {
						'class': 'cbi-button cbi-button-action important',
						'disabled': rd.running || !rdFeed ? true : null,
						'click': ui.createHandlerFn(this, 'installSimple', 'roamd', rdLog)
					}, rdLabel),
					rdInstalled ? E('a', { 'class': 'cbi-button cbi-button-neutral', 'href': L.url('admin/network/roamd') }, _('Открыть roamd')) : ''
				]),
				!rdFeed ? E('div', { 'class': 'ba-note' }, _('Пакет пока не найден в фиде. Сначала нужно опубликовать новую сборку фида.')) : '',
				rdLog,
				E('div', { 'class': 'ba-note' }, [
					_('Исходный проект'), ' ',
					E('a', { 'href': 'https://github.com/Ground-Zerro/roamd', 'target': '_blank', 'rel': 'noopener' }, 'Ground-Zerro/roamd')
				])
			]),

			E('div', { 'class': 'ba-card' }, [
				E('h3', {}, [ 'Hybrid Failover' ].concat(badges)),
				E('p', { 'class': 'ba-lead' }, _('Маршрутизация через VPN с автоматическим резервом. Основной канал идёт через ваш VPN, например AmneziaWG. Если он падает, трафик сам уходит на резервные прокси, а когда VPN поднимается, возвращается обратно. Устройствам в сети ничего настраивать не нужно.')),

				E('h4', {}, _('Зачем это нужно')),
				E('p', {}, _('Обычный VPN на роутере работает по принципу всё или ничего. Если сервер недоступен, пропадают и сайты, которые через него шли. Hybrid Failover держит несколько каналов сразу, сам проверяет, какой из них жив и быстрее, и переключается без вашего участия. Заодно он умеет пускать через VPN только нужные сервисы, а остальное напрямую.')),

				E('h4', {}, _('Что умеет')),
				E('ul', {}, [
					E('li', {}, _('Прозрачно перехватывает трафик локальной сети и направляет его по правилам. Правила задаются доменами, подсетями и готовыми списками сервисов, например youtube или telegram.')),
					E('li', {}, _('Проверяет каналы и сам выбирает живой и самый быстрый. Можно держать основной канал и переключаться только при его падении.')),
					E('li', {}, _('Понимает ссылки vless, ss, trojan, hysteria2, socks и экспорт из Amnezia, включая AmneziaWG 3.1.')),
					E('li', {}, _('Правила для отдельных устройств. Например, приставка всегда через VPN, а телевизор мимо.')),
					E('li', {}, _('Разные сервисы можно развести по разным туннелям, чтобы видео не делило канал со всем остальным.')),
					E('li', {}, _('Графики по каждому каналу в LuCI и бот для Telegram, который показывает статус, переключает каналы и присылает уведомления.'))
				]),

				E('h4', {}, _('Что понадобится')),
				E('p', {}, _('Свой VPN-сервер или ссылки на прокси. Сам по себе Hybrid Failover никуда трафик не уводит, ему нужны каналы, которые вы добавите. AmneziaWG уже встроен в прошивку, ставить его отдельно не нужно.')),

				E('h4', {}, _('Что произойдёт при установке')),
				E('ul', {}, [
					E('li', {}, _('Поставятся служба, страница в LuCI и её перевод, а если отмечено, ещё и бот для Telegram.')),
					E('li', {}, _('Служба сама не включится и трафик не тронет. Сначала откройте Сервисы, Hybrid Failover, добавьте каналы и включите её там.')),
					E('li', {}, _('Если на роутере стоит отдельный sing-box, Hybrid Failover его остановит и выключит, чтобы они не мешали друг другу.')),
					E('li', {}, _('Когда служба включена, она берёт на себя DNS роутера и выключает IPv6 в локальной сети. Это нужно для маршрутизации по доменам.'))
				]),

				act,
				notes.length ? E('div', { 'class': 'ba-note' }, notes.map(function(n) { return E('p', {}, n); })) : '',
				logBox,
				E('div', { 'class': 'ba-note' }, [
					_('Исходники и подробная документация на GitHub'), ' ',
					E('a', { 'href': 'https://github.com/timofey-maykov/openwrt-hybrid-failover', 'target': '_blank', 'rel': 'noopener' }, 'openwrt-hybrid-failover')
				])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
