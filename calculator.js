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
  // Wall pixel height per ceiling option (sub-proportional to avoid stretching)
  const ceilingMap = {
    '1.0':  { wallH: 80,  label: "8 ft",   short: "8'" },
    '1.12': { wallH: 92,  label: "9 ft",   short: "9'" },
    '1.25': { wallH: 105, label: "10 ft",  short: "10'" },
    '1.4':  { wallH: 124, label: "12 ft+", short: "12'+" }
  };
  const sunMap = {
    '0.9': { r: 8,  opacity: 0.25, rays: 0,  label: 'heavily shaded' },
    '1.0': { r: 13, opacity: 0.5,  rays: 6,  label: 'average sun' },
    '1.1': { r: 17, opacity: 0.75, rays: 8,  label: 'sunny' },
    '1.2': { r: 22, opacity: 0.95, rays: 10, label: 'full sun' }
  };
  // What shows through the window based on climate zone
  // Each climate uses a named gradient (defined in the SVG <defs>) plus a
  // horizon/silhouette drawn at the bottom of the window.
  const climateWindow = {
    hot:   { fill: 'url(#skyHot)',   scene: 'dunes', label: 'desert sunset' },
    warm:  { fill: 'url(#skyWarm)',  scene: 'mesa',  label: 'desert mesa' },
    mixed: { fill: 'url(#skyMixed)', scene: 'hills', label: 'rolling hills' },
    cool:  { fill: 'url(#skyCool)',  scene: 'pines', label: 'pine forest' },
    cold:  { fill: 'url(#skyCold)',  scene: 'snow',  label: 'snow + flurries' }
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
      roomtype:   parseFloat($('roomtype').value)
    };
  }

  function roundBtu(n) { return Math.round(n / 1000) * 1000; }

  function computeBtu(v) {
    const base = v.sqft * climateRates[v.climate];
    let cooling = base * v.ceiling * v.insulation * v.sun;
    cooling += v.roomtype;
    let heating = v.sqft * heatingRates[v.climate] * v.ceiling * v.insulation;
    cooling = roundBtu(cooling);
    heating = roundBtu(heating);
    const recommended = Math.max(cooling, heating);
    const matched = standardSizes.find(s => s >= recommended) || recommended;
    return { cooling, heating, matched };
  }

  // ----- Room diagram (isometric 3D cutaway) -----
  function dimsFromSqft(sqft) {
    const ratio = 1.56;
    const w = Math.max(6, Math.round(Math.sqrt(sqft / ratio)));
    const l = Math.max(6, Math.round(Math.sqrt(sqft * ratio)));
    return { w, l };
  }
  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function setAttrs(el, attrs) {
    for (const k in attrs) el.setAttribute(k, attrs[k]);
  }
  function mk(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) setAttrs(el, attrs);
    return el;
  }

  // Silhouettes shown through the window — horizon + scene per climate.
  // All silhouettes sit at the bottom; the sky gradient shows above.
  function drawWindowScene(group, w, h, scene) {
    clearChildren(group);

    if (scene === 'dunes') {
      // Setting sun disc — large, upper-right
      const sunX = w * 0.68, sunY = h * 0.45, sunR = Math.max(8, h * 0.2);
      group.appendChild(mk('circle', {
        cx: sunX, cy: sunY, r: sunR,
        fill: '#c2410c', opacity: 0.85
      }));
      // Back dunes (lighter, gentle wave)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.72) +
           ' Q ' + (w * 0.25) + ' ' + (h * 0.66) +
           ' '  + (w * 0.5)  + ' ' + (h * 0.72) +
           ' Q ' + (w * 0.75) + ' ' + (h * 0.78) +
           ' '  + w + ' ' + (h * 0.7) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#b86a30', opacity: 0.85
      }));
      // Front dunes (darker)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.84) +
           ' Q ' + (w * 0.3) + ' ' + (h * 0.8) +
           ' '  + (w * 0.55) + ' ' + (h * 0.86) +
           ' Q ' + (w * 0.8) + ' ' + (h * 0.9) +
           ' '  + w + ' ' + (h * 0.84) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#8a4a1f'
      }));
    }

    else if (scene === 'mesa') {
      // Desert mesa — flat-topped mountain silhouette
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.82) +
           ' L ' + (w * 0.3) + ' ' + (h * 0.82) +
           ' L ' + (w * 0.36) + ' ' + (h * 0.55) +
           ' L ' + (w * 0.62) + ' ' + (h * 0.55) +
           ' L ' + (w * 0.68) + ' ' + (h * 0.82) +
           ' L ' + w + ' ' + (h * 0.82) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#6f3512', opacity: 0.92
      }));
    }

    else if (scene === 'hills') {
      // Back hills (lighter)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.68) +
           ' Q ' + (w * 0.25) + ' ' + (h * 0.58) +
           ' '  + (w * 0.5)  + ' ' + (h * 0.65) +
           ' Q ' + (w * 0.75) + ' ' + (h * 0.72) +
           ' '  + w + ' ' + (h * 0.6) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#3d6b3e', opacity: 0.75
      }));
      // Front hills (darker)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.8) +
           ' Q ' + (w * 0.3) + ' ' + (h * 0.76) +
           ' '  + (w * 0.55) + ' ' + (h * 0.82) +
           ' Q ' + (w * 0.8) + ' ' + (h * 0.88) +
           ' '  + w + ' ' + (h * 0.8) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#2d4a2f', opacity: 0.92
      }));
    }

    else if (scene === 'pines') {
      // Layered depth: distant mountains → mid ridge → foreground pines.
      // Distant mountain range (furthest, lightest, low-contrast)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.62) +
           ' L ' + (w * 0.17) + ' ' + (h * 0.46) +
           ' L ' + (w * 0.33) + ' ' + (h * 0.56) +
           ' L ' + (w * 0.5)  + ' ' + (h * 0.4) +
           ' L ' + (w * 0.67) + ' ' + (h * 0.54) +
           ' L ' + (w * 0.83) + ' ' + (h * 0.44) +
           ' L ' + w + ' ' + (h * 0.56) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#6a7a82', opacity: 0.55
      }));
      // Mid ridge (rolling, medium contrast)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.72) +
           ' Q ' + (w * 0.25) + ' ' + (h * 0.64) +
           ' '  + (w * 0.5)  + ' ' + (h * 0.7) +
           ' Q ' + (w * 0.75) + ' ' + (h * 0.76) +
           ' '  + w + ' ' + (h * 0.66) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#3d5a44', opacity: 0.8
      }));
      // Foreground pines (darkest, closest)
      const groundY = h * 0.9;
      const pines = [
        { x: 0.15, ph: 0.38, pw: 0.1  },
        { x: 0.32, ph: 0.3,  pw: 0.08 },
        { x: 0.68, ph: 0.35, pw: 0.09 },
        { x: 0.87, ph: 0.26, pw: 0.07 }
      ];
      pines.forEach(function (p) {
        const px = p.x * w;
        const pineH = h * p.ph;
        const pineW = w * p.pw;
        group.appendChild(mk('path', {
          d: 'M ' + px + ' ' + (groundY - pineH) +
             ' L ' + (px - pineW / 2) + ' ' + groundY +
             ' L ' + (px + pineW / 2) + ' ' + groundY + ' Z',
          fill: '#1a3320'
        }));
      });
    }

    else if (scene === 'snow') {
      // Falling flakes
      const flakes = [
        [0.16, 0.14], [0.38, 0.2], [0.58, 0.12], [0.82, 0.18],
        [0.22, 0.36], [0.48, 0.32], [0.7, 0.38], [0.92, 0.3]
      ];
      flakes.forEach(function (pt) {
        group.appendChild(mk('circle', {
          cx: w * pt[0], cy: h * pt[1], r: 1.1, fill: '#ffffff'
        }));
      });
      // Snowy back hills (white)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.72) +
           ' Q ' + (w * 0.25) + ' ' + (h * 0.62) +
           ' '  + (w * 0.5)  + ' ' + (h * 0.7) +
           ' Q ' + (w * 0.75) + ' ' + (h * 0.78) +
           ' '  + w + ' ' + (h * 0.66) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#ffffff', opacity: 0.92
      }));
      // Front ridge (cool gray)
      group.appendChild(mk('path', {
        d: 'M 0 ' + h +
           ' L 0 ' + (h * 0.82) +
           ' Q ' + (w * 0.3) + ' ' + (h * 0.78) +
           ' '  + (w * 0.55) + ' ' + (h * 0.84) +
           ' Q ' + (w * 0.8) + ' ' + (h * 0.9) +
           ' '  + w + ' ' + (h * 0.8) +
           ' L ' + w + ' ' + h + ' Z',
        fill: '#c8d4dc'
      }));
    }
  }

  // Isometric projection constants (how the floor tilts back)
  const ISO_DX = 0.55;  // horizontal shift per unit of depth
  const ISO_DY = 0.32;  // vertical shift per unit of depth

  function renderRoom(matchedBtu) {
    const svg = document.getElementById('roomSvg');
    if (!svg) return;
    const v = getFormValues();

    const ceil = ceilingMap[v.ceilingVal] || ceilingMap['1.0'];
    const sunS = sunMap[v.sunVal] || sunMap['1.0'];
    const dims = dimsFromSqft(v.sqft);

    // Scale floor dimensions by √sqft so the room plausibly grows/shrinks
    const scale = Math.sqrt(v.sqft / 400);
    const roomW = Math.max(130, Math.min(240, Math.round(180 * scale)));
    const roomD = Math.max(80,  Math.min(170, Math.round(120 * scale)));
    const wallH = ceil.wallH;

    // Isometric depth offsets
    const dx = roomD * ISO_DX;
    const dy = roomD * ISO_DY;

    // Anchor: bottom-front-left of the floor. Centered horizontally in viewport.
    const viewW = 500;
    const anchorX = Math.round((viewW - roomW - dx) / 2);
    const anchorY = 240;

    // Corner points of the floor quad
    const flA = { x: anchorX,              y: anchorY };       // front-left
    const flB = { x: anchorX + roomW,      y: anchorY };       // front-right
    const flC = { x: anchorX + roomW + dx, y: anchorY - dy };  // back-right
    const flD = { x: anchorX + dx,         y: anchorY - dy };  // back-left
    // Ceiling corners (just wallH above each floor corner)
    const clA = { x: flA.x, y: flA.y - wallH };
    const clD = { x: flD.x, y: flD.y - wallH };
    const clC = { x: flC.x, y: flC.y - wallH };

    // ----- Floor, back wall, left wall -----
    document.getElementById('floorPath').setAttribute('d',
      'M ' + flA.x + ' ' + flA.y +
      ' L ' + flB.x + ' ' + flB.y +
      ' L ' + flC.x + ' ' + flC.y +
      ' L ' + flD.x + ' ' + flD.y + ' Z');

    document.getElementById('backWallPath').setAttribute('d',
      'M ' + flD.x + ' ' + flD.y +
      ' L ' + flC.x + ' ' + flC.y +
      ' L ' + clC.x + ' ' + clC.y +
      ' L ' + clD.x + ' ' + clD.y + ' Z');

    document.getElementById('leftWallPath').setAttribute('d',
      'M ' + flA.x + ' ' + flA.y +
      ' L ' + flD.x + ' ' + flD.y +
      ' L ' + clD.x + ' ' + clD.y +
      ' L ' + clA.x + ' ' + clA.y + ' Z');

    // Floor boards — horizontal lines running into the depth
    const floorLines = document.getElementById('floorLines');
    clearChildren(floorLines);
    for (let t = 0.2; t < 1; t += 0.2) {
      const p1 = { x: flA.x + t * dx, y: flA.y - t * dy };
      const p2 = { x: flB.x + t * dx, y: flB.y - t * dy };
      const line = document.createElementNS(SVG_NS, 'line');
      setAttrs(line, {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: '#8a6340', 'stroke-width': '0.5', opacity: '0.45'
      });
      floorLines.appendChild(line);
    }

    // Dimension label on the floor
    const dimWLbl = document.getElementById('dimWLabel');
    setAttrs(dimWLbl, {
      x: (flA.x + flB.x + flC.x + flD.x) / 4,
      y: (flA.y + flB.y + flC.y + flD.y) / 4 + 4
    });
    dimWLbl.textContent = dims.w + "' × " + dims.l + "'";

    // Window on back wall — right half, centered vertically
    const winW = Math.min(80, roomW * 0.42);
    const winH = Math.min(48, wallH * 0.48);
    const winX = flD.x + roomW - winW - 14;
    const winY = clD.y + (wallH - winH) / 2 + 6;
    const win = document.getElementById('windowGroup');
    win.setAttribute('transform', 'translate(' + winX + ',' + winY + ')');
    const cw = climateWindow[v.climate] || climateWindow.mixed;
    setAttrs(win.querySelector('.win-frame'), {
      width: winW, height: winH, fill: cw.fill
    });
    // Climate scene (palm/cactus/tree/pine/snowpine) behind the mullions
    drawWindowScene(document.getElementById('windowScene'), winW, winH, cw.scene);
    // Mullions (drawn on top by being later in DOM)
    setAttrs(win.querySelector('.win-vert'),  { x1: winW / 2, x2: winW / 2, y1: 0, y2: winH });
    setAttrs(win.querySelector('.win-horiz'), { x1: 0, x2: winW, y1: winH / 2, y2: winH / 2 });

    // Door on left wall — near back, full-height parallelogram projected along the wall
    // Parametric position along left wall floor: t = 0.48 (door starts back-center)
    const tDoor = 0.48;
    const doorWunits = 22;                 // door width "along" wall in px
    const doorH = Math.min(62, wallH * 0.72);
    const wallDir = { x: dx / roomD, y: -dy / roomD };  // unit vector along left wall floor edge
    const dfX = flA.x + tDoor * dx;        // door front-bottom x
    const dfY = flA.y - tDoor * dy;        // door front-bottom y
    const dbX = dfX + doorWunits * wallDir.x;
    const dbY = dfY + doorWunits * wallDir.y;
    document.getElementById('doorPath').setAttribute('d',
      'M ' + dfX + ' ' + dfY +
      ' L ' + dbX + ' ' + dbY +
      ' L ' + dbX + ' ' + (dbY - doorH) +
      ' L ' + dfX + ' ' + (dfY - doorH) + ' Z');
    // knob
    const knobX = dfX + 4 * wallDir.x;
    const knobY = dfY + 4 * wallDir.y - doorH / 2;
    setAttrs(document.getElementById('doorKnob'), { cx: knobX, cy: knobY });

    // Sofa — on the floor, slight iso perspective, center-ish
    const sofa = document.getElementById('sofa');
    clearChildren(sofa);
    const sofaWidth = Math.min(roomW * 0.45, 96);
    const sofaDepth = Math.min(roomD * 0.35, 40);
    // Sofa front-left on the floor, centered-ish
    const sxFL = flA.x + (roomW - sofaWidth) / 2;
    const syFL = flA.y - 6;
    const sxFR = sxFL + sofaWidth;
    const syFR = syFL;
    const sxBR = sxFR + sofaDepth * ISO_DX;
    const syBR = syFR - sofaDepth * ISO_DY;
    const sxBL = sxFL + sofaDepth * ISO_DX;
    const syBL = syFL - sofaDepth * ISO_DY;
    const sofaHeight = 18;
    const sofaBackHeight = 12;
    // Base (floor footprint)
    const base = document.createElementNS(SVG_NS, 'path');
    setAttrs(base, {
      d: 'M ' + sxFL + ' ' + syFL + ' L ' + sxFR + ' ' + syFR +
         ' L ' + sxBR + ' ' + syBR + ' L ' + sxBL + ' ' + syBL + ' Z',
      fill: '#1a1814', opacity: '0.12'
    });
    sofa.appendChild(base);
    // Front face (seat)
    const front = document.createElementNS(SVG_NS, 'path');
    setAttrs(front, {
      d: 'M ' + sxFL + ' ' + syFL + ' L ' + sxFR + ' ' + syFR +
         ' L ' + sxFR + ' ' + (syFR - sofaHeight) + ' L ' + sxFL + ' ' + (syFL - sofaHeight) + ' Z',
      fill: '#234a5c', stroke: '#1a1814', 'stroke-width': '0.8'
    });
    sofa.appendChild(front);
    // Right side
    const right = document.createElementNS(SVG_NS, 'path');
    setAttrs(right, {
      d: 'M ' + sxFR + ' ' + syFR + ' L ' + sxBR + ' ' + syBR +
         ' L ' + sxBR + ' ' + (syBR - sofaHeight) + ' L ' + sxFR + ' ' + (syFR - sofaHeight) + ' Z',
      fill: '#1a3342', stroke: '#1a1814', 'stroke-width': '0.8'
    });
    sofa.appendChild(right);
    // Top (seat cushion)
    const top = document.createElementNS(SVG_NS, 'path');
    setAttrs(top, {
      d: 'M ' + sxFL + ' ' + (syFL - sofaHeight) + ' L ' + sxFR + ' ' + (syFR - sofaHeight) +
         ' L ' + sxBR + ' ' + (syBR - sofaHeight) + ' L ' + sxBL + ' ' + (syBL - sofaHeight) + ' Z',
      fill: '#2c5a70', stroke: '#1a1814', 'stroke-width': '0.8'
    });
    sofa.appendChild(top);
    // Back cushion (raised back wall of the sofa)
    const backRest = document.createElementNS(SVG_NS, 'path');
    setAttrs(backRest, {
      d: 'M ' + sxBL + ' ' + (syBL - sofaHeight) + ' L ' + sxBR + ' ' + (syBR - sofaHeight) +
         ' L ' + sxBR + ' ' + (syBR - sofaHeight - sofaBackHeight) + ' L ' + sxBL + ' ' + (syBL - sofaHeight - sofaBackHeight) + ' Z',
      fill: '#1a3342', stroke: '#1a1814', 'stroke-width': '0.8'
    });
    sofa.appendChild(backRest);

    // Mini split — on back wall, centered horizontally, high
    const msW = 50, msH = 11;
    const msX = flD.x + (roomW - msW) / 2;
    const msY = clD.y + 12;
    document.getElementById('minisplit').setAttribute('transform', 'translate(' + msX + ',' + msY + ')');

    // BTU callout — floating label on back wall next to the mini split
    const btu = document.getElementById('btuLabel');
    setAttrs(btu, {
      x: msX + msW + 6,
      y: msY + 9
    });
    if (typeof matchedBtu === 'number') {
      btu.textContent = '← ' + (matchedBtu / 1000) + 'k BTU';
      btu.setAttribute('fill', '#b44019');
      btu.dataset.calculated = '1';
    } else if (!btu.dataset.calculated) {
      btu.textContent = '← size me';
      btu.setAttribute('fill', '#6e6859');
    }

    // Sun — top right, outside the room
    const sunCircle = document.getElementById('sunCircle');
    sunCircle.setAttribute('r', sunS.r);
    sunCircle.setAttribute('opacity', sunS.opacity);

    const sunRays = document.getElementById('sunRays');
    clearChildren(sunRays);
    const sunCx = 455, sunCy = 50;
    sunCircle.setAttribute('cx', sunCx);
    sunCircle.setAttribute('cy', sunCy);
    for (let i = 0; i < sunS.rays; i++) {
      const angle = (i / sunS.rays) * Math.PI * 2;
      const r1 = sunS.r + 3, r2 = sunS.r + 9;
      const line = document.createElementNS(SVG_NS, 'line');
      setAttrs(line, {
        x1: sunCx + Math.cos(angle) * r1,
        y1: sunCy + Math.sin(angle) * r1,
        x2: sunCx + Math.cos(angle) * r2,
        y2: sunCy + Math.sin(angle) * r2,
        stroke: '#b44019', 'stroke-width': '0.9',
        'stroke-linecap': 'round', opacity: sunS.opacity
      });
      sunRays.appendChild(line);
    }

    // Ceiling-height dimension line — outside the room on the right
    const dimX = flC.x + 16;
    setAttrs(document.getElementById('dimH'),
      { x1: dimX, y1: clC.y, x2: dimX, y2: flC.y });
    setAttrs(document.getElementById('dimHTop'),
      { x1: dimX - 4, y1: clC.y, x2: dimX + 4, y2: clC.y });
    setAttrs(document.getElementById('dimHBot'),
      { x1: dimX - 4, y1: flC.y, x2: dimX + 4, y2: flC.y });
    const dimHLabel = document.getElementById('dimHLabel');
    setAttrs(dimHLabel, {
      x: dimX + 7,
      y: (clC.y + flC.y) / 2 + 4
    });
    dimHLabel.textContent = ceil.short;

    // Figure caption (aria-live)
    const cap = document.getElementById('roomCaption');
    if (cap) {
      cap.innerHTML = '<strong>Your room</strong> ' +
                      v.sqft.toLocaleString() + ' sq ft · ' +
                      ceil.label + ' ceiling · ' +
                      sunS.label + '.';
    }
  }

  // ----- Public: calculate and update result block -----
  window.calculateBtu = function (opts) {
    opts = opts || {};
    const v = getFormValues();
    const r = computeBtu(v);
    const { cooling, heating, matched } = r;

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
    const allIds = ['sqft', 'ceiling', 'climate', 'insulation', 'sun', 'roomtype'];
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
