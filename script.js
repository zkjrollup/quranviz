// Standard ayah counts per surah, 1..114
const SURAH_LENGTHS = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

const VIDEOS = [
  { title: "Video title here", youtubeId: "rOUrnJ2Wk_0" },
  ]
  
  function renderVideos(){
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = '';
    VIDEOS.forEach(v => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.innerHTML = `
      <div class="video-frame-wrap">
        <iframe src="https://www.youtube.com/embed/${v.youtubeId}"
        title="${v.title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>
        </div>
        <div class="video-title">${v.title}</div>
        `;
      grid.appendChild(card);
    });
  }
// build once, alongside SURAH_LENGTHS
const SURAH_STARTS = [];
(() => {
  let acc = 0;
  for (const len of SURAH_LENGTHS) { SURAH_STARTS.push(acc); acc += len; }
})();

function xScale(p){
  // p = global verse index (0-based) across all 6,236 verses — same input as before
  let i = SURAH_STARTS.length - 1;
  while (i > 0 && p < SURAH_STARTS[i]) i--;   // find which surah p falls in
  const localP = p - SURAH_STARTS[i];         // 0-based ayah position within that surah
  const barWidth = W / SURAH_LENGTHS.length;   // equal width per surah, 114 total
  return i * barWidth + (localP / SURAH_LENGTHS[i]) * barWidth;
}

const SURAH_NAMES = [
  "Al-Fatihah","Al-Baqarah","Aal-E-Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus",
  "Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha",
  "Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum",
  "Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir",
  "Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf",
  "Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahanah",
  "As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij",
  "Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa",
  "At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad",
  "Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat",
  "Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr",
  "Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"
];
const CUM = [0];
for(let i=0;i<SURAH_LENGTHS.length;i++){ CUM.push(CUM[i] + SURAH_LENGTHS[i]); }
const TOTAL = CUM[CUM.length-1];

function pos(surah, ayah){ return CUM[surah-1] + ayah; }

// Clusters: each has a topic, a color, and a list of verse groups to fully cross-connect
let CLUSTERS = [];

fetch('data/topics.json')
  .then(res => res.json())
  .then(topics => {
    CLUSTERS = topics
      .filter(t => t.arc_verses)
      .map(t => ({
        id: t.cluster_id,
        slug: t.slug,
        label: t.title,
        color: t.arc_color,
        verses: t.arc_verses,
      }));
    init();
  });

// Build pairwise arcs within each cluster
let ARCS = [];
function buildArcs(){
  ARCS = [];
  CLUSTERS.forEach(cl => {
    for(let i=0;i<cl.verses.length;i++){
      for(let j=i+1;j<cl.verses.length;j++){
        const a = cl.verses[i], b = cl.verses[j];
        ARCS.push({
          clusterId: cl.id, slug: cl.slug, label: cl.label, color: cl.color,
          x1: pos(a[0],a[1]), x2: pos(b[0],b[1]),
          refA: `${a[0]}:${a[1]}`, refB: `${b[0]}:${b[1]}`,
          noteA: a[2], noteB: b[2],
        });
      }
    }
  });
}

// ---- Render ----
const svg = document.getElementById('arcCanvas');
const W = 1400, H = 560;
svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
svg.setAttribute('preserveAspectRatio', 'none');



let colorMode = 'crimson';
let activeCluster = 'all';
let lastTappedArc = null;


// Arc path: SVG arc command, with radius = half the horizontal distance
function arcPath(x1, x2){
  const y0 = H - 10;
  const dx = Math.abs(x2 - x1);
  const r = dx / 2;
  const sweep = x2 > x1 ? 1 : 0;
  return `M ${x1},${y0} A ${r},${r} 0 0 ${sweep} ${x2},${y0}`;
}

