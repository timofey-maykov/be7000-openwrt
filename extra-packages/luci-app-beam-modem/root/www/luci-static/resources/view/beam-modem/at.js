'use strict';
'require view';
'require rpc';
'require poll';
'require dom';
'require ui';

// Status, Modem, AT commands. A session stops ModemManager so the AT ports
// are free, commands go to the chosen port through socat, the end of the
// session (or 10 minutes without commands) starts ModemManager again and
// brings the modem interfaces back up. The work is beam-modem-console.

var callStatus = rpc.declare({ object: 'beam-modem', method: 'console_status' });
var callStart = rpc.declare({ object: 'beam-modem', method: 'console_start' });
var callStop = rpc.declare({ object: 'beam-modem', method: 'console_stop' });
var callSend = rpc.declare({ object: 'beam-modem', method: 'console_send', params: [ 'port', 'cmd', 'wait' ] });

var CSS = `
.ba-bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid var(--nb-border,rgba(128,128,128,.3));background:var(--nb-surface-2,rgba(128,128,128,.05));margin:12px 0}
.ba-dot{width:10px;height:10px;border-radius:50%;flex:none;background:#9ca3af}
.ba-dot.on{background:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.18)}
.ba-dot.wait{background:#d97706;animation:ba-pulse 1s infinite}
@keyframes ba-pulse{50%{opacity:.35}}
.ba-state{flex:1;min-width:220px}
.ba-state b{display:block;font-size:14px}
.ba-state span{font-size:12px;color:var(--nb-muted,#888)}
.ba-term{border-radius:12px;overflow:hidden;border:1px solid var(--nb-border,rgba(128,128,128,.3))}
.ba-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;background:var(--nb-surface-2,rgba(128,128,128,.06));border-bottom:1px solid var(--nb-border,rgba(128,128,128,.2));font-size:13px}
.ba-tools .sp{flex:1}
.ba-tools select{width:auto;min-width:0}
.ba-screen{background:#0f172a;color:#e2e8f0;font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:12px 14px;min-height:300px;max-height:55vh;overflow:auto;white-space:pre-wrap;word-break:break-word}
.ba-screen .p{color:#a5b4fc}
.ba-screen .t{color:#64748b;font-size:11px;margin-right:8px}
.ba-screen .ok{color:#4ade80;font-weight:600}
.ba-screen .err{color:#f87171;font-weight:600}
.ba-screen .muted{color:#64748b}
.ba-screen .hint{color:#94a3b8}
.ba-in{display:flex;gap:8px;padding:10px 12px;background:#0b1222;align-items:center}
.ba-in .ch{color:#a5b4fc;font:600 14px ui-monospace,Menlo,monospace}
.ba-in input{flex:1;min-width:0;background:transparent!important;border:0!important;box-shadow:none!important;color:#e2e8f0!important;font:14px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:6px 0;outline:none}
.ba-in input:disabled{opacity:.5}
.ba-chips{margin:14px 0 4px}
.ba-chips h5{margin:10px 0 6px;font-size:12px;font-weight:600;color:var(--nb-muted,#888);text-transform:uppercase;letter-spacing:.04em}
.ba-chip{display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:999px;border:1px solid var(--nb-border,rgba(128,128,128,.35));background:var(--nb-surface-2,rgba(128,128,128,.06));font:12.5px ui-monospace,Menlo,monospace;cursor:pointer}
.ba-chip:hover{border-color:var(--nb-accent,#4f46e5)}
.ba-chip small{font-family:inherit;color:var(--nb-muted,#888);margin-left:6px;font-family:system-ui,sans-serif}
.ba-warn{padding:10px 14px;border-radius:10px;background:rgba(217,119,6,.12);font-size:13px;margin:12px 0}
.ba-note{font-size:12px;color:var(--nb-muted,#888);margin:8px 0}
`;

