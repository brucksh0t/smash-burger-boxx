/* The Smashburger Boxx: ordering (concept demo).
 * Everything here runs in the browser: menu, modifiers, cart (localStorage), pickup slots from real
 * hours, tip, NY/Columbia County tax, validation, confirmation. The only thing a real launch changes
 * is submitOrder() below: swap the demo adapter for a server call. No payment keys live here. */
(function () {
  'use strict';
  const D = window.SBB;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = c => '$' + (c / 100).toFixed(2);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const LS = { cart: 'sbb.cart.v1', prefs: 'sbb.prefs.v1', last: 'sbb.last.v1' };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const itemById = id => D.items.find(i => i.id === id);
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ---------- Clock (America/New_York). ?now=2026-09-26T17:05 overrides for demos/tests. ---------- */
  const qsNow = new URLSearchParams(location.search).get('now');
  const skew = qsNow ? (Date.parse(qsNow + ':00-04:00') - Date.now()) : 0;
  const nowMs = () => Date.now() + (isNaN(skew) ? 0 : skew);
  const fmtParts = new Intl.DateTimeFormat('en-US', { timeZone: D.business.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  function ny(ms) {
    const p = Object.fromEntries(fmtParts.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { key: `${p.year}-${p.month}-${p.day}`, dow, min: (+p.hour % 24) * 60 + (+p.minute), month: +p.month, day: +p.day };
  }
  const hm = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };
  const hmFull = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

  function burgerCount(lines) { return lines.reduce((n, l) => n + (itemById(l.itemId)?.burger ? l.qty : 0), 0); }
  function prepMinutes(lines) {
    const b = burgerCount(lines);
    return Math.min(D.prep.max, Math.round(D.prep.baseMin + Math.max(0, b - 2) * D.prep.perBurgerMin));
  }
  function status() {
    const n = ny(nowMs()); const h = D.hours[n.dow];
    const lastOrder = h ? h[1] - D.prep.lastOrderBeforeCloseMin : 0;
    if (h && n.min >= h[0] && n.min < lastOrder) return { open: true, closesAt: h[1], soon: h[1] - n.min <= 45, n };
    // next opening
    for (let k = 0; k < 8; k++) {
      const d = ny(nowMs() + k * 864e5); const hh = D.hours[d.dow];
      if (!hh) continue;
      if (k === 0 && n.min >= hh[0]) continue;
      return { open: false, next: { k, dow: d.dow, at: hh[0] }, n };
    }
    return { open: false, n };
  }
  function nextOpenLabel(s) {
    if (!s.next) return 'Check Instagram for hours';
    const day = s.next.k === 0 ? 'today' : s.next.k === 1 ? 'tomorrow' : DAYS[s.next.dow];
    return `Opens ${day} at ${hm(s.next.at)}`;
  }

  /* ---------- Pickup slots from real hours ---------- */
  function buildDays(lines) {
    const out = []; const prep = prepMinutes(lines); const now = ny(nowMs());
    for (let k = 0; k < 7; k++) {
      const d = ny(nowMs() + k * 864e5); const h = D.hours[d.dow];
      const label = k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : DAYS[d.dow].slice(0, 3);
      const sub = `${d.month}/${d.day}`;
      if (!h) { out.push({ key: d.key, label, sub, closed: true, slots: [] }); continue; }
      const slots = [];
      const last = h[1] - D.prep.lastOrderBeforeCloseMin; const step = D.prep.slotStep;
      for (let m = h[0] + step; m <= last; m += step) {
        const past = k === 0 && m < now.min + prep;
        slots.push({ min: m, disabled: past });
      }
      const any = slots.some(s => !s.disabled);
      out.push({ key: d.key, label, sub, closed: false, done: !any, slots, dow: d.dow });
    }
    return out;
  }

  /* ---------- State ---------- */
  let cart = load(LS.cart, []);
  let prefs = Object.assign({ mode: 'pickup', when: 'asap', day: null, slot: null, tip: 15, tipCustom: '', notes: '', name: '', phone: '', email: '', addr: '', sms: true }, load(LS.prefs, {}));
  let view = 'bag';
  const persist = () => { save(LS.cart, cart); save(LS.prefs, prefs); renderBadges(); };

  function lineUnit(l) {
    const it = itemById(l.itemId); if (!it) return 0;
    let c = it.price;
    if (it.burger) {
      D.addons.forEach(a => { c += (l.addons?.[a.id] || 0) * a.price; });
      if (l.meal) c += D.meal.price;
    }
    return c;
  }
  const sig = l => JSON.stringify([l.itemId, l.tops, l.addons, l.meal, l.note || '']);
  function describe(l) {
    const it = itemById(l.itemId); const bits = [];
    if (it?.burger) {
      const std = D.toppings.filter(t => t.std).map(t => t.id);
      std.forEach(id => { if (!l.tops.includes(id)) bits.push('No ' + D.toppings.find(t => t.id === id).name.toLowerCase()); });
      l.tops.filter(id => !std.includes(id)).forEach(id => bits.push(D.toppings.find(t => t.id === id).name));
      D.addons.forEach(a => { const q = l.addons?.[a.id] || 0; if (q) bits.push((q > 1 ? q + '× ' : '') + a.name); });
      if (l.meal) bits.push('Meal: fries + drink');
    }
    if (l.note) bits.push('“' + l.note + '”');
    return bits.join(' · ');
  }
  const totals = () => {
    const sub = cart.reduce((s, l) => s + lineUnit(l) * l.qty, 0);
    const tax = Math.round(sub * D.taxRate);
    let tip = 0;
    if (prefs.tip === 'custom') tip = Math.max(0, Math.round(parseFloat(prefs.tipCustom || '0') * 100) || 0);
    else tip = Math.round(sub * (prefs.tip || 0) / 100);
    return { sub, tax, tip, total: sub + tax + tip, count: cart.reduce((n, l) => n + l.qty, 0) };
  };
  function addLine(l, silent) {
    const s = sig(l); const ex = cart.find(x => sig(x) === s);
    if (ex) ex.qty = Math.min(20, ex.qty + l.qty); else cart.push(Object.assign({ uid: Math.random().toString(36).slice(2, 9) }, l));
    persist(); if (view !== 'done') renderDrawer();
    if (!silent) toast(`Added ${l.qty > 1 ? l.qty + '× ' : ''}${itemById(l.itemId).name}`);
  }

  /* ---------- Menu render ---------- */
  function itemThumb(it) {
    if (it.img) return it.img;
    if (it.burger) return 'img/ig-burger-stacked.jpg';
    if (it.id === 'fries') return 'img/gm-box-fries-drink.jpg';
    return '';
  }
  function renderMenu() {
    $('[data-cats]').innerHTML = D.categories.map((c, i) => `<a href="#cat-${c.id}" class="cat${i ? '' : ' is-on'}">${esc(c.name)}</a>`).join('') + '<a href="#build" class="cat">Build your own</a>';
    $('[data-menu]').innerHTML = D.categories.map(c => `
      <div class="menu__cat" id="cat-${c.id}">
        <h3 class="menu__cath">${esc(c.name)}</h3>
        <ul class="items">${D.items.filter(i => i.cat === c.id).map(it => {
          const thumb = itemThumb(it);
          return `
          <li>
            <button class="item${thumb ? ' item--img' : ''}" type="button" data-open-item="${it.id}" aria-label="${esc(it.name)}, ${money(it.price)}. Customize and add">
              ${thumb ? `<span class="item__img"><img src="${thumb}" alt="" loading="lazy"></span>` : ''}
              <span class="item__txt">
                <span class="item__name">${esc(it.name)}${it.popular ? ' <em class="tag">Most loaded</em>' : ''}</span>
                <span class="item__desc">${esc(it.desc)}</span>
              </span>
              <span class="item__price">${money(it.price)}</span>
              <span class="item__add" aria-hidden="true">+</span>
            </button>
          </li>`;
        }).join('')}
        </ul>
      </div>`).join('');
  }
  function renderToday() {
    const s = status(); const el = $('[data-today]'); if (!el) return;
    const prep = prepMinutes(cart.length ? cart : [{ itemId: 'double', qty: 1 }]);
    el.innerHTML = s.open
      ? `<span class="dot dot--open"></span><b>Open now</b> until ${hm(s.closesAt)} · pickup ready in ~${prep} min`
      : `<span class="dot"></span><b>Closed now.</b> ${nextOpenLabel(s)}. Schedule a pickup anytime.`;
  }
  function renderStatus() {
    const s = status(); const el = $('[data-status]'); if (!el) return;
    el.classList.toggle('is-open', s.open); el.classList.toggle('is-soon', !!s.soon);
    $('.status__txt', el).textContent = s.open ? (s.soon ? `Closing soon · ${hm(s.closesAt)}` : `Open now · ready ~${prepMinutes(cart.length ? cart : [{ itemId: 'double', qty: 1 }])} min`) : nextOpenLabel(s).replace('Opens ', 'Opens ');
    renderToday();
  }

  /* ---------- Item modal ---------- */
  let mState = null; let lastFocus = null;
  function openItem(id, preset) {
    const it = itemById(id); if (!it) return;
    lastFocus = document.activeElement;
    mState = preset ? JSON.parse(JSON.stringify(preset)) : { itemId: id, qty: 1, tops: D.toppings.filter(t => t.std).map(t => t.id), addons: {}, meal: false, note: '' };
    mState.editing = preset ? preset.uid : null;
    const body = $('[data-modal-body]');
    const thumb = itemThumb(it);
    body.innerHTML = `
      ${thumb ? `<div class="m-hero m-hero--img"><img src="${thumb}" alt=""></div>` : ''}
      <h3 id="modal-title">${esc(it.name)}</h3>
      <p class="m-desc">${esc(it.desc)} <b>${money(it.price)}</b></p>
      ${it.burger ? `
      <fieldset class="mfs"><legend>Toppings <span>Included · pick any</span></legend>
        ${D.toppings.map(t => `<label class="opt"><input type="checkbox" name="top" value="${t.id}" ${mState.tops.includes(t.id) ? 'checked' : ''}><span>${esc(t.name)}${t.std ? ' <small>standard</small>' : ''}</span><em>Free</em></label>`).join('')}
      </fieldset>
      <fieldset class="mfs"><legend>Load it up <span>Optional</span></legend>
        ${D.addons.map(a => a.qty ? `
          <div class="opt opt--qty"><span>${esc(a.name)}</span><em>+${money(a.price)}</em>
            <span class="qty qty--sm" data-addon="${a.id}"><button type="button" data-aq="-1" aria-label="Fewer ${esc(a.name)}">−</button><output>${mState.addons[a.id] || 0}</output><button type="button" data-aq="1" aria-label="More ${esc(a.name)}">+</button></span></div>`
        : `<label class="opt"><input type="checkbox" name="add" value="${a.id}" ${mState.addons[a.id] ? 'checked' : ''}><span>${esc(a.name)}</span><em>+${money(a.price)}</em></label>`).join('')}
      </fieldset>
      <fieldset class="mfs mfs--meal"><legend>Make it a meal</legend>
        <label class="opt opt--meal"><input type="checkbox" name="meal" ${mState.meal ? 'checked' : ''}><span>${esc(D.meal.name)}<small>${esc(D.meal.note)}</small></span><em>+${money(D.meal.price)}</em></label>
      </fieldset>` : ''}
      <label class="mnote"><span>Special instructions</span><textarea name="note" rows="2" maxlength="140" placeholder="${it.burger ? 'e.g. extra pickles, cut in half' : 'Anything we should know?'}">${esc(mState.note || '')}</textarea></label>`;
    $('[data-q-val]').textContent = mState.qty;
    $('[data-modal-add]').firstChild.textContent = mState.editing ? 'Update · ' : 'Add to bag · ';
    updateModalPrice();
    const m = $('[data-modal]'); m.hidden = false; document.body.classList.add('lock');
    requestAnimationFrame(() => { m.classList.add('is-in'); $('.modal__card').focus(); });
  }
  function readModal() {
    if (!mState) return;
    const b = $('[data-modal-body]');
    mState.tops = $$('input[name=top]:checked', b).map(i => i.value);
    D.addons.filter(a => !a.qty).forEach(a => { mState.addons[a.id] = $(`input[name=add][value=${a.id}]`, b)?.checked ? 1 : 0; });
    mState.meal = !!$('input[name=meal]', b)?.checked;
    mState.note = ($('textarea[name=note]', b)?.value || '').trim();
    Object.keys(mState.addons).forEach(k => { if (!mState.addons[k]) delete mState.addons[k]; });
  }
  function updateModalPrice() { readModal(); $('[data-modal-price]').textContent = money(lineUnit(mState) * mState.qty); }
  function closeModal() {
    const m = $('[data-modal]'); m.classList.remove('is-in'); if ($('[data-drawer]').hidden) document.body.classList.remove('lock');
    setTimeout(() => { m.hidden = true; }, 200); mState = null; if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('change', e => { if (e.target.closest('[data-modal-body]')) updateModalPrice(); });
  document.addEventListener('input', e => { if (e.target.closest('[data-modal-body]')) updateModalPrice(); });
  document.addEventListener('click', e => {
    const aq = e.target.closest('[data-aq]');
    if (aq && mState) {
      const id = aq.parentElement.dataset.addon; const a = D.addons.find(x => x.id === id);
      mState.addons[id] = Math.max(0, Math.min(a.max, (mState.addons[id] || 0) + +aq.dataset.aq));
      aq.parentElement.querySelector('output').textContent = mState.addons[id]; updateModalPrice(); return;
    }
    const q = e.target.closest('[data-q]');
    if (q && mState) { mState.qty = Math.max(1, Math.min(20, mState.qty + +q.dataset.q)); $('[data-q-val]').textContent = mState.qty; updateModalPrice(); return; }
    if (e.target.closest('[data-modal-add]') && mState) {
      readModal();
      const line = { itemId: mState.itemId, qty: mState.qty, tops: mState.tops.sort(), addons: mState.addons, meal: mState.meal, note: mState.note };
      if (mState.editing) { cart = cart.filter(l => l.uid !== mState.editing); }
      addLine(line, !!mState.editing); closeModal(); return;
    }
    if (e.target.closest('[data-close-modal]')) { closeModal(); return; }
    const oi = e.target.closest('[data-open-item]'); if (oi) { openItem(oi.dataset.openItem); return; }
    if (e.target.closest('[data-open-bag]')) { openBag(); return; }
    if (e.target.closest('[data-close-bag]')) { closeBag(); return; }
    if (e.target.closest('[data-reorder]')) { reorder(); return; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!$('[data-modal]').hidden) closeModal(); else if (!$('[data-drawer]').hidden) closeBag(); }
    if (e.key === 'Tab') { // simple focus trap for the top-most dialog
      const box = !$('[data-modal]').hidden ? $('.modal__card') : (!$('[data-drawer]').hidden ? $('.drawer__panel') : null);
      if (!box) return; const f = $$('button:not([disabled]),a[href],input:not([disabled]),select,textarea', box).filter(x => x.offsetParent !== null);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  /* ---------- Drawer: bag → checkout → confirmation ---------- */
  function openBag() {
    lastFocus = document.activeElement;
    if (view === 'done') view = 'bag';
    renderDrawer(); const d = $('[data-drawer]'); d.hidden = false; document.body.classList.add('lock');
    requestAnimationFrame(() => { d.classList.add('is-in'); $('.drawer__panel').focus(); });
  }
  function closeBag() {
    const d = $('[data-drawer]'); d.classList.remove('is-in'); document.body.classList.remove('lock');
    setTimeout(() => { d.hidden = true; if (view === 'done') view = 'bag'; }, 250);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  function setView(v) { view = v; renderDrawer(); $('[data-drawer-body]').scrollTop = 0; }
  $('[data-back]').addEventListener('click', () => setView('bag'));

  function upsellHTML() {
    const noMeal = cart.find(l => itemById(l.itemId)?.burger && !l.meal);
    const hasFries = cart.some(l => l.itemId === 'fries' || l.meal);
    const hasShake = cart.some(l => l.itemId === 'shake');
    if (noMeal) return `<div class="upsell"><div><b>Make it a meal for $5</b><span>Add fries + a drink to your ${esc(itemById(noMeal.itemId).name)}.</span></div><button class="btn btn--red btn--sm" type="button" data-meal="${noMeal.uid}">Add · $5</button></div>`;
    if (!hasShake && cart.length) return `<div class="upsell"><div><b>Finish with a shake?</b><span>Vanilla milkshake, ${money(itemById('shake').price)}.</span></div><button class="btn btn--red btn--sm" type="button" data-quick="shake">Add</button></div>`;
    if (!hasFries && cart.length) return `<div class="upsell"><div><b>Fries with that?</b><span>Crispy fries, ${money(itemById('fries').price)}.</span></div><button class="btn btn--red btn--sm" type="button" data-quick="fries">Add</button></div>`;
    return '';
  }
  function whenHTML() {
    const s = status(); const days = buildDays(cart); const prep = prepMinutes(cart);
    if (!s.open && prefs.when === 'asap') prefs.when = 'later';
    let day = days.find(d => d.key === prefs.day && !d.closed && !d.done) || days.find(d => !d.closed && !d.done);
    if (day) prefs.day = day.key;
    if (day && prefs.slot != null && !day.slots.some(x => x.min === prefs.slot && !x.disabled)) prefs.slot = null;
    return `
      <fieldset class="dfs"><legend>${prefs.mode === 'delivery' ? 'Delivery' : 'Pickup'} time</legend>
        <div class="seg seg--2">
          <button type="button" data-when="asap" aria-pressed="${prefs.when === 'asap'}" ${s.open ? '' : 'disabled'}>ASAP <small>${s.open ? `~${prep} min` : 'closed now'}</small></button>
          <button type="button" data-when="later" aria-pressed="${prefs.when === 'later'}">Schedule <small>pick a time</small></button>
        </div>
        ${!s.open ? `<p class="hint hint--warn">We're closed right now. ${nextOpenLabel(s)}. Pick a pickup time below.</p>` : ''}
        ${prefs.when === 'later' ? `
          <div class="days" role="radiogroup" aria-label="Pickup day">${days.map(d => `<button type="button" role="radio" class="day" data-day="${d.key}" aria-checked="${d.key === prefs.day}" ${d.closed || d.done ? 'disabled' : ''}><b>${d.label}</b><small>${d.closed ? 'Closed' : d.done ? 'Done for today' : d.sub}</small></button>`).join('')}</div>
          ${day ? `<div class="slots" role="radiogroup" aria-label="Pickup time">${day.slots.map(x => `<button type="button" role="radio" class="slot" data-slot="${x.min}" aria-checked="${x.min === prefs.slot}" ${x.disabled ? 'disabled' : ''}>${hmFull(x.min)}</button>`).join('')}</div>` : ''}
          <p class="err" data-err="slot" hidden>Pick a pickup time.</p>` : ''}
      </fieldset>`;
  }
  function renderBag() {
    const t = totals(); const last = load(LS.last, null);
    if (!cart.length) {
      return {
        body: `<div class="empty"><div class="empty__art" aria-hidden="true"><img src="img/ig-burger-stacked.jpg" alt="" class="empty__photo"></div><h3>Your bag is empty</h3><p>Four smashburgers, fries and a shake. Start with the classic.</p>
          <button class="btn btn--red" type="button" data-open-item="double-cheese">Double Cheese Smash · $7.50</button>
          ${last ? `<button class="btn btn--ghost" type="button" data-reorder>↻ Reorder last order (${last.items.length} item${last.items.length > 1 ? 's' : ''})</button>` : ''}</div>`,
        foot: ''
      };
    }
    const lines = cart.map(l => {
      const it = itemById(l.itemId);
      return `<li class="line"><div class="line__main"><b>${esc(it.name)}</b><small>${esc(describe(l)) || '&nbsp;'}</small>
        <div class="line__acts">${it.burger || l.note ? `<button type="button" class="link" data-edit="${l.uid}">Edit</button>` : ''}<button type="button" class="link" data-remove="${l.uid}">Remove</button></div></div>
        <div class="line__side"><span class="line__price">${money(lineUnit(l) * l.qty)}</span>
        <span class="qty qty--sm"><button type="button" data-lq="-1" data-uid="${l.uid}" aria-label="Decrease ${esc(it.name)}">−</button><output>${l.qty}</output><button type="button" data-lq="1" data-uid="${l.uid}" aria-label="Increase ${esc(it.name)}">+</button></span></div></li>`;
    }).join('');
    const tipOpts = [0, 10, 15, 20];
    const body = `
      <div class="seg seg--2 mode" role="radiogroup" aria-label="Pickup or delivery">
        <button type="button" data-mode="pickup" aria-pressed="${prefs.mode === 'pickup'}">Pickup <small>at the window</small></button>
        <button type="button" data-mode="delivery" aria-pressed="${prefs.mode === 'delivery'}">Delivery <small>not offered yet</small></button>
      </div>
      ${prefs.mode === 'delivery' ? `<p class="hint hint--warn">The Smashburger Boxx doesn't deliver today. This flow is wired for a delivery partner (e.g. DoorDash Drive) so delivery can switch on later; in the demo, no delivery fee is added.</p>` : ''}
      <ul class="lines">${lines}</ul>
      ${upsellHTML()}
      ${whenHTML()}
      <fieldset class="dfs"><legend>Tip <span>optional</span></legend>
        <div class="seg seg--5">${tipOpts.map(p => `<button type="button" data-tip="${p}" aria-pressed="${prefs.tip === p}">${p ? p + '%' : 'None'}${p ? `<small>${money(Math.round(t.sub * p / 100))}</small>` : ''}</button>`).join('')}<button type="button" data-tip="custom" aria-pressed="${prefs.tip === 'custom'}">Custom</button></div>
        ${prefs.tip === 'custom' ? `<label class="field field--inline"><span>$</span><input type="number" inputmode="decimal" min="0" step="0.5" data-tipcustom value="${esc(prefs.tipCustom)}" aria-label="Custom tip in dollars"></label>` : ''}
      </fieldset>
      <label class="field"><span>Order notes</span><textarea rows="2" maxlength="200" data-notes placeholder="Allergies, pickup details…">${esc(prefs.notes)}</textarea></label>
      ${sumHTML(t)}`;
    const foot = `<button class="btn btn--red btn--block btn--lg" type="button" data-go-checkout>Checkout · ${money(t.total)}</button>`;
    return { body, foot };
  }
  function sumHTML(t) {
    return `<dl class="sum">
        <div><dt>Subtotal</dt><dd>${money(t.sub)}</dd></div>
        <div><dt>Tax <button type="button" class="info" aria-label="About tax" title="${esc(D.taxSource)}">i</button><small>8% Columbia County, NY</small></dt><dd>${money(t.tax)}</dd></div>
        <div><dt>Tip</dt><dd>${money(t.tip)}</dd></div>
        ${prefs.mode === 'delivery' ? '<div><dt>Delivery fee <small>set by delivery partner</small></dt><dd>—</dd></div>' : ''}
        <div class="sum__total"><dt>Total</dt><dd>${money(t.total)}</dd></div>
      </dl>`;
  }
  function whenLabel() {
    if (prefs.when === 'asap') return `ASAP · ready ~${prepMinutes(cart)} min`;
    const d = buildDays(cart).find(x => x.key === prefs.day);
    return d && prefs.slot != null ? `${d.label === 'Today' || d.label === 'Tomorrow' ? d.label : DAYS[d.dow]} ${d.sub} · ${hmFull(prefs.slot)}` : 'Pick a time';
  }
  function renderCheckout() {
    const t = totals();
    const body = `
      <div class="recap"><div><small>${prefs.mode === 'delivery' ? 'Delivery' : 'Pickup'}</small><b>${esc(whenLabel())}</b></div><button type="button" class="link" data-back2>Change</button></div>
      <form class="form" data-form novalidate>
        <label class="field"><span>Name for the order</span><input name="name" autocomplete="name" required minlength="2" value="${esc(prefs.name)}" placeholder="First name is fine"><em class="err" hidden>Add a name so we can call it out.</em></label>
        <label class="field"><span>Mobile number</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required value="${esc(prefs.phone)}" placeholder="(518) 555-0123"><em class="err" hidden>Enter a 10-digit US mobile number.</em></label>
        <label class="field"><span>Email <small>optional, for a receipt</small></span><input name="email" type="email" autocomplete="email" value="${esc(prefs.email)}" placeholder="you@example.com"><em class="err" hidden>That email doesn't look right.</em></label>
        ${prefs.mode === 'delivery' ? `<label class="field"><span>Delivery address</span><input name="addr" autocomplete="street-address" required value="${esc(prefs.addr)}" placeholder="Street, town"><em class="err" hidden>Add a delivery address.</em></label>` : ''}
        <label class="check"><input type="checkbox" name="sms" ${prefs.sms ? 'checked' : ''}><span>Text me when it's ready</span></label>
        <div class="pay">
          <b>Payment</b>
          <p>Payment continues on SpotOn. This page never charges a card and never sends an order to the kitchen. The SpotOn page is Hudson Bagels (same family, 93 Ten Broeck), not a Smash Burger Boxx menu; Smash Burger Boxx does not have its own SpotOn menu yet.</p>
        </div>
      </form>
      ${sumHTML(t)}`;
    const foot = `<a class="btn btn--red btn--block btn--lg" href="https://order.spoton.com/ddi-hudson-bagels-7283/hudson-ny/61e70ec19adef33e920bba1a" target="_blank" rel="noopener">Continue on SpotOn</a><p class="fine">This page takes no payment.</p>`;
    return { body, foot };
  }
  function renderDone(o) {
    const body = `
      <div class="done">
        <div class="done__badge">Demo order</div>
        <div class="done__check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>
        <h3>Order #${esc(o.number)} is in the (demo) queue</h3>
        <p class="done__when"><small>${o.mode === 'delivery' ? 'Estimated delivery' : 'Ready for pickup'}</small><b>${esc(o.readyLabel)}</b></p>
        <p class="done__where">${o.mode === 'delivery' ? esc(o.customer.addr) : 'The Smashburger Boxx · 93 Ten Broeck Ave, Hudson'}</p>
        <ul class="lines lines--ro">${o.items.map(l => `<li class="line"><div class="line__main"><b>${l.qty}× ${esc(l.name)}</b><small>${esc(l.desc) || '&nbsp;'}</small></div><div class="line__side"><span class="line__price">${money(l.total)}</span></div></li>`).join('')}</ul>
        <dl class="sum"><div><dt>Subtotal</dt><dd>${money(o.totals.sub)}</dd></div><div><dt>Tax (8%)</dt><dd>${money(o.totals.tax)}</dd></div><div><dt>Tip</dt><dd>${money(o.totals.tip)}</dd></div><div class="sum__total"><dt>Total</dt><dd>${money(o.totals.total)}</dd></div></dl>
        <div class="honest"><b>This is a concept demo.</b> No order was sent to The Smashburger Boxx and no card was charged. To actually order, head to the window at 93 Ten Broeck Ave, Thu–Sun 2–8 PM.</div>
        <a class="btn btn--ghost btn--block" href="${D.business.mapsDir}" target="_blank" rel="noopener">Directions to the Boxx</a>
      </div>`;
    return { body, foot: `<button class="btn btn--red btn--block" type="button" data-close-bag>Done</button>` };
  }
  let lastOrder = null;
  function renderDrawer() {
    const r = view === 'bag' ? renderBag() : view === 'checkout' ? renderCheckout() : renderDone(lastOrder);
    $('[data-drawer-title]').textContent = view === 'bag' ? 'Your bag' : view === 'checkout' ? 'Checkout' : 'Confirmation';
    $('[data-back]').hidden = view !== 'checkout';
    $('[data-drawer-body]').innerHTML = r.body; $('[data-drawer-foot]').innerHTML = r.foot;
    $('[data-drawer-foot]').hidden = !r.foot;
    const sel = $('.slot[aria-checked=true]'); if (sel) sel.parentElement.scrollTop = Math.max(0, sel.offsetTop - 70);
    else { const first = $('.slot:not([disabled])'); if (first) first.parentElement.scrollTop = Math.max(0, first.offsetTop - 8); }
  }

  // Drawer interactions
  $('[data-drawer]').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lq) { const l = cart.find(x => x.uid === b.dataset.uid); if (l) { l.qty += +b.dataset.lq; if (l.qty < 1) cart = cart.filter(x => x !== l); persist(); renderDrawer(); } return; }
    if (b.dataset.remove) { cart = cart.filter(x => x.uid !== b.dataset.remove); persist(); renderDrawer(); return; }
    if (b.dataset.edit) { const l = cart.find(x => x.uid === b.dataset.edit); if (l) openItem(l.itemId, l); return; }
    if (b.dataset.meal) { const l = cart.find(x => x.uid === b.dataset.meal); if (l) { l.meal = true; const dup = cart.find(x => x !== l && sig(x) === sig(l)); if (dup) { dup.qty += l.qty; cart = cart.filter(x => x !== l); } persist(); renderDrawer(); toast('Made it a meal'); } return; }
    if (b.dataset.quick) { addLine({ itemId: b.dataset.quick, qty: 1, tops: [], addons: {}, meal: false, note: '' }); return; }
    if (b.dataset.mode) { prefs.mode = b.dataset.mode; persist(); renderDrawer(); return; }
    if (b.dataset.when) { prefs.when = b.dataset.when; persist(); renderDrawer(); return; }
    if (b.dataset.day) { prefs.day = b.dataset.day; prefs.slot = null; persist(); renderDrawer(); return; }
    if (b.dataset.slot) { prefs.slot = +b.dataset.slot; persist(); renderDrawer(); return; }
    if (b.dataset.tip != null && b.dataset.tip !== undefined && 'tip' in b.dataset) { prefs.tip = b.dataset.tip === 'custom' ? 'custom' : +b.dataset.tip; persist(); renderDrawer(); if (prefs.tip === 'custom') $('[data-tipcustom]')?.focus(); return; }
    if ('goCheckout' in b.dataset) {
      if (prefs.when === 'later' && prefs.slot == null) { const er = $('[data-err=slot]'); if (er) { er.hidden = false; er.scrollIntoView({ block: 'center', behavior: 'smooth' }); } toast('Pick a pickup time first'); return; }
      setView('checkout'); return;
    }
    if ('back2' in b.dataset) { setView('bag'); return; }
    if ('place' in b.dataset) { place(b); return; }
  });
  $('[data-drawer]').addEventListener('input', e => {
    if (e.target.matches('[data-notes]')) { prefs.notes = e.target.value; save(LS.prefs, prefs); }
    if (e.target.matches('[data-tipcustom]')) { prefs.tipCustom = e.target.value; save(LS.prefs, prefs); const t = totals(); const s = $('.sum'); if (s) s.outerHTML = sumHTML(t); $('[data-go-checkout]').textContent = `Checkout · ${money(t.total)}`; }
    if (e.target.closest('[data-form]')) { const f = e.target; if (f.name && f.name !== 'sms') { prefs[f.name] = f.value; save(LS.prefs, prefs); } if (f.closest('.field')?.classList.contains('bad')) validate(f); }
  });

  /* ---------- Validation ---------- */
  const digits = s => (s || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  function validate(inp) {
    let ok = true; const v = inp.value.trim();
    if (inp.name === 'name') ok = v.length >= 2;
    if (inp.name === 'phone') ok = /^[2-9]\d{2}[2-9]\d{6}$/.test(digits(v));
    if (inp.name === 'email') ok = !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (inp.name === 'addr') ok = v.length >= 6;
    const f = inp.closest('.field'); f.classList.toggle('bad', !ok); $('.err', f).hidden = ok; inp.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  /* ---------- submitOrder(): the ONE place a real backend plugs in ----------
   * The browser never holds secret keys. A live launch posts `order` to a tiny server endpoint
   * (Cloudflare Worker / Netlify Function / Vercel route), which then talks to the shop's provider.
   * Primary: SpotOn Order (Hudson Bagels family POS — same operator).
   *
   *  • SpotOn Order (primary):
   *      Map data.js item/modifier ids to SpotOn menu items; server creates the order via SpotOn
   *      online ordering / payment link for the location; tickets land on SpotOn POS/KDS.
   *      Card details stay on SpotOn. This demo never calls SpotOn.
   *  • Live order link is the Hudson Bagels SpotOn URL above; this page does not charge cards.
   *  Contract: resolve { ok, number, readyAt, redirectUrl? }; if redirectUrl is present, send the guest there.
   */
  async function submitOrder(order) {
    // DEMO ADAPTER: simulates latency, sends nothing anywhere, charges nothing.
    await new Promise(r => setTimeout(r, 650));
    return { ok: true, demo: true, number: String(Math.floor(100 + Math.random() * 900)), readyAt: order.fulfillment.readyAt };
  }

  async function place(btn) {
    const form = $('[data-form]'); const inputs = $$('input[name]:not([type=checkbox])', form);
    const bad = inputs.filter(i => !validate(i));
    if (bad.length) { bad[0].focus(); toast('Check the highlighted fields'); return; }
    prefs.sms = $('input[name=sms]', form).checked;
    const s = status(); const prep = prepMinutes(cart);
    let readyMin, readyDayKey, readyLabel;
    if (prefs.when === 'asap' && s.open) {
      const n = ny(nowMs()); readyMin = n.min + prep; readyDayKey = n.key; readyLabel = `Today around ${hmFull(Math.ceil(readyMin / 5) * 5)} (~${prep} min)`;
    } else {
      const d = buildDays(cart).find(x => x.key === prefs.day); readyMin = prefs.slot; readyDayKey = prefs.day;
      if (!d || readyMin == null) { setView('bag'); toast('Pick a pickup time'); return; }
      readyLabel = `${d.label === 'Today' || d.label === 'Tomorrow' ? d.label : DAYS[d.dow]} ${d.sub} at ${hmFull(readyMin)}`;
    }
    const t = totals();
    const order = {
      source: 'web-concept', createdAt: new Date(nowMs()).toISOString(),
      fulfillment: { mode: prefs.mode, when: prefs.when, day: readyDayKey, minuteOfDay: readyMin, readyAt: `${readyDayKey}T${String(Math.floor(readyMin / 60)).padStart(2, '0')}:${String(readyMin % 60).padStart(2, '0')}` },
      customer: { name: prefs.name.trim(), phone: digits(prefs.phone), email: prefs.email.trim(), addr: prefs.mode === 'delivery' ? prefs.addr.trim() : '', sms: prefs.sms },
      items: cart.map(l => ({ itemId: l.itemId, name: itemById(l.itemId).name, qty: l.qty, tops: l.tops, addons: l.addons, meal: l.meal, note: l.note, unit: lineUnit(l), total: lineUnit(l) * l.qty, desc: describe(l) })),
      notes: prefs.notes.trim(), totals: t, taxRate: D.taxRate
    };
    btn.disabled = true; btn.textContent = 'Placing demo order…';
    try {
      const res = await submitOrder(order);
      if (res.redirectUrl) { location.href = res.redirectUrl; return; }
      lastOrder = Object.assign({}, order, { number: res.number, readyLabel, mode: prefs.mode });
      save(LS.last, { at: order.createdAt, items: cart.map(l => ({ itemId: l.itemId, qty: l.qty, tops: l.tops, addons: l.addons, meal: l.meal, note: l.note })) });
      cart = []; persist(); setView('done'); renderReorder();
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Try again'; toast('Something went wrong. Nothing was charged.');
    }
  }
  function reorder() {
    const last = load(LS.last, null); if (!last) return;
    last.items.forEach(l => { if (itemById(l.itemId)) addLine(Object.assign({}, l), true); });
    toast('Last order added to your bag'); openBag();
  }
  function renderReorder() { const b = $('[data-reorder]'); if (b) b.hidden = !load(LS.last, null); }

  /* ---------- Badges / sticky bar ---------- */
  function renderBadges() {
    const t = totals();
    $$('[data-bag-count]').forEach(el => { el.hidden = !t.count; el.textContent = t.count; });
    const lab = $('[data-mbar-label]'), sub = $('[data-mbar-sub]'), tot = $('[data-mbar-total]');
    if (lab) {
      if (t.count) { lab.textContent = `View bag · ${t.count} item${t.count > 1 ? 's' : ''}`; sub.textContent = prefs.when === 'asap' && status().open ? `Pickup · ready ~${prepMinutes(cart)} min` : 'Pickup · scheduled'; tot.textContent = money(t.sub); }
      else { lab.textContent = 'Start an order'; const s = status(); sub.textContent = s.open ? `Open now · ready ~${prepMinutes([{ itemId: 'double', qty: 1 }])} min` : nextOpenLabel(s); tot.textContent = ''; }
      document.body.classList.toggle('has-bag', !!t.count);
    }
    renderStatus();
  }
  let toastT; function toast(msg) { const el = $('[data-toast]'); el.textContent = msg; el.classList.add('is-in'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-in'), 1900); }

  /* ---------- Hours table ---------- */
  function renderHours() {
    const n = ny(nowMs()); const order = [4, 5, 6, 0, 1, 2, 3];
    $('[data-hours]').innerHTML = '<tbody>' + order.map(d => { const h = D.hours[d]; return `<tr class="${d === n.dow ? 'is-today' : ''}${h ? '' : ' is-closed'}"><th scope="row">${DAYS[d]}${d === n.dow ? ' <small>today</small>' : ''}</th><td>${h ? `${hm(h[0])} – ${hm(h[1])}` : 'Closed'}</td></tr>`; }).join('') + '</tbody>';
  }

  /* ---------- Build-your-own stacker ---------- */
  const B = { patties: 1, cheese: 1, tops: D.toppings.filter(t => t.std).map(t => t.id), adds: {} };
  function buildToLine() {
    const two = B.patties >= 2; const base = two ? (B.cheese ? 'double-cheese' : 'double') : (B.cheese ? 'single-cheese' : 'single');
    const addons = {}; if (B.patties > 2) addons.patty = B.patties - 2; D.addons.filter(a => !a.qty).forEach(a => { if (B.adds[a.id]) addons[a.id] = 1; });
    return { itemId: base, qty: 1, tops: [...B.tops].sort(), addons, meal: false, note: '' };
  }
  function renderStack() {
    const line = buildToLine(); const price = lineUnit(line); const it = itemById(line.itemId);
    $('[data-build-price]').textContent = money(price); $('[data-build-price2]').textContent = money(price);
    $('[data-build-name]').textContent = it.name + (B.patties > 2 ? ` + ${B.patties - 2} extra patt${B.patties - 2 > 1 ? 'ies' : 'y'}` : '');
    const st = $('[data-stack]');
    if (st) {
      const topsSummary = [
        ...B.tops.map(t => D.toppings.find(x => x.id === t)?.name),
        ...Object.keys(B.adds).filter(a => B.adds[a]).map(a => D.addons.find(x => x.id === a)?.name)
      ].filter(Boolean).join(' · ');
      st.innerHTML = `
        <div class="build__photo-wrap">
          <img src="${it.img || 'img/ig-burger-stacked.jpg'}" alt="${esc(it.name)}" class="build__photo">
          <div class="build__badge">${esc(topsSummary || 'Classic smash')}</div>
        </div>
      `;
      st.classList.remove('pop'); void st.offsetWidth; st.classList.add('pop');
    }
  }
  function initBuild() {
    $('[data-build-tops]').innerHTML = D.toppings.map(t => `<button type="button" class="pill" data-bt="${t.id}" aria-pressed="${B.tops.includes(t.id)}">${esc(t.name)}</button>`).join('');
    $('[data-build-adds]').innerHTML = D.addons.filter(a => !a.qty).map(a => `<button type="button" class="pill" data-ba="${a.id}" aria-pressed="false">${esc(a.name)} <small>+${money(a.price)}</small></button>`).join('');
    $('#build').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const seg = b.closest('[data-build-patties],[data-build-cheese]');
      if (seg) { $$('button', seg).forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (seg.matches('[data-build-patties]')) B.patties = +b.dataset.v; else B.cheese = +b.dataset.v; renderStack(); return; }
      if (b.dataset.bt) { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); B.tops = on ? [...B.tops, b.dataset.bt] : B.tops.filter(x => x !== b.dataset.bt); renderStack(); return; }
      if (b.dataset.ba) { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); B.adds[b.dataset.ba] = on ? 1 : 0; renderStack(); return; }
      if ('buildAdd' in b.dataset) { addLine(buildToLine()); return; }
    });
    renderStack();
  }

  /* ---------- Category highlight ---------- */
  function initCats() {
    const links = $$('.cat'); const secs = D.categories.map(c => $('#cat-' + c.id));
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + en.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(s => s && io.observe(s));
  }

  renderMenu(); renderHours(); initBuild(); initCats(); renderBadges(); renderReorder();
  setInterval(() => { renderBadges(); renderHours(); }, 60000);
  window.SBBOrder = { submitOrder, status, buildDays, totals }; // exposed for testing
})();
