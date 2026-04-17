const PAIRS = [
  { fgKey: 'text', bgKey: 'bg', fgLabel: 'text', bgLabel: 'bg' },
  { fgKey: 'text', bgKey: 'bgAlt', fgLabel: 'text', bgLabel: 'bgAlt' },
  { fgKey: 'textMuted', bgKey: 'bg', fgLabel: 'textMuted', bgLabel: 'bg' },
  { fgKey: 'textMuted', bgKey: 'bgAlt', fgLabel: 'textMuted', bgLabel: 'bgAlt' },
  { fgKey: 'accent', bgKey: 'bg', fgLabel: 'accent', bgLabel: 'bg' },
  { fgKey: 'accent', bgKey: 'bgAlt', fgLabel: 'accent', bgLabel: 'bgAlt' },
  { fgKey: 'bg', bgKey: 'accent', fgLabel: 'bg', bgLabel: 'accent' },
  { fgKey: 'bgAlt', bgKey: 'accent', fgLabel: 'bgAlt', bgLabel: 'accent' },
  { fgKey: 'bg', bgKey: 'text', fgLabel: 'bg', bgLabel: 'text' }
];

const LEVELS = [
  {
    label: 'AA normal',
    sc: 'SC 1.4.3 · Contrast (Minimum)',
    threshold: 4.5,
    desc: 'Body text under 18pt regular (or 14pt bold). The baseline standard for readable paragraph text.'
  },
  {
    label: 'AA large',
    sc: 'SC 1.4.3 · Contrast (Minimum)',
    threshold: 3,
    desc: 'Large text at 18pt+ regular or 14pt+ bold. Headings and display type get a more lenient ratio.'
  },
  {
    label: 'AA UI',
    sc: 'SC 1.4.11 · Non-text Contrast',
    threshold: 3,
    desc: 'Buttons, inputs, icons, and focus indicators against their adjacent colors. Does not apply to text.'
  },
  {
    label: 'AAA normal',
    sc: 'SC 1.4.6 · Contrast (Enhanced)',
    threshold: 7,
    desc: 'Stricter standard for body text. Best for low-vision users and high-readability contexts.'
  },
  {
    label: 'AAA large',
    sc: 'SC 1.4.6 · Contrast (Enhanced)',
    threshold: 4.5,
    desc: 'Stricter standard for large text. The enhanced bar here matches the AA normal bar for body text.'
  }
];

const SLOTS = [
  { key: 'bg', label: 'bg' },
  { key: 'bgAlt', label: 'bgAlt' },
  { key: 'text', label: 'text' },
  { key: 'textMuted', label: 'textMuted' },
  { key: 'accent', label: 'accent' }
];

const STORAGE_KEY = 'wcag-palettes';

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const { palettes: saved, nextId: savedId } = JSON.parse(raw);

      if (Array.isArray(saved) && saved.length > 0) {
        return { palettes: saved, nextId: savedId ?? saved.reduce((m, p) => Math.max(m, p.id), 0) + 1 };
      }
    }
  } catch (_) {}

  return null;
};

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ palettes, nextId }));
  } catch (_) {}
};

const stored = loadFromStorage();

let palettes = stored?.palettes ?? [
  {
    id: 1,
    name: 'New palette',
    colors: { bg: '#FFFFFF', bgAlt: '#F3F4F6', text: '#111827', textMuted: '#6B7280', accent: '#2563EB' }
  }
];

let nextId = stored?.nextId ?? 2;