var CHIPS = [
	[ _('Модем'), [
		[ 'ATI', _('модель и прошивка') ], [ 'AT+CGMR', _('версия прошивки') ], [ 'AT+CGSN', 'IMEI' ],
		[ 'AT+CIMI', 'IMSI' ], [ 'AT+CCID', 'ICCID' ], [ 'AT+CPIN?', _('состояние SIM') ], [ 'AT+CFUN?', _('режим радио') ]
	] ],
	[ _('Сеть'), [
		[ 'AT+CSQ', _('уровень сигнала') ], [ 'AT+COPS?', _('оператор') ], [ 'AT+CEREG?', _('регистрация LTE') ],
		[ 'AT+CGDCONT?', _('профили APN') ], [ 'AT+COPS=?', _('поиск сетей, до 3 минут'), 'long' ]
	] ],
	[ _('Поддерживает ли модем привязку к соте'), [
		[ 'AT+GTCELLLOCK=?', 'Fibocom' ], [ 'AT+QNWLOCK=?', 'Quectel' ], [ 'AT^CELLLOCK=?', 'Huawei' ],
		[ 'AT!LTEPCI?', 'Sierra' ], [ 'AT$QCSYSMODE?', 'Qualcomm' ], [ 'AT+FTM?', _('заводской режим') ]
	] ]
];

var HKEY = 'beam-modem-at-history', PKEY = 'beam-modem-at-port';

function store(k, v) {
	try {
		if (v === undefined)
			return JSON.parse(window.localStorage.getItem(k));
		window.localStorage.setItem(k, JSON.stringify(v));
	} catch (e) {}
	return null;
}

function clock() {
	var d = new Date();
	return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
}

// the answer with OK and errors coloured
function answer(text) {
	var out = [];
	text.replace(/\r/g, '').split('\n').forEach(function(l, i, a) {
		if (l === '' && (i == 0 || i == a.length - 1))
			return;
		var cls = /^(OK|CONNECT)\b/.test(l) ? 'ok' : (/^(ERROR|\+CM[ES] ERROR|NO CARRIER|COMMAND NOT SUPPORT)/.test(l) ? 'err' : null);
		out.push(cls ? E('span', { 'class': cls }, l) : l);
		out.push('\n');
	});
	return out;
}

