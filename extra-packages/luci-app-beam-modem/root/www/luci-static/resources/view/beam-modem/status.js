'use strict';
'require view';
'require rpc';
'require poll';
'require dom';
'require ui';

// Status, Modem: what ModemManager knows about the modem, refreshed every
// 5 seconds, plus the mode and band settings. The data comes from the rpcd
// object beam-modem, which only runs mmcli.

var callStatus = rpc.declare({ object: 'beam-modem', method: 'status' });
var callModes = rpc.declare({ object: 'beam-modem', method: 'set_modes', params: [ 'allowed', 'preferred' ] });
var callBands = rpc.declare({ object: 'beam-modem', method: 'set_bands', params: [ 'bands' ] });
var callEnable = rpc.declare({ object: 'beam-modem', method: 'enable', params: [ 'on' ] });

var CSS = `
.bm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin:12px 0}
.bm-card{padding:14px 16px;border-radius:12px;border:1px solid var(--nb-border,rgba(128,128,128,.3));background:var(--nb-surface-2,rgba(128,128,128,.05));min-width:0}
.bm-card h4{margin:0 0 10px;font-size:15px}
.bm-kv{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:4px 12px;font-size:13px}
.bm-kv>div:nth-child(odd){color:var(--nb-muted,#888)}
.bm-kv>div{overflow-wrap:anywhere}
.bm-big{font-size:22px;font-weight:600;margin:0 0 6px}
.bm-sig{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:10px}
.bm-m{padding:8px 10px;border-radius:10px;background:var(--nb-surface-3,rgba(128,128,128,.1))}
.bm-m .l{font-size:12px;color:var(--nb-muted,#888)}
.bm-m .v{font-size:18px;font-weight:600}
.bm-m .q{font-size:12px}
.bm-q4{color:#16a34a}.bm-q3{color:#65a30d}.bm-q2{color:#d97706}.bm-q1{color:#dc2626}
.bm-spark{width:100%;height:60px;display:block}
.bm-legend{font-size:12px;color:var(--nb-muted,#888);display:flex;gap:14px;margin-top:4px}
.bm-table{width:100%;font-size:13px;border-collapse:collapse}
.bm-table th,.bm-table td{text-align:left;padding:4px 8px;border-bottom:1px solid var(--nb-border,rgba(128,128,128,.2))}
.bm-table tr.serving td{font-weight:600}
.bm-bands{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px 12px;margin:8px 0;font-size:13px}
.bm-bands label{display:flex;gap:6px;align-items:center;cursor:pointer}
.bm-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.bm-note{font-size:12px;color:var(--nb-muted,#888);margin:6px 0}
.bm-warn{padding:10px 14px;border-radius:10px;background:rgba(217,119,6,.12);font-size:13px;margin:12px 0}
`;

// LTE bands: downlink low edge in MHz, first and last downlink EARFCN
var LTE = [
	[1, 2110, 0, 599], [2, 1930, 600, 1199], [3, 1805, 1200, 1949], [4, 2110, 1950, 2399],
	[5, 869, 2400, 2649], [7, 2620, 2750, 3449], [8, 925, 3450, 3799], [11, 1475.9, 4750, 4949],
	[12, 729, 5010, 5179], [13, 746, 5180, 5279], [14, 758, 5280, 5379], [17, 734, 5730, 5849],
	[18, 860, 5850, 5999], [19, 875, 6000, 6149], [20, 791, 6150, 6449], [21, 1495.9, 6450, 6599],
	[25, 1930, 8040, 8689], [26, 859, 8690, 9039], [28, 758, 9210, 9659], [29, 717, 9660, 9769],
	[30, 2350, 9770, 9869], [31, 462.5, 9870, 9919], [32, 1452, 9920, 10359], [33, 1900, 36000, 36199],
	[34, 2010, 36200, 36349], [38, 2570, 37750, 38249], [39, 1880, 38250, 38649], [40, 2300, 38650, 39649],
	[41, 2496, 39650, 41589], [42, 3400, 41590, 43589], [43, 3600, 43590, 45589], [46, 5150, 46790, 54539],
	[48, 3550, 55240, 56739], [66, 2110, 66436, 67335], [71, 617, 68586, 68935], [72, 461, 68936, 68985]
];