function renderArcs(){
  svg.innerHTML = '';
  ARCS.forEach((arc, idx) => {
    const d = arcPath(xScale(arc.x1), xScale(arc.x2));

    // Invisible wide hit-area — this is what actually catches the mouse
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '14');   // 👈 adjust this to widen/narrow the "magnetic" zone
    hitPath.setAttribute('fill', 'none');
    hitPath.style.cursor = 'pointer';

    // Visible thin line — purely visual, no longer needs its own events
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'arc');
    path.style.pointerEvents = 'none';   // 👈 lets the mouse pass through to hitPath underneath

    const isActiveCluster = activeCluster !== 'all' && arc.clusterId === activeCluster;
    const stroke = isActiveCluster
      ? arc.color
      : (colorMode === 'rainbow' ? arc.color : '#FF3B54');
    path.setAttribute('stroke', stroke);
    path.style.color = stroke;

    if(isActiveCluster){
      path.classList.add('emphasized');
      path.style.opacity = 0.85;
    } else if(activeCluster !== 'all'){
      path.classList.add('dim');
      path.style.opacity = 0.06;
    } else {
      path.style.opacity = colorMode === 'rainbow' ? 0.5 : 0.4;
    }

    // events now live on hitPath, but they still control the visible `path`
    hitPath.addEventListener('mouseenter', () => {
      path.classList.add('hover');
      path.setAttribute('stroke', '#FFFFFF');
      showTooltip(arc);
    });
    hitPath.addEventListener('mouseleave', () => {
      path.classList.remove('hover');
      path.setAttribute('stroke', stroke);
      hideTooltip();
    });
    hitPath.addEventListener('click', () => {
      if(arc.slug){
        window.location.href = `pages/${arc.slug}.html`;
      }
    });

    svg.appendChild(path);
    svg.appendChild(hitPath);
  });
}

function showTooltip(arc){
  const panel = document.getElementById('tooltipPanel');
  const isTouch = window.matchMedia('(hover: none)').matches;
  const hint = isTouch && arc.slug
    ? `<div class="tap-hint">Tap again to read more &rarr;</div>`
    : '';
  panel.innerHTML = `
    <div class="q">${arc.label}</div>
    <div class="refs">Surah ${arc.refA} (${arc.noteA}) &nbsp;↔&nbsp; Surah ${arc.refB} (${arc.noteB})</div>
    ${hint}
  `;
}
function hideTooltip(){
  document.getElementById('tooltipPanel').innerHTML = `<div class="placeholder">Hover over an arc to see what it connects.</div>`;
}

// waveform: verse count per surah as bar heights
function renderWaveform(){
  const wf = document.getElementById('waveform');
  wf.innerHTML = '';
  const max = Math.max(...SURAH_LENGTHS);
  SURAH_LENGTHS.forEach((len, i) => {
    const surahNum = i + 1;
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    bar.dataset.surah = surahNum;

    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.height = (Math.sqrt(len) / Math.sqrt(max) * 100) + '%';
    bar.appendChild(fill);

  bar.addEventListener('mouseenter', () => {
  const panel = document.getElementById('tooltipPanel');
  panel.innerHTML = `
    <div class="q">Surah ${surahNum} — ${SURAH_NAMES[i]}</div>
    <div class="refs">${len} ayah${len === 1 ? '' : 's'}</div>
  `;
});
    bar.addEventListener('mouseleave', () => {
      hideTooltip();
    });
    bar.addEventListener('click', () => {
      window.open(`https://quran.com/${surahNum}`, '_blank', 'noopener');
    });

    wf.appendChild(bar);
  });
}
// highlights the relevant bars in the waveform for the currently active cluster
function highlightWaveform(clusterId){
  const bars = document.querySelectorAll('.wave-bar');
  if(clusterId === 'all'){
    bars.forEach(b => {
      b.classList.remove('active');
      b.querySelector('.fill').style.background = '';
    });
    return;
  }
  const cluster = CLUSTERS.find(c => c.id === clusterId);
  const surahs = new Set(cluster.verses.map(v => v[0]));
  bars.forEach(b => {
    const isHit = surahs.has(parseInt(b.dataset.surah, 10));
    b.classList.toggle('active', isHit);
    b.querySelector('.fill').style.background = isHit
      ? `linear-gradient(180deg, ${cluster.color}, ${cluster.color}33)`
      : '';
  });
}

