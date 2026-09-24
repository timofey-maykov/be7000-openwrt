'use strict';
'require view';
'require rpc';
'require ui';

var callStatus = rpc.declare({ object: 'be7000-docker', method: 'status' });
var callDf = rpc.declare({ object: 'be7000-docker', method: 'df' });
var callPrune = rpc.declare({ object: 'be7000-docker', method: 'prune', params: ['what'] });
var callStacks = rpc.declare({ object: 'be7000-docker', method: 'stacks' });
var callRead = rpc.declare({ object: 'be7000-docker', method: 'stack_read', params: ['name'] });
var callWrite = rpc.declare({ object: 'be7000-docker', method: 'stack_write', params: ['name', 'compose'] });
var callUp = rpc.declare({ object: 'be7000-docker', method: 'stack_up', params: ['name'] });
var callDown = rpc.declare({ object: 'be7000-docker', method: 'stack_down', params: ['name'] });
var callPull = rpc.declare({ object: 'be7000-docker', method: 'stack_pull', params: ['name'] });
var callLogs = rpc.declare({ object: 'be7000-docker', method: 'stack_logs', params: ['name'] });
var callRemove = rpc.declare({ object: 'be7000-docker', method: 'stack_remove', params: ['name'] });

// Ready-made stacks for the things people actually run on a router. Each one
// is a plain compose file, so it stays editable after deployment.
var TEMPLATES = [
	{
		name: 'portainer',
		title: 'Portainer CE',
		hint: 'Полное управление докером в отдельном веб-интерфейсе, порт 9443',
		compose: 'services:\n  portainer:\n    image: portainer/portainer-ce:latest\n    container_name: portainer\n    restart: always\n    ports:\n      - "9443:9443"\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock\n      - portainer_data:/data\n\nvolumes:\n  portainer_data:\n'
	},
	{
		name: 'adguard',
		title: 'AdGuard Home',
		hint: 'Блокировка рекламы и свой DNS, веб-интерфейс на 3000',
		compose: 'services:\n  adguard:\n    image: adguard/adguardhome:latest\n    container_name: adguard\n    restart: always\n    ports:\n      - "3000:3000"\n      - "5353:53/udp"\n    volumes:\n      - adguard_work:/opt/adguardhome/work\n      - adguard_conf:/opt/adguardhome/conf\n\nvolumes:\n  adguard_work:\n  adguard_conf:\n'
	},
	{
		name: 'uptime-kuma',
		title: 'Uptime Kuma',
		hint: 'Мониторинг доступности сервисов, порт 3001',
		compose: 'services:\n  uptime-kuma:\n    image: louislam/uptime-kuma:1\n    container_name: uptime-kuma\n    restart: always\n    ports:\n      - "3001:3001"\n    volumes:\n      - kuma_data:/app/data\n\nvolumes:\n  kuma_data:\n'
	},
	{
		name: 'vaultwarden',
		title: 'Vaultwarden',
		hint: 'Свой менеджер паролей, совместим с клиентами Bitwarden, порт 8080',
		compose: 'services:\n  vaultwarden:\n    image: vaultwarden/server:latest\n    container_name: vaultwarden\n    restart: always\n    environment:\n      - WEBSOCKET_ENABLED=true\n    ports:\n      - "8080:80"\n    volumes:\n      - vw_data:/data\n\nvolumes:\n  vw_data:\n'
	},
	{
		name: 'qbittorrent',
		title: 'qBittorrent',
		hint: 'Торрент-клиент с веб-интерфейсом на 8081, качает в /mnt',
		compose: 'services:\n  qbittorrent:\n    image: lscr.io/linuxserver/qbittorrent:latest\n    container_name: qbittorrent\n    restart: always\n    environment:\n      - PUID=0\n      - PGID=0\n      - WEBUI_PORT=8081\n    ports:\n      - "8081:8081"\n      - "6881:6881"\n      - "6881:6881/udp"\n    volumes:\n      - qbt_config:/config\n      - /mnt:/downloads\n\nvolumes:\n  qbt_config:\n'
	},
	{
		name: 'nginx-proxy-manager',
		title: 'Nginx Proxy Manager',
		hint: 'Обратный прокси с сертификатами по кнопке, панель на 81',
		compose: 'services:\n  npm:\n    image: jc21/nginx-proxy-manager:latest\n    container_name: npm\n    restart: always\n    ports:\n      - "8880:80"\n      - "8443:443"\n      - "81:81"\n    volumes:\n      - npm_data:/data\n      - npm_ssl:/etc/letsencrypt\n\nvolumes:\n  npm_data:\n  npm_ssl:\n'
	},
	{
		name: 'homeassistant',
		title: 'Home Assistant',
		hint: 'Умный дом, работает в сети хоста',
		compose: 'services:\n  homeassistant:\n    image: ghcr.io/home-assistant/home-assistant:stable\n    container_name: homeassistant\n    restart: always\n    network_mode: host\n    volumes:\n      - ha_config:/config\n      - /etc/localtime:/etc/localtime:ro\n\nvolumes:\n  ha_config:\n'
	},
	{
		name: 'watchtower',
		title: 'Watchtower',
		hint: 'Сам обновляет запущенные контейнеры до свежих образов',
		compose: 'services:\n  watchtower:\n    image: containrrr/watchtower:latest\n    container_name: watchtower\n    restart: always\n    command: --cleanup --interval 86400\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock\n'
	}
];