// common name of an LTE band by its frequency range
var LTE_NAME = { 1: '2100', 3: '1800', 7: '2600', 8: '900', 20: '800', 28: '700', 31: '450', 32: '1500', 38: '2600 TDD', 40: '2300 TDD', 41: '2500 TDD', 42: '3500 TDD' };

function earfcn(n) {
	n = +n;
	for (var i = 0; i < LTE.length; i++)
		if (n >= LTE[i][2] && n <= LTE[i][3])
			return { band: LTE[i][0], mhz: LTE[i][1] + 0.1 * (n - LTE[i][2]) };
	return null;
}

function num(v) {
	if (v == null || v === '' || v === '--')
		return null;
	var n = parseFloat(v);
	return isNaN(n) ? null : n;
}

function val(v) {
	if (v == null || v === '' || v === '--')
		return '—';
	if (Array.isArray(v))
		return v.length ? v.join(', ') : '—';
	return String(v);
}

function bytes(v) {
	var n = num(v);
	if (n == null)
		return '—';
	var u = [ _('Б'), _('КБ'), _('МБ'), _('ГБ'), _('ТБ') ], i = 0;
	while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
	return (i ? n.toFixed(1) : n) + ' ' + u[i];
}

function duration(v) {
	var s = num(v);
	if (s == null)
		return '—';
	var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
	return (d ? d + _(' д ') : '') + (d || h ? h + _(' ч ') : '') + m + _(' мин');
}

// quality grade 1..4 by thresholds (best first)
function grade(v, t) {
	if (v == null)
		return 0;
	for (var i = 0; i < 3; i++)
		if (v >= t[i])
			return 4 - i;
	return 1;
}

var GRADE = [ '', _('плохо'), _('средне'), _('хорошо'), _('отлично') ];

var STATE = {
	failed: _('ошибка'), unknown: _('неизвестно'), initializing: _('запускается'),
	locked: _('заблокирован, нужен PIN'), disabled: _('выключен'), disabling: _('выключается'),
	enabling: _('включается'), enabled: _('включён, сети нет'), searching: _('ищет сеть'),
	registered: _('в сети, не подключён'), disconnecting: _('отключается'),
	connecting: _('подключается'), connected: _('подключён')
};

var POWER = { on: _('включено'), low: _('выключено (режим низкого потребления)'), off: _('выключено') };

var REG = {
	idle: _('не зарегистрирован'), home: _('домашняя сеть'), searching: _('поиск сети'),
	denied: _('в регистрации отказано'), unknown: _('неизвестно'), roaming: _('роуминг'),
	'home-sms-only': _('домашняя сеть, только SMS'), 'roaming-sms-only': _('роуминг, только SMS'),
	'emergency-only': _('только экстренные вызовы')
};

var LOCK = { 'sim-pin': _('нужен PIN'), 'sim-puk': _('нужен PUK'), 'sim-pin2': _('нужен PIN2'), 'sim-puk2': _('нужен PUK2') };

var CA_STATE = { activated: _('активна'), deactivated: _('не активна'), deconfigured: _('не настроена') };

var TECH = {
	gsm: 'GSM (2G)', 'gsm-compact': 'GSM', gprs: 'GPRS (2G)', edge: 'EDGE (2G)',
	umts: 'UMTS (3G)', hsdpa: 'HSDPA (3G)', hsupa: 'HSUPA (3G)', hspa: 'HSPA (3G)', 'hspa-plus': 'HSPA+ (3G)',
	lte: 'LTE (4G)', 'lte-cat-m': 'LTE Cat-M', 'lte-nb-iot': 'NB-IoT', '5gnr': '5G NR'
};

var MODE = { '2g': '2G', '3g': '3G', '4g': '4G', '5g': '5G', any: _('любой'), none: _('нет') };

function bandName(b) {
	var m = /^eutran-(\d+)$/.exec(b);
	if (m)
		return 'B' + m[1] + (LTE_NAME[m[1]] ? ' (' + LTE_NAME[m[1]] + ')' : '');
	if ((m = /^utran-(\d+)$/.exec(b)))
		return 'UMTS B' + m[1];
	if ((m = /^ngran-(\d+)$/.exec(b)))
		return 'n' + m[1];
	return b.toUpperCase();
}