const parseColor = str => {
  if (!str) {
    return null;
  }

  str = str.trim();

  if (str.startsWith('#')) {
    let h = str.slice(1);

    if (h.length === 3) {
      h = h
        .split('')
        .map(c => c + c)
        .join('');
    }

    if (h.length !== 6) {
      return null;
    }

    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null;
    }

    return { r, g, b, hex: '#' + h.toUpperCase() };
  }

  const m = str.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);

  if (m) {
    const H = parseFloat(m[1]);
    const S = parseFloat(m[2]) / 100;
    const L = parseFloat(m[3]) / 100;

    const C = (1 - Math.abs(2 * L - 1)) * S;
    const X = C * (1 - Math.abs(((H / 60) % 2) - 1));
    const mv = L - C / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (H < 60) {
      r = C;
      g = X;
    } else if (H < 120) {
      r = X;
      g = C;
    } else if (H < 180) {
      g = C;
      b = X;
    } else if (H < 240) {
      g = X;
      b = C;
    } else if (H < 300) {
      r = X;
      b = C;
    } else {
      r = C;
      b = X;
    }

    r += mv;
    g += mv;
    b += mv;

    const toH = v => {
      return Math.min(255, Math.round(v * 255))
        .toString(16)
        .padStart(2, '0')
        .toUpperCase();
    };

    return { r, g, b, hex: '#' + toH(r) + toH(g) + toH(b) };
  }

  return null;
};

const lin = c => {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const lum = c => {
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
};

const ratio = (fg, bg) => {
  const L1 = lum(fg);
  const L2 = lum(bg);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);

  return (hi + 0.05) / (lo + 0.05);
};

const tableRow = (pair, parsed) => {
  const fg = parsed[pair.fgKey];
  const bg = parsed[pair.bgKey];

  const fgHex = fg ? fg.hex : '#888888';
  const bgHex = bg ? bg.hex : '#CCCCCC';

  const r = fg && bg ? ratio(fg, bg) : null;

  const ratioStr = r ? r.toFixed(2) + ':1' : '—';

  const pills = LEVELS.map(l => {
    const pass = r ? r >= l.threshold : null;
    const cls = pass === null ? 'na' : pass ? 'pass' : 'fail';
    const txt = pass === null ? '—' : pass ? 'Pass' : 'Fail';
    return `<td><div class="pill ${cls}">${txt}</div></td>`;
  }).join('');

  return `
    <tr>
      <td class="pair-td">
        <div class="pair-label">
          <div class="pair-preview" style="background:${bgHex};color:${fgHex}">Aa</div>
          <span class="pair-text">${pair.fgLabel} on ${pair.bgLabel}</span>
        </div>
      </td>
      <td class="ratio-cell">${ratioStr}</td>
      ${pills}
    </tr>
  `;
};

const colorSlotHtml = (p, s) => {
  const col = parseColor(p.colors[s.key]);
  const hex = col ? col.hex : '#888888';
  const invalid = p.colors[s.key] && !col ? 'invalid' : '';

  return `
    <div class="color-slot">
      <div class="slot-label">${s.label}</div>
      <div class="swatch-row">
        <div class="swatch-btn" style="background:${hex}">
          <input type="color" value="${hex}" oninput="onPick(${p.id},'${s.key}',this.value)">
        </div>
        <span class="swatch-hex" id="sh-${p.id}-${s.key}">${hex}</span>
      </div>
      <input
        class="hex-input ${invalid}"
        id="ci-${p.id}-${s.key}"
        type="text"
        value="${p.colors[s.key]}"
        placeholder="#000000"
        oninput="onText(${p.id},'${s.key}',this.value)"
      >
    </div>
  `;
};