return view.extend({
	st: {},
	busy: false,
	pending: null,
	hist: [],
	hpos: -1,

	load: function() {
		return L.resolveDefault(callStatus(), { error: 'rpc' });
	},

	screenAdd: function(nodes) {
		var s = this.screen, stick = s.scrollTop + s.clientHeight >= s.scrollHeight - 30;
		var div = E('div', {}, nodes);
		s.appendChild(div);
		if (stick)
			s.scrollTop = s.scrollHeight;
		return div;
	},

	refresh: function(st) {
		var self = this;
		this.st = st;
		var dot = 'ba-dot', title, sub, btn;

		if (st.error) {
			title = _('Нет ответа от службы beam-modem');
			sub = _('Перезапустите rpcd: /etc/init.d/rpcd restart');
		} else if (st.restoring) {
			dot += ' wait';
			title = _('Возвращаю ModemManager и подключение…');
			sub = _('Это занимает до минуты.');
		} else if (st.active) {
			dot += ' on';
			title = _('Сеанс открыт, ModemManager остановлен');
			sub = _('Связь через модем отключена. Сеанс закончится сам через %s без команд.').format('%d:%02d'.format(Math.floor(Math.max(st.left, 0) / 60), Math.max(st.left, 0) % 60));
			btn = E('button', { 'class': 'cbi-button cbi-button-reset', 'click': ui.createHandlerFn(this, 'stop') }, _('Завершить сеанс'));
		} else {
			title = st.mm ? _('ModemManager работает, AT-порты заняты им') : _('ModemManager не запущен');
			sub = _('Сеанс остановит ModemManager. На время сеанса связь через модем пропадёт, потом подключение восстановится само.');
			btn = E('button', { 'class': 'cbi-button cbi-button-action important', 'click': ui.createHandlerFn(this, 'start') }, _('Начать сеанс'));
		}

		dom.content(this.bar, [
			E('span', { 'class': dot }),
			E('div', { 'class': 'ba-state' }, [ E('b', {}, title), E('span', {}, sub) ]),
			btn || ''
		]);

		// ports: keep the choice, prefer the one ModemManager used for AT
		var ports = st.ports || [], cur = this.port.value || store(PKEY) || st.at;
		if (ports.indexOf(cur) < 0)
			cur = ports.indexOf(st.at) >= 0 ? st.at : ports[0];
		if (this.port.dataset.list != ports.join(',')) {
			this.port.dataset.list = ports.join(',');
			dom.content(this.port, ports.length ? ports.map(function(p) {
				return E('option', { value: p, selected: p == cur ? '' : null }, p + (p == st.at ? _(' (AT)') : ''));
			}) : [ E('option', { value: '' }, _('нет портов')) ]);
		}

		var can = !!st.active && !st.restoring && ports.length > 0 && st.socat;
		this.input.disabled = !can;
		this.sendBtn.disabled = !can || this.busy;
		this.input.placeholder = can ? _('AT-команда. Enter отправляет, ↑ ↓ листают историю')
			: (st.active ? _('Нет портов модема') : _('Сначала начните сеанс'));

		// the answer of the command in flight
		if (this.pending && st.cmd == this.pending.cmd) {
			dom.content(this.pending.el, st.out ? answer(st.out) : E('span', { 'class': 'muted' }, _('ждём ответ…')));
			if (st.done) {
				if (!st.out.replace(/\s/g, ''))
					dom.content(this.pending.el, E('span', { 'class': 'err' }, _('нет ответа: порт молчит, попробуйте другой порт или режим ожидания подольше')));
				this.pending = null;
				this.busy = false;
				this.sendBtn.disabled = !can;
				this.input.focus();
			}
			this.screen.scrollTop = this.screen.scrollHeight;
		}
	},

	poll: function() {
		var self = this;
		return L.resolveDefault(callStatus(), { error: 'rpc' }).then(function(st) { self.refresh(st); });
	},

	start: function() {
		var self = this;
		this.screenAdd(E('span', { 'class': 'hint' }, _('Останавливаю ModemManager…')));
		return callStart().then(function(r) {
			self.screenAdd(E('span', { 'class': r && r.ok ? 'hint' : 'err' }, r && r.ok ? _('Сеанс открыт. Можно вводить команды.') : ((r && r.output) || _('Не удалось начать сеанс'))));
			return self.poll();
		});
	},

	stop: function() {
		var self = this;
		return callStop().then(function() {
			self.screenAdd(E('span', { 'class': 'hint' }, _('Сеанс закрыт. ModemManager запускается, подключение вернётся само.')));
			return self.poll();
		});
	},

	send: function(cmd, wait) {
		var self = this;
		cmd = (cmd || '').trim();
		if (!cmd || this.busy || this.input.disabled)
			return;
		if (/[\x00-\x1f]/.test(cmd) || cmd.length > 512) {
			ui.addNotification(null, E('p', _('Команда слишком длинная или содержит управляющие символы.')), 'warning');
			return;
		}
		if (this.hist[0] != cmd) {
			this.hist.unshift(cmd);
			this.hist = this.hist.slice(0, 50);
			store(HKEY, this.hist);
		}
		this.hpos = -1;
		this.input.value = '';
		this.busy = true;
		this.sendBtn.disabled = true;
		store(PKEY, this.port.value);

		this.screenAdd([ E('span', { 'class': 't' }, clock()), E('span', { 'class': 'p' }, '› ' + cmd) ]);
		var el = this.screenAdd(E('span', { 'class': 'muted' }, _('ждём ответ…')));
		this.screen.scrollTop = this.screen.scrollHeight;

		return callSend(this.port.value, cmd, wait || this.wait.value).then(function(r) {
			if (!r || !r.ok) {
				dom.content(el, E('span', { 'class': 'err' }, (r && r.output) || _('не отправлено')));
				self.busy = false;
				self.sendBtn.disabled = false;
				return;
			}
			self.pending = { cmd: cmd, el: el };
		});
	},

	keys: function(ev) {
		if (ev.key == 'Enter') {
			ev.preventDefault();
			this.send(this.input.value);
		} else if (ev.key == 'ArrowUp' || ev.key == 'ArrowDown') {
			if (!this.hist.length)
				return;
			ev.preventDefault();
			this.hpos = Math.max(-1, Math.min(this.hist.length - 1, this.hpos + (ev.key == 'ArrowUp' ? 1 : -1)));
			this.input.value = this.hpos < 0 ? '' : this.hist[this.hpos];
		}
	},

	render: function(st) {
		var self = this;
		this.hist = store(HKEY) || [];

		this.bar = E('div', { 'class': 'ba-bar' });
		this.screen = E('div', { 'class': 'ba-screen' }, [
			E('div', { 'class': 'hint' }, _('Здесь появятся команды и ответы модема.'))
		]);
		this.port = E('select', { 'class': 'cbi-input-select' });
		this.wait = E('select', { 'class': 'cbi-input-select' }, [
			E('option', { value: 'short' }, _('ответ до 10 с')),
			E('option', { value: 'medium' }, _('до 40 с')),
			E('option', { value: 'long' }, _('до 3 минут, поиск сетей'))
		]);
		this.input = E('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'keydown': this.keys.bind(this) });
		this.sendBtn = E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() { self.send(self.input.value); } }, _('Отправить'));

		var chips = E('div', { 'class': 'ba-chips' }, CHIPS.map(function(g) {
			return E('div', {}, [ E('h5', {}, g[0]) ].concat(g[1].map(function(c) {
				return E('span', { 'class': 'ba-chip', 'title': _('Вставить в строку ввода'), 'click': function() {
					if (c[2])
						self.wait.value = c[2];
					self.input.value = c[0];
					self.input.focus();
				} }, [ c[0], E('small', {}, c[1]) ]);
			})));
		}));

		this.refresh(st);

		poll.add(function() {
			// every second while a command runs, otherwise every 3 seconds
			self.tick = (self.tick || 0) + 1;
			if (self.pending || self.st.restoring || self.tick % 3 == 0)
				return self.poll();
		}, 1);

		return E([], [
			E('style', {}, CSS),
			E('h2', {}, _('AT-команды')),
			E('div', { 'class': 'cbi-map-descr' }, _('Прямой доступ к модему. На время сеанса ModemManager останавливается, чтобы освободить порты, после сеанса запускается снова и сам поднимает подключение.')),
			st.socat === false ? E('div', { 'class': 'ba-warn' }, _('Нужен пакет socat: apk add socat')) : '',
			this.bar,
			E('div', { 'class': 'ba-term' }, [
				E('div', { 'class': 'ba-tools' }, [
					E('span', {}, _('Порт')), this.port,
					E('span', {}, _('Ожидание')), this.wait,
					E('span', { 'class': 'sp' }),
					E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': function() {
						var t = self.screen.innerText;
						if (navigator.clipboard)
							navigator.clipboard.writeText(t).then(function() { ui.addNotification(null, E('p', _('Скопировано')), 'info'); });
					} }, _('Копировать')),
					E('button', { 'class': 'cbi-button cbi-button-neutral', 'click': function() { dom.content(self.screen, []); } }, _('Очистить'))
				]),
				this.screen,
				E('div', { 'class': 'ba-in' }, [ E('span', { 'class': 'ch' }, '›'), this.input, this.sendBtn ])
			]),
			chips,
			E('div', { 'class': 'ba-note' }, _('Команды уходят в модем как есть. Команды, которые меняют настройки модема (AT+QCFG, AT!, AT$NV и подобные), могут сделать модем неработоспособным, отправляйте их, только если точно знаете, что они делают.'))
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