// "allowed: 3g, 4g; preferred: 4g" -> { allowed: '3g|4g', preferred: '4g' }
function parseMode(s) {
	var a = /allowed: ([^;]+)/.exec(s || ''), p = /preferred: (\S+)/.exec(s || '');
	return {
		allowed: a ? a[1].split(/,\s*/).join('|') : '',
		preferred: p ? p[1] : 'none'
	};
}

function modeLabel(m) {
	var a = m.allowed.split('|').map(function(x) { return MODE[x] || x; }).join(' + ');
	return m.preferred && m.preferred != 'none'
		? _('%s, предпочтительно %s').format(a, MODE[m.preferred] || m.preferred) : a;
}

function kv(rows) {
	var out = [];
	rows.forEach(function(r) {
		if (r && r[1] != null && r[1] !== '—' && r[1] !== '') {
			out.push(E('div', {}, r[0]));
			out.push(E('div', {}, r[1]));
		}
	});
	return E('div', { 'class': 'bm-kv' }, out);
}

function card(title, body) {
	return E('div', { 'class': 'bm-card' }, [ E('h4', {}, title) ].concat(body));
}

function metric(label, v, unit, t) {
	var g = grade(v, t);
	return E('div', { 'class': 'bm-m' }, [
		E('div', { 'class': 'l' }, label),
		E('div', { 'class': 'v' + (g ? ' bm-q' + g : '') }, v == null ? '—' : v + ' ' + unit),
		E('div', { 'class': 'q' + (g ? ' bm-q' + g : '') }, GRADE[g] || '')
	]);
}

function spark(series) {
	var NS = 'http://www.w3.org/2000/svg', w = 300, h = 60;
	var svg = document.createElementNS(NS, 'svg');
	svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
	svg.setAttribute('preserveAspectRatio', 'none');
	svg.setAttribute('class', 'bm-spark');
	series.forEach(function(s) {
		if (s.data.length < 2)
			return;
		var step = w / (s.data.length - 1), pts = [];
		s.data.forEach(function(v, i) {
			if (v == null)
				return;
			var y = h - (Math.min(Math.max(v, s.min), s.max) - s.min) / (s.max - s.min) * h;
			pts.push((i * step).toFixed(1) + ',' + y.toFixed(1));
		});
		var pl = document.createElementNS(NS, 'polyline');
		pl.setAttribute('points', pts.join(' '));
		pl.setAttribute('fill', 'none');
		pl.setAttribute('stroke', s.color);
		pl.setAttribute('stroke-width', '2');
		pl.setAttribute('vector-effect', 'non-scaling-stroke');
		svg.appendChild(pl);
	});
	return svg;
}

