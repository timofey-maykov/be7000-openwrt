'use strict';
'require view';
'require rpc';
'require ui';
'require poll';

var callStatus = rpc.declare({ object: 'be7000-update', method: 'status' });
var callCheck = rpc.declare({ object: 'be7000-update', method: 'check' });
var callDownload = rpc.declare({ object: 'be7000-update', method: 'download' });
var callApply = rpc.declare({ object: 'be7000-update', method: 'apply' });
var callLog = rpc.declare({ object: 'be7000-update', method: 'log' });

function fmtDate(iso) {
	if (!iso)
		return '';
	var d = new Date(iso);
	if (isNaN(d.getTime()))
		return iso;
	return d.toLocaleString();
}

function mb(bytes) {
	if (!bytes)
		return '';
	return (bytes / 1048576).toFixed(1) + ' МБ';
}

return view.extend({
	load: function() {
		return callStatus().catch(function() { return { ok: false }; });
	},

	refresh: function() {
		var self = this;
		return callStatus().then(function(st) {
			var fresh = self.render(st);
			var node = document.getElementById('be7000-update');
			if (node && fresh)
				node.parentNode.replaceChild(fresh, node);
		});
	},

	check: function(ev) {
		var self = this;
		var btn = ev.target;
		btn.disabled = true;
		return callCheck().then(function(res) {
			if (res && res.ok === false)
				ui.addNotification(null, E('p', res.error || 'не удалось проверить'), 'error');
			return self.refresh();
		}).finally(function() { btn.disabled = false; });
	},

	apply: function(ev, st) {
		var self = this;
		var latest = st.latest || {};
		var cur = (st.installed || {}).version || 'dev';
		if (!confirm('Поставить ' + latest.latest + ' поверх ' + cur + '? Настройки сохранятся, роутер перезагрузится, связь пропадёт на пару минут.'))
			return;
		var btn = ev.target;
		btn.disabled = true;
		ui.showModal('Обновление', [
			E('p', { 'class': 'spinning' }, 'Скачиваю образ и проверяю сумму. Не выключайте роутер.'),
			E('pre', { 'id': 'be7000-update-log', 'style': 'max-height:14em;overflow:auto' }, '')
		]);
		return callDownload().then(function(res) {
			if (!res || res.ok === false) {
				ui.hideModal();
				ui.addNotification(null, E('p', (res && res.error) || 'не удалось скачать образ'), 'error');
				btn.disabled = false;
				return;
			}
			return callApply().then(function() {
				var logEl = document.getElementById('be7000-update-log');
				var tries = 0;
				poll.add(function() {
					tries++;
					return callLog().then(function(l) {
						if (logEl && l && l.log)
							logEl.textContent = l.log;
					}).catch(function() {
						// the router is rebooting into the new image
						ui.showModal('Обновление', [
							E('p', { 'class': 'spinning' }, 'Роутер перезагружается в новую версию. Страница обновится сама.')
						]);
						if (tries > 6)
							window.setTimeout(function() { window.location.reload(); }, 60000);
					});
				}, 3);
			});
		});
	},

	render: function(st) {
		var self = this;
		st = st || {};
		var inst = st.installed || {};
		var latest = st.latest || null;
		var avail = latest && (latest.available === 1 || latest.available === true);

		var rows = [
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left', 'width': '33%' }, 'Установлено'),
				E('td', { 'class': 'td left' }, (inst.version || 'dev') + (inst.tag ? ' (' + inst.tag + ')' : '') + (inst.date ? ', собрано ' + fmtDate(inst.date) : ''))
			]),
			E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left' }, 'Последняя на GitHub'),
				E('td', { 'class': 'td left' }, latest ? (latest.latest + (latest.published_at ? ', ' + fmtDate(latest.published_at) : '') + (latest.image_size ? ', образ ' + mb(latest.image_size) : '')) : 'ещё не проверяли')
			])
		];

		var status;
		if (!latest)
			status = E('p', {}, 'Нажмите «Проверить», страница спросит GitHub, есть ли версия новее.');
		else if (avail)
			status = E('p', { 'style': 'color:#c60' }, 'Есть обновление. Ставится обычным sysupgrade с сохранением настроек, образ проверяется по контрольной сумме из релиза.');
		else
			status = E('p', {}, 'Стоит последняя версия.');

		var buttons = [
			E('button', { 'class': 'btn', 'click': ui.createHandlerFn(self, 'check') }, 'Проверить')
		];
		if (avail)
			buttons.push(E('button', { 'class': 'btn cbi-button-action important', 'style': 'margin-left:.5em', 'click': function(ev) { return self.apply(ev, st); } }, 'Скачать и установить ' + latest.latest));

		var notes = null;
		if (latest && latest.body)
			notes = E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, 'Что в ' + latest.latest),
				E('pre', { 'style': 'white-space:pre-wrap;font-family:inherit' }, latest.body)
			]);

		return E('div', { 'id': 'be7000-update' }, [
			E('h2', {}, 'Обновление сборки'),
			E('div', { 'class': 'cbi-map-descr' }, 'Проверка новых версий этой сборки на GitHub и установка без ручной загрузки файлов. Модули ядра и пакеты фида после обновления подхватываются под новое ядро сами.'),
			E('div', { 'class': 'cbi-section' }, [
				E('table', { 'class': 'table' }, rows),
				status,
				E('div', { 'style': 'margin-top:.5em' }, buttons)
			]),
			notes
		].filter(Boolean));
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