const paletteHtml = p => {
  const parsed = {};

  SLOTS.forEach(s => {
    parsed[s.key] = parseColor(p.colors[s.key]);
  });

  return `
    <div class="palette-card" id="palette-${p.id}">
      <div class="palette-header">
        <input class="palette-name-input" type="text" value="${p.name}" placeholder="Palette name…" oninput="onName(${p.id},this.value)">
        <button class="remove-palette-btn" onclick="removePalette(${p.id})">Remove</button>
      </div>
      <div class="color-inputs-row">${SLOTS.map(s => colorSlotHtml(p, s)).join('')}</div>
      <div class="results-area">
        <table class="results-table">
          <thead>
            <tr>
              <th class="pair-th">Pair</th>
              <th>Ratio</th>
              ${LEVELS.map(
                l => `
                  <th>
                    <div class='th-inner'>
                      <span>${l.label}</span>
                      <span class='tooltip-wrap'>
                        <i class='ph ph-info tooltip-icon'></i>
                        <div class='tooltip-box'>
                          <div class='tooltip-sc'>${l.sc}</div>
                          <div class='tooltip-desc'>${l.desc}</div>
                        </div>
                      </span>
                    </div>
                  </th>
                `
              ).join('')}
            </tr>
          </thead>
          <tbody id="tbody-${p.id}">${PAIRS.map(pair => tableRow(pair, parsed)).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
};

const render = () => {
  document.getElementById('palette-list').innerHTML = palettes.map(paletteHtml).join('');

  const n = palettes.length;

  document.getElementById('count-label').textContent = n + (n === 1 ? ' palette' : ' palettes');
};

const refreshPalette = id => {
  const p = palettes.find(x => x.id === id);

  if (!p) {
    return;
  }

  const parsed = {};

  SLOTS.forEach(s => {
    parsed[s.key] = parseColor(p.colors[s.key]);
  });

  SLOTS.forEach(s => {
    const col = parseColor(p.colors[s.key]);
    const hex = col ? col.hex : '#888888';

    const btn = document
      .querySelector(`#palette-${id} #ci-${id}-${s.key}`)
      ?.closest('.color-slot')
      ?.querySelector('.swatch-btn');

    if (btn) {
      btn.style.background = hex;
      const pick = btn.querySelector('input[type=color]');
      if (pick && col) pick.value = col.hex;
    }

    const sh = document.getElementById(`sh-${id}-${s.key}`);

    if (sh) {
      sh.textContent = hex;
      sh.style.color = col ? 'var(--text-muted)' : 'var(--fail-text)';
    }

    const inp = document.getElementById(`ci-${id}-${s.key}`);

    if (inp) {
      inp.classList.toggle('invalid', !!(p.colors[s.key] && !col));
    }
  });

  const tbody = document.getElementById(`tbody-${id}`);

  if (tbody) {
    tbody.innerHTML = PAIRS.map(pair => tableRow(pair, parsed)).join('');
  }
};

const onText = (id, key, val) => {
  const p = palettes.find(x => x.id === id);

  if (p) {
    p.colors[key] = val;
    refreshPalette(id);
    saveToStorage();
  }
};

const onPick = (id, key, hex) => {
  const p = palettes.find(x => x.id === id);

  if (!p) {
    return;
  }

  p.colors[key] = hex;

  const inp = document.getElementById(`ci-${id}-${key}`);

  if (inp) {
    inp.value = hex;
  }

  refreshPalette(id);
  saveToStorage();
};

const onName = (id, val) => {
  const p = palettes.find(x => x.id === id);

  if (p) {
    p.name = val;
    saveToStorage();
  }
};

const addPalette = () => {
  palettes.push({
    id: nextId++,
    name: 'New palette',
    colors: { bg: '#FFFFFF', bgAlt: '#F3F4F6', text: '#111827', textMuted: '#6B7280', accent: '#2563EB' }
  });

  saveToStorage();
  render();

  const el = document.getElementById(`palette-${nextId - 1}`);

  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

const removePalette = id => {
  if (palettes.length === 1) {
    return;
  }

  const el = document.getElementById(`palette-${id}`);

  if (el) {
    el.style.transition = 'opacity 0.15s,transform 0.15s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-4px)';

    setTimeout(() => {
      palettes = palettes.filter(x => x.id !== id);
      saveToStorage();
      render();
    }, 150);
  }
};

render();

const overlay = document.getElementById('screen-size-overlay');
const widthEl = document.getElementById('current-width');

const check = () => {
  const w = window.innerWidth;
  widthEl.textContent = w;
  overlay.classList.toggle('visible', w < 1100);
};

check();

window.addEventListener('resize', check);