return view.extend({
	hist: { rsrp: [], sinr: [] },

	load: function() {
		return L.resolveDefault(callStatus(), { error: 'rpc' });
	},

	act: function(p) {
		return p.then(function(r) {
			if (!r || !r.ok) {
				ui.addNotification(null, E('p', (r && r.output) || _('Не удалось применить')), 'danger');
				return;
			}
			ui.addNotification(null, E('p', _('Применено. Модему может понадобиться до минуты, чтобы снова найти сеть.')), 'info');
			window.setTimeout(function() { window.location.reload(); }, 3000);
		});
	},

	problem: function(st) {
		if (st.error == 'no-mmcli')
			return E('div', { 'class': 'bm-warn' }, _('ModemManager не установлен. Поставьте пакет modemmanager.'));
		if (st.error == 'no-modem')
			return E('div', { 'class': 'bm-warn' }, [
				E('p', {}, _('ModemManager не видит модем.')),
				E('p', {}, _('Проверьте, что модем определился (dmesg, ls /dev/cdc-wdm* /dev/ttyUSB*). Если драйверы загрузились, а модема нет, перезапустите ModemManager командой /etc/init.d/modemmanager restart или перезагрузите роутер.'))
			]);
		return E('div', { 'class': 'bm-warn' }, _('Нет ответа от службы beam-modem. Перезапустите rpcd: /etc/init.d/rpcd restart.'));
	},

	body: function(st) {
		if (st.error)
			return [ this.problem(st) ];

		var m = st.modem || {}, g = m.generic || {}, g3 = m['3gpp'] || {};
		var sig = st.signal || {}, lte = sig.lte || {}, nr = sig['5g'] || {};
		var cells = st.cells || [], serving = cells.filter(function(c) { return c.serving == 'yes'; })[0];
		var b = st.bearer || {}, bs = b.status || {}, b4 = b['ipv4-config'] || {}, bst = b.stats || {}, bp = b.properties || {};
		var sim = (st.sim || {}).properties || {};
		var tech = (g['access-technologies'] || []).map(function(t) { return TECH[t] || t; }).join(', ');
		var q = num((g['signal-quality'] || {}).value);
		var out = [];

		if (g['power-state'] == 'low')
			out.push(E('div', { 'class': 'bm-warn' }, _('Радио модема выключено (режим низкого потребления). Так бывает, если модем выключен в ModemManager или ему нужна разблокировка FCC.')));
		if (g.state == 'disabled')
			out.push(E('div', { 'class': 'bm-row' }, [
				E('button', { 'class': 'cbi-button cbi-button-action important', 'click': ui.createHandlerFn(this, function() { return this.act(callEnable(true)); }) }, _('Включить модем'))
			]));

		// history for the graph, 120 points = 10 minutes
		var rsrp = num(lte.rsrp), sinr = num(lte.snr);
		this.hist.rsrp.push(rsrp); this.hist.sinr.push(sinr);
		if (this.hist.rsrp.length > 120) { this.hist.rsrp.shift(); this.hist.sinr.shift(); }

		var cellInfo = [];
		if (serving) {
			var f = serving.earfcn != null ? earfcn(serving.earfcn) : null;
			var ci = serving.ci ? parseInt(serving.ci, 16) : NaN;
			cellInfo = [
				[ _('Диапазон'), f ? 'B' + f.band + (LTE_NAME[f.band] ? ' (' + LTE_NAME[f.band] + _(' МГц') + ')' : '') : null ],
				[ _('Частота приёма'), f ? f.mhz.toFixed(1) + _(' МГц') : null ],
				[ 'EARFCN', serving.earfcn ],
				[ _('Ширина канала'), st.bandwidth ? st.bandwidth + _(' МГц') : null ],
				[ 'PCI', serving.physical_ci ],
				[ 'TAC', serving.tac ],
				[ _('ID соты'), serving.ci ? serving.ci + (isNaN(ci) ? '' : _(' (eNB %d, сектор %d)').format(ci >> 8, ci & 255)) : null ],
				[ _('Оператор соты'), serving.operator_id ],
				[ 'Timing advance', serving.timing_advance ]
			];
		}

		out.push(E('div', { 'class': 'bm-grid' }, [
			card(_('Сеть'), [
				E('div', { 'class': 'bm-big' }, val(g3['operator-name'] || sim['operator-name'])),
				kv([
					[ _('Состояние'), STATE[g.state] || val(g.state) ],
					[ _('Технология'), tech || null ],
					[ _('Регистрация'), REG[g3['registration-state']] || val(g3['registration-state']) ],
					[ _('Код оператора'), val(g3['operator-code']) ],
					[ _('Уровень сигнала'), q == null ? null : q + ' %' ],
					[ _('Радио'), POWER[g['power-state']] || val(g['power-state']) ],
					[ _('Режим'), g['current-modes'] ? modeLabel(parseMode(g['current-modes'])) : null ]
				])
			]),
			card(_('Сигнал'), [
				E('div', { 'class': 'bm-sig' }, [
					metric('RSRP', rsrp, _('дБм'), [ -80, -90, -100 ]),
					metric('RSRQ', num(lte.rsrq), _('дБ'), [ -10, -15, -20 ]),
					metric('SINR', sinr, _('дБ'), [ 20, 13, 0 ]),
					metric('RSSI', num(lte.rssi), _('дБм'), [ -65, -75, -85 ])
				].concat(num(nr.rsrp) != null ? [
					metric('5G RSRP', num(nr.rsrp), _('дБм'), [ -80, -90, -100 ]),
					metric('5G SINR', num(nr.snr), _('дБ'), [ 20, 13, 0 ])
				] : [])),
				spark([
					{ data: this.hist.rsrp, min: -120, max: -60, color: '#4f46e5' },
					{ data: this.hist.sinr, min: -10, max: 30, color: '#16a34a' }
				]),
				E('div', { 'class': 'bm-legend' }, [
					E('span', { 'style': 'color:#4f46e5' }, _('RSRP, от −120 до −60')),
					E('span', { 'style': 'color:#16a34a' }, _('SINR, от −10 до 30')),
					E('span', {}, _('за 10 минут'))
				])
			]),
			card(_('Сота'), serving ? [ kv(cellInfo) ] : [ E('div', { 'class': 'bm-note' }, st.qmicli
				? _('Модем не сообщает данные о соте ни через ModemManager, ни напрямую.')
				: _('Через ModemManager модем данные о соте не сообщает. Поставьте пакет qmi-utils, тогда страница спросит модем напрямую: apk add qmi-utils')) ]),
			card(_('Подключение'), [ kv([
				[ _('Подключено'), bs.connected == 'yes' ? _('да') : (bs.connected ? _('нет') : null) ],
				[ 'APN', val(bp.apn) ],
				[ _('Интерфейс'), val(bs.interface) ],
				[ _('Адрес'), b4.address ? b4.address + (b4.prefix ? '/' + b4.prefix : '') : null ],
				[ _('Шлюз'), val(b4.gateway) ],
				[ 'DNS', val(b4.dns) ],
				[ _('Время подключения'), duration(bst.duration) ],
				[ _('Принято'), bytes(bst['bytes-rx']) ],
				[ _('Отправлено'), bytes(bst['bytes-tx']) ]
			]) ].concat(st.bearer ? [] : [ E('div', { 'class': 'bm-note' }, _('Подключения нет. Его создаёт интерфейс с протоколом ModemManager на странице Сеть, Интерфейсы.')) ])),
			card(_('Модем и SIM'), [ kv([
				[ _('Модель'), [ g.manufacturer, g.model ].filter(function(x) { return x; }).join(' ') || null ],
				[ _('Прошивка'), val(g.revision) ],
				[ 'IMEI', val(g3.imei || g['equipment-identifier']) ],
				[ _('Драйверы'), val(g.drivers) ],
				[ _('Порт'), val(g['primary-port']) ],
				[ _('Оператор SIM'), val(sim['operator-name']) ],
				[ 'ICCID', val(sim.iccid) ],
				[ 'IMSI', val(sim.imsi) ],
				[ _('Номер'), val(g['own-numbers']) ],
				[ _('Блокировка'), g.state == 'locked' ? (LOCK[g['unlock-required']] || val(g['unlock-required'])) + (g['unlock-retries'] ? ', ' + _('попыток: %s').format(val(g['unlock-retries'])) : '') : null ]
			]) ])
		]));

		var ca = st.ca || [];
		if (ca.length > 1 || (ca.length == 1 && !serving))
			out.push(card(_('Агрегация несущих') + (ca.length > 1 ? ' ' + _('(%d несущих)').format(ca.length) : ''), [ E('table', { 'class': 'bm-table' }, [
				E('tr', {}, [ E('th', {}, _('Несущая')), E('th', {}, _('Диапазон')), E('th', {}, 'EARFCN'), E('th', {}, _('Частота')), E('th', {}, _('Ширина')), E('th', {}, 'PCI'), E('th', {}, _('Состояние')) ])
			].concat(ca.map(function(c) {
				var f = earfcn(c.earfcn), m = /^eutran-(\d+)$/.exec(c.band || '');
				return E('tr', { 'class': c.primary ? 'serving' : '' }, [
					E('td', {}, c.primary ? 'PCell' : 'SCell'),
					E('td', {}, m ? 'B' + m[1] : (f ? 'B' + f.band : val(c.band))),
					E('td', {}, val(c.earfcn)),
					E('td', {}, f ? f.mhz.toFixed(1) + _(' МГц') : '—'),
					E('td', {}, c.bandwidth ? c.bandwidth + _(' МГц') : '—'),
					E('td', {}, val(c.pci)),
					E('td', {}, c.primary ? _('основная') : (CA_STATE[c.state] || val(c.state)))
				]);
			})))]));

		if (cells.length > 1)
			out.push(card(_('Соты рядом'), [ E('table', { 'class': 'bm-table' }, [
				E('tr', {}, [ E('th', {}, _('Тип')), E('th', {}, _('Диапазон')), E('th', {}, 'EARFCN'), E('th', {}, 'PCI'), E('th', {}, 'RSRP'), E('th', {}, 'RSRQ') ])
			].concat(cells.map(function(c) {
				var f = c.earfcn != null ? earfcn(c.earfcn) : null;
				return E('tr', { 'class': c.serving == 'yes' ? 'serving' : '' }, [
					E('td', {}, (c.cell_type || '').toUpperCase() + (c.serving == 'yes' ? _(', текущая') : '')),
					E('td', {}, f ? 'B' + f.band : '—'),
					E('td', {}, val(c.earfcn)),
					E('td', {}, val(c.physical_ci)),
					E('td', {}, num(c.rsrp) != null ? num(c.rsrp).toFixed(0) : '—'),
					E('td', {}, num(c.rsrq) != null ? num(c.rsrq).toFixed(0) : '—')
				]);
			}))), E('div', { 'class': 'bm-note' }, st.cells_from == 'qmi' ? _('Данные о сотах получены напрямую от модема (QMI).') : _('Данные о сотах получены от ModemManager.'))]));

		return out;
	},

	settings: function(st) {
		var g = ((st.modem || {}).generic) || {};
		var modes = (g['supported-modes'] || []).map(parseMode).filter(function(m) { return m.allowed; });
		var cur = parseMode(g['current-modes']);
		var sup = (g['supported-bands'] || []).filter(function(b) { return b != 'unknown' && b != 'any'; });
		var curb = g['current-bands'] || [];
		var self = this;

		if (st.error || (!modes.length && !sup.length))
			return E([]);

		var sel = E('select', { 'class': 'cbi-input-select' }, modes.map(function(m, i) {
			var on = m.allowed == cur.allowed && m.preferred == cur.preferred;
			return E('option', { value: i, selected: on ? '' : null }, modeLabel(m));
		}));

		var boxes = sup.map(function(b) {
			return E('label', {}, [
				E('input', { type: 'checkbox', value: b, checked: (curb.indexOf(b) >= 0 || curb.indexOf('any') >= 0) ? '' : null }),
				bandName(b)
			]);
		});
		var list = E('div', { 'class': 'bm-bands' }, boxes);

		function all(on) {
			list.querySelectorAll('input').forEach(function(i) { i.checked = on; });
		}

		return E('div', { 'class': 'bm-card', 'style': 'margin-top:12px' }, [
			E('h4', {}, _('Настройки модема')),
			E('div', { 'class': 'bm-note' }, _('Изменения применяются сразу и сохраняются в модеме. На время переключения связь пропадает.')),
			modes.length ? E('div', { 'class': 'bm-row' }, [
				E('span', {}, _('Режим сети')), sel,
				E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, function() {
					var m = modes[+sel.value];
					return self.act(callModes(m.allowed, m.preferred));
				}) }, _('Применить режим'))
			]) : '',
			sup.length ? E('div', {}, [
				E('div', { 'class': 'bm-row' }, [
					E('span', {}, _('Диапазоны')),
					E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': function() { all(true); } }, _('Все')),
					E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': function() {
						all(false);
						list.querySelectorAll('input').forEach(function(i) { if (/^eutran-/.test(i.value)) i.checked = true; });
					} }, _('Только LTE')),
					E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': function() { all(false); } }, _('Снять все'))
				]),
				list,
				E('div', { 'class': 'bm-row' }, [
					E('button', { 'class': 'cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, function() {
						var on = [];
						list.querySelectorAll('input').forEach(function(i) { if (i.checked) on.push(i.value); });
						if (!on.length) {
							ui.addNotification(null, E('p', _('Выберите хотя бы один диапазон.')), 'warning');
							return;
						}
						return self.act(callBands(on.length == sup.length ? 'any' : on.join('|')));
					}) }, _('Применить диапазоны'))
				])
			]) : ''
		]);
	},

	render: function(st) {
		var self = this;
		var box = E('div', {}, this.body(st));

		poll.add(function() {
			return L.resolveDefault(callStatus(), { error: 'rpc' }).then(function(s) {
				dom.content(box, self.body(s));
			});
		}, 5);

		return E([], [
			E('style', {}, CSS),
			E('h2', {}, _('Модем')),
			E('div', { 'class': 'cbi-map-descr' }, _('Данные ModemManager о модеме, обновляются каждые 5 секунд.')),
			box,
			this.settings(st)
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