function busy(title, promise, onDone) {
	ui.showModal(title, [E('p', { 'class': 'spinning' }, _('Выполняется'))]);
	return promise.then(function(res) {
		ui.hideModal();
		if (res && res.ok) {
			if (res.output)
				ui.addNotification(null, E('pre', { 'style': 'white-space:pre-wrap' }, res.output), 'info');
			else
				ui.addNotification(null, E('p', {}, _('Готово')), 'info');
		}
		else {
			ui.addNotification(null, E('pre', { 'style': 'white-space:pre-wrap' }, (res && res.output) || _('Не получилось')), 'error');
		}
		if (onDone) onDone();
	}).catch(function(err) {
		ui.hideModal();
		ui.addNotification(null, E('p', {}, String(err)), 'error');
	});
}

return view.extend({
	load: function() {
		return Promise.all([
			callStatus().catch(function() { return {}; }),
			callStacks().catch(function() { return {}; })
		]);
	},

	refresh: function() {
		var self = this;
		return self.load().then(function(data) {
			var fresh = self.render(data);
			var node = document.getElementById('be7000-docker');
			if (node && fresh) node.parentNode.replaceChild(fresh, node);
		});
	},

	editor: function(name, body, isNew) {
		var self = this;
		var ta = E('textarea', {
			'style': 'width:100%;height:24em;font-family:monospace;font-size:12px',
			'spellcheck': 'false'
		}, body || '');
		var nameInput = E('input', { 'type': 'text', 'value': name || '', 'style': 'width:20em' });

		ui.showModal(isNew ? _('Новый стек') : _('Стек %s').format(name), [
			isNew ? E('p', {}, [ _('Имя (латиница, цифры, дефис): '), nameInput ]) : E('p', {}, _('Файл docker-compose.yml')),
			ta,
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Отмена')),
				' ',
				E('button', {
					'class': 'btn cbi-button-action',
					'click': function() {
						var n = isNew ? nameInput.value.trim() : name;
						if (!/^[a-zA-Z0-9_-]{1,40}$/.test(n)) {
							ui.addNotification(null, E('p', {}, _('Имя может содержать только латиницу, цифры, дефис и подчёркивание')), 'error');
							return;
						}
						ui.hideModal();
						busy(_('Сохраняю'), callWrite(n, ta.value), function() { self.refresh(); });
					}
				}, _('Сохранить')),
				' ',
				E('button', {
					'class': 'btn cbi-button-positive',
					'click': function() {
						var n = isNew ? nameInput.value.trim() : name;
						if (!/^[a-zA-Z0-9_-]{1,40}$/.test(n)) {
							ui.addNotification(null, E('p', {}, _('Проверьте имя')), 'error');
							return;
						}
						ui.hideModal();
						callWrite(n, ta.value).then(function() {
							busy(_('Запускаю'), callUp(n), function() { self.refresh(); });
						});
					}
				}, _('Сохранить и запустить'))
			])
		]);
	},

	render: function(data) {
		var self = this;
		var st = (data[0] && data[0].data) || {};
		var stacks = (data[1] && data[1].data) || [];

		var head = [];
		if (!st.installed) {
			head.push(E('div', { 'class': 'alert-message warning' }, [
				E('p', {}, _('Docker не установлен. Поставьте его командой be7000-docker setup, она сама найдёт диск и положит данные туда, а не в 19 МБ внутренней памяти.')),
				E('pre', {}, 'be7000-docker setup --yes')
			]));
		}
		else if (!st.daemon_ok) {
			head.push(E('div', { 'class': 'alert-message warning' }, _('Docker установлен, но служба не отвечает. Проверьте /etc/init.d/dockerd status')));
		}
		else {
			head.push(E('p', {}, _('Docker %s работает. Контейнеры, образы, сети и тома по отдельности живут в разделе Сервисы, Dockerman.').format(st.version)));
		}

		var table = E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('Стек')),
				E('th', { 'class': 'th' }, _('Состояние')),
				E('th', { 'class': 'th' }, '')
			])
		]);

		if (!stacks.length) {
			table.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td', 'colspan': '3' }, _('Пока ни одного стека. Возьмите готовый ниже или создайте свой.'))
			]));
		}

		stacks.forEach(function(s) {
			table.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, s.name),
				E('td', { 'class': 'td' }, E('pre', { 'style': 'margin:0;white-space:pre-wrap' }, s.state || _('остановлен'))),
				E('td', { 'class': 'td', 'style': 'white-space:nowrap' }, [
					E('button', { 'class': 'btn cbi-button-positive', 'click': function() { busy(_('Запускаю'), callUp(s.name), function() { self.refresh(); }); } }, _('Запустить')),
					' ',
					E('button', { 'class': 'btn', 'click': function() { busy(_('Останавливаю'), callDown(s.name), function() { self.refresh(); }); } }, _('Остановить')),
					' ',
					E('button', { 'class': 'btn', 'click': function() { busy(_('Обновляю образы'), callPull(s.name)); } }, _('Обновить')),
					' ',
					E('button', { 'class': 'btn', 'click': function() { busy(_('Читаю журнал'), callLogs(s.name)); } }, _('Журнал')),
					' ',
					E('button', { 'class': 'btn', 'click': function() {
						callRead(s.name).then(function(res) {
							self.editor(s.name, (res && res.data && res.data.compose) || '', false);
						});
					} }, _('Править')),
					' ',
					E('button', { 'class': 'btn cbi-button-negative', 'click': function() {
						if (confirm(_('Удалить стек %s вместе с его томами?').format(s.name)))
							busy(_('Удаляю'), callRemove(s.name), function() { self.refresh(); });
					} }, _('Удалить'))
				])
			]));
		});

		var tpl = E('table', { 'class': 'table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th' }, _('Готовый стек')),
				E('th', { 'class': 'th' }, _('Что это')),
				E('th', { 'class': 'th' }, '')
			])
		]);
		TEMPLATES.forEach(function(t) {
			tpl.appendChild(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td' }, t.title),
				E('td', { 'class': 'td' }, t.hint),
				E('td', { 'class': 'td', 'style': 'white-space:nowrap' }, [
					E('button', { 'class': 'btn', 'click': function() { self.editor(t.name, t.compose, true); } }, _('Посмотреть и изменить')),
					' ',
					E('button', { 'class': 'btn cbi-button-action', 'click': function() {
						callWrite(t.name, t.compose).then(function() {
							busy(_('Разворачиваю %s').format(t.title), callUp(t.name), function() { self.refresh(); });
						});
					} }, _('Развернуть'))
				])
			]));
		});

		return E('div', { 'id': 'be7000-docker' }, [
			E('h2', {}, _('Docker: стеки')),
			E('div', {}, head),

			E('h3', {}, _('Мои стеки')),
			table,
			E('p', {}, E('button', { 'class': 'btn cbi-button-add', 'click': function() { self.editor('', 'services:\n  app:\n    image: \n    restart: always\n', true); } }, _('Создать стек'))),

			E('h3', {}, _('Готовые')),
			tpl,

			E('h3', {}, _('Обслуживание')),
			E('p', {}, [
				E('button', { 'class': 'btn', 'click': function() { busy(_('Считаю занятое место'), callDf()); } }, _('Сколько занято')),
				' ',
				E('button', { 'class': 'btn', 'click': function() { busy(_('Чищу'), callPrune('system')); } }, _('Убрать мусор')),
				' ',
				E('button', { 'class': 'btn', 'click': function() {
					if (confirm(_('Удалить все образы, которые не используются запущенными контейнерами?')))
						busy(_('Чищу образы'), callPrune('images'));
				} }, _('Удалить лишние образы')),
				' ',
				E('button', { 'class': 'btn', 'click': function() {
					if (confirm(_('Удалить тома, которые ни к чему не подключены? Данные в них пропадут.')))
						busy(_('Чищу тома'), callPrune('volumes'));
				} }, _('Удалить неподключённые тома'))
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