// legend
function renderLegend(){
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  CLUSTERS.forEach(cl => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${cl.color}"></span>${cl.label}`;
    legend.appendChild(item);
  });
}

// filter dropdown
function populateFilter(){
  const optionsWrap = document.getElementById('clusterOptions');
  const trigger = document.getElementById('clusterTrigger');
  const triggerLabel = document.getElementById('clusterTriggerLabel');
  const triggerDot = document.getElementById('clusterTriggerDot');

  const allOptions = [{ id: 'all', label: 'All', color: 'var(--ink-soft)' }, ...CLUSTERS];

  allOptions.forEach(cl => {
    const opt = document.createElement('div');
    opt.className = 'custom-select-option' + (cl.id === 'all' ? ' selected' : '');
    opt.innerHTML = `<span class="dot" style="background:${cl.color}"></span>${cl.label}`;
    opt.addEventListener('click', () => {
      activeCluster = cl.id === 'all' ? 'all' : cl.id;
      triggerLabel.textContent = cl.label;
      triggerDot.style.background = cl.color;
      optionsWrap.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      optionsWrap.classList.remove('open');
      renderArcs();
      highlightWaveform(activeCluster);
    });
    optionsWrap.appendChild(opt);
  });

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    optionsWrap.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if(!document.getElementById('clusterSelect').contains(e.target)){
      optionsWrap.classList.remove('open');
    }
  });

const colorModeOptionsWrap = document.getElementById('colorModeOptions');
const colorModeTrigger = document.getElementById('colorModeTrigger');
const colorModeTriggerLabel = document.getElementById('colorModeTriggerLabel');

colorModeOptionsWrap.querySelectorAll('.custom-select-option').forEach(opt => {
  opt.addEventListener('click', () => {
    colorMode = opt.dataset.value;
    colorModeTriggerLabel.textContent = opt.textContent.trim();
    colorModeOptionsWrap.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    colorModeOptionsWrap.classList.remove('open');
    renderArcs();
  });
});

colorModeTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  colorModeOptionsWrap.classList.toggle('open');
});
document.addEventListener('click', (e) => {
  if(!document.getElementById('colorModeSelect').contains(e.target)){
    colorModeOptionsWrap.classList.remove('open');
  }
});
}

document.getElementById('seeList').addEventListener('click', () => {
  const list = CLUSTERS.map(cl => `• ${cl.label} — ${cl.verses.map(v=>`${v[0]}:${v[1]}`).join(', ')}`).join('\n');
  alert('Contradiction clusters:\n\n' + list);
});

function init(){
  buildArcs();
  populateFilter();
  renderLegend();
  renderWaveform();
  renderArcs();
  window.addEventListener('resize', renderArcs);
  renderCategorySections();
  renderVideos();
}

// ---------------------------------------------------------------
// Category sections: bar chart (verse-count per surah, highlighted
// where a flagged item lives) + quote cards below, styled like the
// reference "Scientific Absurdities & Historical Inaccuracies" block.
// Reads directly from data/topics.json — the single source of truth
// shared with generate.py, so there's no separate hardcoded copy
// that can silently drift out of sync.
// ---------------------------------------------------------------

function parseAllVerses(ref){
  return [...ref.matchAll(/(\d+):(\d+)/g)].map(m => ({
    surah: parseInt(m[1], 10),
    ayah: parseInt(m[2], 10),
  }));
}

function lightenColor(hex, amount){
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round((255 - (num >> 16)) * amount);
  let g = ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * amount);
  let b = (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * amount);
  r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
  return `rgb(${r}, ${g}, ${b})`;
}

