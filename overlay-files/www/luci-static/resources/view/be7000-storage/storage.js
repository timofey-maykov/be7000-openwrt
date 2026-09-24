'use strict';
'require view';
'require rpc';
'require ui';
'require poll';

var callStatus = rpc.declare({ object: 'be7000-storage', method: 'status' });
var callList = rpc.declare({ object: 'be7000-storage', method: 'list' });
var callUse = rpc.declare({ object: 'be7000-storage', method: 'use', params: ['device'] });
var callRevert = rpc.declare({ object: 'be7000-storage', method: 'revert' });

function mb(kb) {
	if (!kb)
		return '—';
	return (kb / 1024).toFixed(1) + ' МБ';
}

function gb(sizeMb) {
	if (!sizeMb)
		return '—';
	if (sizeMb >= 1024)
		return (sizeMb / 1024).toFixed(1) + ' ГБ';
	return sizeMb + ' МБ';
}

return view.extend({
	load: function() {
		return Promise.all([
			callStatus().catch(function() { return {}; }),
			callList().catch(function() { return {}; })
		]);
	},

	reload: function() {
		var self = this;
		return this.load().then(function(data) {
			var fresh = self.render(data);
			var node = document.getElementById('hf-storage');
			if (node && fresh)
				node.parentNode.replaceChild(fresh, node);
		});
	},

	handleUse: function(dev, label) {
		var self = this;
		ui.showModal(_('Перенести /overlay на %s').format(dev), [
			E('p', {}, _('Диск будет отформатирован, всё его содержимое пропадёт.')),
			E('p', {}, _('Текущие настройки и установленные пакеты переедут на него. Изменение вступит в силу после перезагрузки.')),
			E('p', { 'class': 'alert-message warning' }, label || dev),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Отмена')),
				' ',
				E('button', {
					'class': 'btn cbi-button-negative',
					'click': function() {
						ui.showModal(_('Переношу'), [E('p', { 'class': 'spinning' }, _('Форматирование и копирование, это может занять минуту'))]);
						callUse(dev).then(function(res) {
							ui.hideModal();
							if (res && res.ok) {
								ui.addNotification(null, E('p', {}, _('Готово. Перезагрузите роутер, чтобы /overlay переехал.')), 'info');
								self.reload();
							}
							else {
								ui.addNotification(null, E('pre', {}, (res && res.output) || _('Не получилось')), 'error');
							}
						}).catch(function(err) {
							ui.hideModal();
							ui.addNotification(null, E('p', {}, String(err)), 'error');
						});
					}
				}, _('Форматировать и перенести'))
			])
		]);
	},

	handleRevert: function() {
		var self = this;
		ui.showModal(_('Вернуть /overlay на внутреннюю флешку'), [
			E('p', {}, _('Данные на диске останутся, но использоваться перестанут. Изменение вступит в силу после перезагрузки.')),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Отмена')),
				' ',
				E('button', {
					'class': 'btn cbi-button-action',
					'click': function() {
						callRevert().then(function(res) {
							ui.hideModal();
							if (res && res.ok) {
								ui.addNotification(null, E('p', {}, _('Готово. Перезагрузите роутер.')), 'info');
								self.reload();
							}
							else {
								ui.addNotification(null, E('pre', {}, (res && res.output) || _('Не получилось')), 'error');
							}
						});
					}
				}, _('Вернуть'))
			])
		]);
	},

	render: function(data) {
		var self = this;
		var status = (data[0] && data[0].data) || {};
		var disks = (data[1] && data[1].data) || [];

		var rows = [];
		if (!disks.length) {
			rows.push(E('p', {}, _('Накопители не найдены. Вставьте диск в порт USB и обновите страницу.')));
		}
		else {
			var table = E('table', { 'class': 'table' }, [
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th' }, _('Устройство')),
					E('th', { 'class': 'th' }, _('Размер')),
					E('th', { 'class': 'th' }, _('Модель')),
					E('th', { 'class': 'th' }, '')
				])
			]);
			disks.forEach(function(d) {
				var action;
				if (d.mounted) {
					action = E('span', {}, _('используется'));
				}
				else {
					action = E('button', {
						'class': 'btn cbi-button-action',
						'click': function() { self.handleUse(d.device, d.model); }
					}, _('Перенести сюда'));
				}
				table.appendChild(E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, d.device),
					E('td', { 'class': 'td' }, gb(d.size_mb)),
					E('td', { 'class': 'td' }, d.model || '—'),
					E('td', { 'class': 'td' }, action)
				]));
			});
			rows.push(table);
		}

		var onExternal = status.extroot_enabled === '1';

		return E('div', { 'id': 'hf-storage' }, [
			E('h2', {}, _('Накопитель')),
			E('p', {}, _('Всё, что роутер помнит между перезагрузками, лежит в /overlay: настройки, установленные пакеты, списки. Встроенного места немного, поэтому его можно перенести на USB-диск.')),

			E('h3', {}, _('Сейчас')),
			E('table', { 'class': 'table' }, [
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'width': '33%' }, _('Раздел')),
					E('td', { 'class': 'td' }, status.device || '—')
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, _('Всего')),
					E('td', { 'class': 'td' }, mb(status.total_kb))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, _('Свободно')),
					E('td', { 'class': 'td' }, mb(status.available_kb))
				])
			]),

			onExternal ? E('p', {}, [
				E('button', {
					'class': 'btn cbi-button-reset',
					'click': function() { self.handleRevert(); }
				}, _('Вернуть на внутреннюю флешку'))
			]) : E('span'),

			E('h3', {}, _('Доступные диски')),
			E('div', {}, rows)
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
