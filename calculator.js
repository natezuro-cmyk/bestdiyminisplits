/* ================================================================
   BestDIYMiniSplits — calculator + live room diagram
   Shared script for the homepage and /mini-split-sizing-calculator.
   ================================================================ */
(function () {
  'use strict';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ----- Math: sizing -----
  const climateRates = { hot: 25, warm: 22, mixed: 20, cool: 18, cold: 16 };
  const heatingRates = { hot: 18, warm: 22, mixed: 30, cool: 40, cold: 55 };
  const standardSizes = [6000, 9000, 12000, 18000, 24000, 30000, 36000, 42000, 48000, 60000];

  const suggestions = {
    6000:  { diy: ['Klimaire DIY 6k', 'Perfect Aire ProDirect 6k'],
             pro: ['Mitsubishi MSZ-FS06NA', 'Pioneer WYS006'] },
    9000:  { diy: ['Klimaire DIY 9k', 'MrCool DIY 9k', 'Perfect Aire ProDirect 9k'],
             pro: ['Daikin 19-Series 9k', 'Fujitsu ASU9RL', 'Mitsubishi MSZ-FS09NA'] },
    12000: { diy: ['Della DIY 12k', 'Klimaire DIY 12k', 'MrCool DIY 12k', 'Perfect Aire ProDirect 12k'],
             pro: ['Daikin FTXS12', 'Fujitsu 12RLS3H', 'Mitsubishi MSZ-FS12NA', 'Senville LETO 12k'] },
    18000: { diy: ['Klimaire DIY 18k', 'MrCool DIY 18k', 'Perfect Aire ProDirect 18k'],
             pro: ['Daikin 18-Series', 'Fujitsu 18RLS3H', 'Mitsubishi MSZ-GL18NA'] },
    24000: { diy: ['Della DIY 24k', 'MrCool DIY 24k'],
             pro: ['Daikin 24-Series', 'Fujitsu 24RLS3H', 'Mitsubishi MSZ-GL24NA'] },
    30000: { diy: ['Cooper & Hunter DIY multi-zone', 'MrCool Universal 30k (ducted)'],
             pro: ['Daikin multi-zone', 'Mitsubishi multi-zone', 'Pioneer 30k'] },
    36000: { diy: ['Cooper & Hunter DIY 3-head multi-zone', 'MrCool DIY 4-zone (9+9+9+9)', 'MrCool Universal 36k'],
             pro: ['Daikin 3-zone', 'Fujitsu 3-zone', 'Mitsubishi multi-zone 36k'] },
    42000: { diy: ['MrCool DIY 4-zone (12+9+9+12)', 'MrCool Universal 48k (sized up)'],
             pro: ['Daikin 4-zone', 'Mitsubishi multi-zone 42k'] },
    48000: { diy: ['MrCool DIY 5-zone (max)', 'MrCool Universal 48k'],
             pro: ['Daikin 4–5 zone', 'Mitsubishi 4–5 zone'] },
    60000: { diy: ['Two separate DIY systems recommended'],
             pro: ['Pro multi-zone 5-head + supplemental', 'Consider ducted Universal + auxiliary'] }
  };

  // Installed cost ranges (all-in: unit + lineset + electrical)
  const costs = {
    6000:  { diy: '$900–$1,400',    pro: '$2,500–$4,000' },
    9000:  { diy: '$1,000–$1,600',  pro: '$2,800–$4,500' },
    12000: { diy: '$1,100–$1,900',  pro: '$3,200–$5,500' },
    18000: { diy: '$1,400–$2,400',  pro: '$4,000–$6,500' },
    24000: { diy: '$1,800–$3,000',  pro: '$5,000–$8,000' },
    30000: { diy: '$3,000–$5,000',  pro: '$8,000–$13,000' },
    36000: { diy: '$4,500–$7,000',  pro: '$11,000–$16,000' },
    42000: { diy: '$6,000–$8,500',  pro: '$13,000–$18,000' },
    48000: { diy: '$7,000–$9,500',  pro: '$14,000–$20,000' },
    60000: { diy: '$8,000–$11,000', pro: '$16,000–$22,000' }
  };

  // ----- Room diagram lookup tables -----
  const ceilingMap = {
    '1.0':  { y: 160, label: "8 ft", short: "8'" },
    '1.12': { y: 140, label: "9 ft", short: "9'" },
    '1.25': { y: 120, label: "10 ft", short: "10'" },
    '1.4':  { y: 88,  label: "12 ft+", short: "12'+" }
  };
  const sunMap = {
    '0.9': { r: 8,  opacity: 0.25, rays: 0, label: 'heavily shaded' },
    '1.0': { r: 13, opacity: 0.5,  rays: 6, label: 'average sun' },
    '1.1': { r: 17, opacity: 0.75, rays: 8, label: 'sunny' },
    '1.2': { r: 22, opacity: 0.95, rays: 10, label: 'full sun' }
  };

  function getFormValues() {
    const $ = (id) => document.getElementById(id);
    return {
      sqft:       parseFloat($('sqft').value) || 0,
      ceilingVal: $('ceiling').value,
      ceiling:    parseFloat($('ceiling').value),
      climate:    $('climate').value,
      insulation: parseFloat($('insulation').value),
      sunVal:     $('sun').value,
      sun:        parseFloat($('sun').value),
      occupants:  parseInt($('occupants').value) || 0,
      roomtype:   parseFloat($('roomtype').value),
      floor:      parseFloat($('floor').value)
    };
  }

  function roundBtu(n) { return Math.round(n / 1000) * 1000; }

  function computeBtu(v) {
    const base = v.sqft * climateRates[v.climate];
    const occupantAdd = Math.max(0, v.occupants - 2) * 600;
    let cooling = base * v.ceiling * v.insulation * v.sun * v.floor;
    cooling += occupantAdd + v.roomtype;
    let heating = v.sqft * heatingRates[v.climate] * v.ceiling * v.insulation * v.floor;
    cooling = roundBtu(cooling);
    heating = roundBtu(heating);
    const recommended = Math.max(cooling, heating);
    const matched = standardSizes.find(s => s >= recommended) || recommended;
    return { cooling, heating, matched, occupantAdd };
  }

  // ----- Room diagram rendering -----
  function dimsFromSqft(sqft) {
    const ratio = 1.56;
    const w = Math.max(6, Math.round(Math.sqrt(sqft / ratio)));
    const l = Math.max(6, Math.round(Math.sqrt(sqft * ratio)));
    return { w, l };
  }
  function roomWidthPx(sqft) {
    const factor = Math.sqrt(sqft / 400);
    return Math.max(160, Math.min(340, Math.round(240 * factor)));
  }
  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderRoom(matchedBtu) {
    const svg = document.getElementById('roomSvg');
    if (!svg) return;
    const v = getFormValues();

    const ceil = ceilingMap[v.ceilingVal] || ceilingMap['1.0'];
    const sunS = sunMap[v.sunVal] || sunMap['1.0'];
    const dims = dimsFromSqft(v.sqft);
    const roomW = roomWidthPx(v.sqft);

    const floorY = 260;
    const roomX = 60;
    const roomY = ceil.y;
    const roomRight = roomX + roomW;
    const roomH = floorY - roomY;

    // Room rectangle
    const rect = document.getElementById('roomRect');
    rect.setAttribute('x', roomX);
    rect.setAttribute('y', roomY);
    rect.setAttribute('width', roomW);
    rect.setAttribute('height', roomH);

    // Left + right wall hatch (insulation feel) — simple tick pattern
    const hatch = document.getElementById('wallHatch');
    clearChildren(hatch);
    const tickStep = 14;
    for (let y = roomY + 6; y < floorY - 2; y += tickStep) {
      const mkLine = (x1, y1, x2, y2) => {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#1a1814');
        line.setAttribute('stroke-width', '0.5');
        line.setAttribute('opacity', '0.42');
        return line;
      };
      hatch.appendChild(mkLine(roomX - 5, y, roomX + 3, y + 8));
      hatch.appendChild(mkLine(roomRight - 3, y, roomRight + 5, y + 8));
    }

    // Ceiling-height dimension line (right side)
    const dimH = document.getElementById('dimH');
    dimH.setAttribute('x1', roomRight + 16);
    dimH.setAttribute('x2', roomRight + 16);
    dimH.setAttribute('y1', roomY);
    dimH.setAttribute('y2', floorY);
    document.getElementById('dimHTop').setAttribute('y1', roomY);
    document.getElementById('dimHTop').setAttribute('y2', roomY);
    document.getElementById('dimHTop').setAttribute('x1', roomRight + 12);
    document.getElementById('dimHTop').setAttribute('x2', roomRight + 20);
    document.getElementById('dimHBot').setAttribute('y1', floorY);
    document.getElementById('dimHBot').setAttribute('y2', floorY);
    document.getElementById('dimHBot').setAttribute('x1', roomRight + 12);
    document.getElementById('dimHBot').setAttribute('x2', roomRight + 20);
    const dimHLabel = document.getElementById('dimHLabel');
    dimHLabel.setAttribute('x', roomRight + 22);
    dimHLabel.setAttribute('y', (roomY + floorY) / 2 + 3);
    dimHLabel.textContent = ceil.short;

    // Width label inside the room
    const dimW = document.getElementById('dimWLabel');
    dimW.setAttribute('x', roomX + roomW / 2);
    dimW.setAttribute('y', floorY - 8);
    dimW.textContent = dims.w + "' × " + dims.l + "'";

    // Mini split head on left wall (position scales with ceiling)
    const ms = document.getElementById('minisplit');
    const msY = roomY + 6;
    ms.setAttribute('transform', 'translate(' + (roomX + 10) + ',' + msY + ')');

    // BTU callout — arrow points LEFT back toward the mini split
    const btu = document.getElementById('btuLabel');
    btu.setAttribute('x', roomX + 66);
    btu.setAttribute('y', msY + 12);
    if (typeof matchedBtu === 'number') {
      btu.textContent = '← ' + (matchedBtu / 1000) + 'k BTU';
      btu.setAttribute('fill', '#b44019');
      btu.dataset.calculated = '1';
    } else if (!btu.dataset.calculated) {
      btu.textContent = '← size me';
      btu.setAttribute('fill', '#6e6859');
    }

    // Sun (upper right, outside the room)
    const sunCircle = document.getElementById('sunCircle');
    sunCircle.setAttribute('r', sunS.r);
    sunCircle.setAttribute('opacity', sunS.opacity);

    const sunRays = document.getElementById('sunRays');
    clearChildren(sunRays);
    const sunCx = 432, sunCy = 62;
    for (let i = 0; i < sunS.rays; i++) {
      const angle = (i / sunS.rays) * Math.PI * 2;
      const r1 = sunS.r + 3, r2 = sunS.r + 9;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', sunCx + Math.cos(angle) * r1);
      line.setAttribute('y1', sunCy + Math.sin(angle) * r1);
      line.setAttribute('x2', sunCx + Math.cos(angle) * r2);
      line.setAttribute('y2', sunCy + Math.sin(angle) * r2);
      line.setAttribute('stroke', '#b44019');
      line.setAttribute('stroke-width', '0.9');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', sunS.opacity);
      sunRays.appendChild(line);
    }

    // Sun-ray cast on floor inside room (subtle)
    const raycast = document.getElementById('rayCast');
    clearChildren(raycast);
    if (sunS.r > 10 && roomRight > sunCx - 120) {
      const castX1 = roomRight - Math.min(roomW * 0.6, 80);
      const castX2 = roomRight - 8;
      const castY  = floorY - 2;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', 'M ' + castX1 + ' ' + castY +
                              ' L ' + castX2 + ' ' + castY +
                              ' L ' + (castX2 - 18) + ' ' + (castY - 22) +
                              ' L ' + (castX1 + 14) + ' ' + (castY - 22) + ' Z');
      path.setAttribute('fill', '#b44019');
      path.setAttribute('opacity', sunS.opacity * 0.18);
      raycast.appendChild(path);
    }

    // Occupants
    const occGroup = document.getElementById('occupants');
    clearChildren(occGroup);
    const shown = Math.min(v.occupants, 5);
    if (shown > 0) {
      const innerW = roomW - 36;
      const startX = roomX + 18;
      for (let i = 0; i < shown; i++) {
        const fx = startX + (i + 0.5) * (innerW / shown);
        const fy = floorY - 32;
        const fig = document.createElementNS(SVG_NS, 'g');
        fig.setAttribute('transform', 'translate(' + fx + ',' + fy + ')');
        const head = document.createElementNS(SVG_NS, 'circle');
        head.setAttribute('cx', 0); head.setAttribute('cy', 0);
        head.setAttribute('r', 3.2); head.setAttribute('fill', '#1a1814');
        fig.appendChild(head);
        const body = document.createElementNS(SVG_NS, 'path');
        body.setAttribute('d', 'M -4 5 L 4 5 L 3 20 L -3 20 Z');
        body.setAttribute('fill', '#1a1814');
        fig.appendChild(body);
        occGroup.appendChild(fig);
      }
      if (v.occupants > 5) {
        const more = document.createElementNS(SVG_NS, 'text');
        more.setAttribute('x', roomRight - 8);
        more.setAttribute('y', floorY - 8);
        more.setAttribute('text-anchor', 'end');
        more.setAttribute('font-family', 'JetBrains Mono, monospace');
        more.setAttribute('font-size', '8.5');
        more.setAttribute('fill', '#6e6859');
        more.textContent = '+' + (v.occupants - 5) + ' more';
        occGroup.appendChild(more);
      }
    }

    // Figure caption (aria-live)
    const cap = document.getElementById('roomCaption');
    if (cap) {
      const occText = v.occupants === 1 ? '1 occupant' : v.occupants + ' occupants';
      cap.innerHTML = '<strong>Fig · Your room</strong> ' +
                      v.sqft.toLocaleString() + ' sq ft · ' +
                      ceil.label + ' ceiling · ' +
                      sunS.label + ' · ' + occText + '.';
    }
  }

  // ----- Public: calculate and update result block -----
  window.calculateBtu = function (opts) {
    opts = opts || {};
    const v = getFormValues();
    const r = computeBtu(v);
    const { cooling, heating, matched, occupantAdd } = r;

    document.getElementById('btuNum').textContent  = matched.toLocaleString();
    document.getElementById('tonNum').textContent  = (matched / 12000).toFixed(1);
    document.getElementById('unitSize').textContent = matched.toLocaleString() + ' BTU';

    const pick = suggestions[matched] || {
      diy: ['Contact us for custom sizing'],
      pro: ['Contact a pro for custom sizing']
    };
    document.getElementById('diyList').innerHTML = pick.diy.map(s => '<li>' + s + '</li>').join('');
    document.getElementById('proList').innerHTML = pick.pro.map(s => '<li>' + s + '</li>').join('');

    // Dollar estimates — installed, all-in
    const cost = costs[matched] || { diy: '—', pro: '—' };
    const diyCostEl = document.getElementById('diyCost');
    const proCostEl = document.getElementById('proCost');
    if (diyCostEl) diyCostEl.textContent = cost.diy;
    if (proCostEl) proCostEl.textContent = cost.pro;

    // Driver line — prime real estate under the BTU number
    const driverEl = document.getElementById('heatNote');
    if (driverEl) {
      driverEl.innerHTML = heating > cooling
        ? '<strong>Heating drives the size.</strong> In your climate, heat output (' + heating.toLocaleString() + ' BTU) is larger than cooling (' + cooling.toLocaleString() + ' BTU). Look for a <em>hyper-heat</em> rated model.'
        : '<strong>Cooling drives the size.</strong> Cooling load (' + cooling.toLocaleString() + ' BTU) is larger than heating (' + heating.toLocaleString() + ' BTU). Any standard heat-pump mini split will do.';
    }

    // Multi-zone warning
    const mz = document.getElementById('multiZoneWarn');
    if (mz) {
      const needsMultiZone = matched >= 30000 || v.sqft >= 1000;
      mz.hidden = !needsMultiZone;
    }

    document.getElementById('breakdown').innerHTML =
      '<div class="breakdown-row"><span>Base (' + v.sqft + ' sq ft × ' + climateRates[v.climate] + ' BTU/ft²)</span><span>' + Math.round(v.sqft * climateRates[v.climate]).toLocaleString() + '</span></div>' +
      '<div class="breakdown-row"><span>× ceiling height adjustment</span><span>' + v.ceiling.toFixed(2) + '×</span></div>' +
      '<div class="breakdown-row"><span>× insulation adjustment</span><span>' + v.insulation.toFixed(2) + '×</span></div>' +
      '<div class="breakdown-row"><span>× sun exposure adjustment</span><span>' + v.sun.toFixed(2) + '×</span></div>' +
      '<div class="breakdown-row"><span>× floor adjustment</span><span>' + v.floor.toFixed(2) + '×</span></div>' +
      '<div class="breakdown-row"><span>+ extra occupants</span><span>+' + occupantAdd.toLocaleString() + '</span></div>' +
      (v.roomtype ? '<div class="breakdown-row"><span>+ room-type load</span><span>+' + v.roomtype.toLocaleString() + '</span></div>' : '') +
      '<div class="breakdown-row total"><span>Recommended (rounded up to standard size)</span><span>' + matched.toLocaleString() + ' BTU</span></div>';

    const result = document.getElementById('result');
    result.classList.add('show');
    if (!opts.skipScroll) {
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Push the result into the room diagram's callout + flash the mini split
    renderRoom(matched);
    if (!opts.skipFlash) flashMinisplit();
  };

  function flashMinisplit() {
    const ms = document.getElementById('minisplit');
    if (!ms) return;
    ms.classList.remove('flash');
    // force reflow so the animation restarts on repeated calcs
    // eslint-disable-next-line no-unused-expressions
    ms.getBoundingClientRect();
    ms.classList.add('flash');
  }

  window.submitNewsletter = function () {
    const f = document.getElementById('newsletterForm');
    if (!f) return;
    const emailInput = f.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value : '';
    const row = f.querySelector('.newsletter-row');
    const success = document.getElementById('newsletterSuccess') || document.getElementById('newsSuccess');
    const endpoint = f.getAttribute('data-endpoint') || '';

    const showSuccess = () => {
      if (row) row.style.display = 'none';
      if (success) success.style.display = 'block';
    };

    // No endpoint configured → show success UI locally and log a warning for the site owner
    if (!endpoint || endpoint.indexOf('YOUR_FORM_ID') !== -1) {
      console.warn('[BDMS] Newsletter form endpoint is not configured. Add data-endpoint="https://formspree.io/f/YOUR_ID" on the #newsletterForm element. Submissions will not be delivered until this is set.');
      showSuccess();
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: window.location.pathname })
    }).then(function (r) {
      if (r.ok) showSuccess();
      else {
        console.error('[BDMS] Newsletter POST failed:', r.status);
        alert('Sorry — something went wrong. Please try again or email hello@bestdiyminisplits.com.');
      }
    }).catch(function (err) {
      console.error('[BDMS] Newsletter network error:', err);
      alert('Sorry — network error. Please try again.');
    });
  };

  // ----- Wire up live rendering (calc + room) -----
  function init() {
    if (!document.getElementById('btuForm')) return;
    const allIds = ['sqft', 'ceiling', 'climate', 'insulation', 'sun', 'occupants', 'roomtype', 'floor'];
    let timer;
    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          window.calculateBtu({ skipScroll: true, skipFlash: true });
        }, 80);
      });
    });
    // Initial render — populate result block with defaults so it's visible on load
    window.calculateBtu({ skipScroll: true, skipFlash: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