function renderCategorySections(){
  const root = document.getElementById('categorySections');
  root.innerHTML = '';

  fetch('data/topics.json')
    .then(res => res.json())
    .then(topics => {
      const byCategory = {};
      topics.forEach(t => {
        if(!byCategory[t.category]){
          byCategory[t.category] = { label: t.category_label, color: t.color, items: [] };
        }
        byCategory[t.category].items.push(t);
      });

      const CATEGORY_ORDER = [
        'contradiction',
        'absurd',
        'cruel',
        'women',
        'intol',
        'good',
        'anachronism',
        'science_claims',
        'textual_history',
      ];

      const orderedCategories = CATEGORY_ORDER
        .filter(key => byCategory[key])
        .map(key => byCategory[key]);

      orderedCategories.forEach(cat => {
        const allVerses = cat.items.flatMap(it => parseAllVerses(it.ref));
const highlighted = new Set(allVerses.map(v => v.surah));
const firstAyahForSurah = {};
allVerses.forEach(v => { if(!(v.surah in firstAyahForSurah)) firstAyahForSurah[v.surah] = v.ayah; });

        const section = document.createElement('div');
        section.className = 'category-section';
        section.style.setProperty('--cat-color', cat.color);

        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `<h2>${cat.label}</h2>`;
        section.appendChild(header);

        const isContradiction = cat.color.toUpperCase() === '#6E00B3';

        const chart = document.createElement('div');
        chart.className = 'cat-chart';
        const max = Math.max(...SURAH_LENGTHS);
        SURAH_LENGTHS.forEach((len, i) => {
          const surahNum = i + 1;
          const isHit = highlighted.has(surahNum);

          const bar = document.createElement('a');
          bar.className = 'cat-bar' + (isHit ? ' hit' : '');
          bar.href = `https://quran.com/${surahNum}${firstAyahForSurah[surahNum] ? '/' + firstAyahForSurah[surahNum] : ''}`;
          bar.target = '_blank';
          bar.rel = 'noopener';
          bar.title = `Surah ${surahNum} — ${len} verses`;

          bar.style.flex = 'none';
          bar.style.width = (len / TOTAL * 100) + '%';
          bar.style.height = Math.max(2, (len / max) * 100) + '%';

          const baseColor = isContradiction
            ? (isHit ? '#B069DB' : cat.color)
            : (isHit ? lightenColor(cat.color, 0.35) : cat.color);

          bar.style.background = baseColor;
          bar.style.opacity = '1';
          bar.dataset.baseColor = baseColor;

          if(isContradiction){
            bar.addEventListener('mouseenter', () => { bar.style.background = '#9D00FF'; });
            bar.addEventListener('mouseleave', () => { bar.style.background = bar.dataset.baseColor; });
          }

          if(len >= 40){
            const lbl = document.createElement('span');
            lbl.className = 'num-label';
            lbl.textContent = len;
            bar.appendChild(lbl);
          }

          chart.appendChild(bar);
        });
        section.appendChild(chart);

        const cards = document.createElement('div');
        cards.className = 'cat-cards';
        cat.items.forEach(it => {
          const card = document.createElement('div');
          card.className = 'quote-card';
          const detailHref = `pages/${it.slug}.html`;
          card.innerHTML = `
            <span class="quote-mark">&ldquo;</span>
            <p class="quote-text"><a class="quote-title-link" href="${detailHref}">${it.title}</a></p>
            <p class="quote-note">${it.note}</p>
            <div class="quote-ref">
              <a href="${detailHref}" class="detail-link">Read more</a>
              &middot;
              <a href="${it.link}" target="_blank" rel="noopener">${it.ref}</a>
            </div>
          `;
          cards.appendChild(card);
        });
        section.appendChild(cards);

        root.appendChild(section);
      });
    });
}
