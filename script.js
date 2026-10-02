/* =============================================
   SALES DASHBOARD ANALYSIS — MAIN SCRIPT
   Premium Analytics Dashboard
   ============================================= */

'use strict';

// =============================================
// DEMO DATA — 100 Realistic Transactions
// =============================================
const CUSTOMERS = [
  'Arjun Sharma','Priya Patel','Rahul Singh','Anita Verma','Rohit Mehta',
  'Sneha Reddy','Vikram Joshi','Kavita Nair','Suresh Kumar','Deepa Iyer',
  'Manish Gupta','Pooja Mishra','Aakash Pillai','Neha Jain','Kiran Das',
  'Ravi Bose','Sunita Rao','Ajay Chauhan','Meera Saxena','Sunil Patil',
  'Divya Choudhary','Shyam Tiwari','Rekha Agarwal','Harish Nayak','Ananya Roy',
  'Bharat Desai','Lakshmi Menon','Girish Bhatt','Swati Thakur','Nandan Murthy'
];
const PRODUCTS = [
  { name:'Premium Laptop',      category:'Electronics', basePrice:82000, baseCost:55000 },
  { name:'Smartphone Pro',      category:'Electronics', basePrice:45000, baseCost:28000 },
  { name:'Wireless Headphones', category:'Electronics', basePrice:8500,  baseCost:4200 },
  { name:'Smart Watch',         category:'Electronics', basePrice:12000, baseCost:6500 },
  { name:'Gaming Keyboard',     category:'Electronics', basePrice:4500,  baseCost:2100 },
  { name:'4K Monitor',          category:'Electronics', basePrice:22000, baseCost:14000 },
  { name:'Tablet Pro',          category:'Electronics', basePrice:35000, baseCost:21000 },
  { name:'Bluetooth Speaker',   category:'Electronics', basePrice:3800,  baseCost:1800 },
  { name:'Mechanical Keyboard', category:'Electronics', basePrice:5500,  baseCost:2800 },
  { name:'USB-C Hub',           category:'Electronics', basePrice:2200,  baseCost:900  },
  { name:'Designer Kurti',      category:'Fashion',     basePrice:1800,  baseCost:700  },
  { name:'Denim Jacket',        category:'Fashion',     basePrice:3200,  baseCost:1400 },
  { name:'Running Shoes',       category:'Sports',      basePrice:4500,  baseCost:2200 },
  { name:'Yoga Mat',            category:'Sports',      basePrice:1200,  baseCost:450  },
  { name:'Air Fryer',           category:'Home & Kitchen',basePrice:5500,baseCost:3000 },
  { name:'Instant Pot',         category:'Home & Kitchen',basePrice:7200,baseCost:4000 },
  { name:'Moisturizer SPF 50',  category:'Beauty',      basePrice:850,   baseCost:300  },
  { name:'Vitamin C Serum',     category:'Beauty',      basePrice:1200,  baseCost:400  },
  { name:'Data Structures Book',category:'Books',       basePrice:650,   baseCost:200  },
  { name:'Python Cookbook',     category:'Books',       basePrice:850,   baseCost:280  }
];
const REGIONS  = ['Odisha','Maharashtra','Karnataka','Delhi','Tamil Nadu','Telangana','West Bengal','Gujarat'];
const PAYMENTS = ['UPI','Credit Card','Debit Card','Cash on Delivery','Net Banking','Wallet'];
const STATUSES = ['Completed','Processing','Pending','Cancelled','Returned'];
const STATUS_WEIGHT = [0.60, 0.15, 0.10, 0.08, 0.07];
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* Seeded pseudo-random for deterministic data */
let seed = 42;
function rand(min=0, max=1) {
  seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
  const r = (seed >>> 0) / 0xFFFFFFFF;
  return min + r * (max - min);
}
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr, weightedIdx = null) {
  if (weightedIdx) {
    let r = rand();
    for (let i = 0; i < weightedIdx.length; i++) { r -= weightedIdx[i]; if (r <= 0) return arr[i]; }
    return arr[arr.length - 1];
  }
  return arr[randInt(0, arr.length - 1)];
}

function generateTransactions(count = 120) {
  const txns = [];
  const start = new Date('2025-01-01');
  const end   = new Date('2025-12-31');
  for (let i = 0; i < count; i++) {
    const p    = pick(PRODUCTS);
    const qty  = randInt(1, 5);
    const pvar = 0.85 + rand() * 0.30; // price variation ±15%
    const rev  = Math.round(p.basePrice * qty * pvar);
    const cost = Math.round(p.baseCost  * qty * pvar);
    const d    = new Date(start.getTime() + rand() * (end.getTime() - start.getTime()));
    txns.push({
      id:       `ORD-${10001 + i}`,
      date:     d,
      customer: pick(CUSTOMERS),
      product:  p.name,
      category: p.category,
      region:   pick(REGIONS),
      quantity: qty,
      revenue:  rev,
      cost:     cost,
      profit:   rev - cost,
      payment:  pick(PAYMENTS),
      status:   pick(STATUSES, STATUS_WEIGHT),
      hour:     randInt(8, 22),
      day:      d.getDay()
    });
  }
  return txns;
}

const ALL_TRANSACTIONS = generateTransactions(120);

// =============================================
// STATE
// =============================================
let state = {
  dateRange: 30,
  filteredTx: [...ALL_TRANSACTIONS],
  txPage: 1,
  txPageSize: 10,
  txSortKey: 'date',
  txSortDir: 'desc',
  txSearch: '',
  txFilterCat: '',
  txFilterReg: '',
  txFilterPay: '',
  txFilterStatus: '',
  prodSearch: '',
  prodSortKey: 'revenue',
  prodSortDir: 'desc',
  theme: 'dark',
  charts: {}
};

// =============================================
// UTILITIES
// =============================================
const fmt = {
  currency:  v => '₹' + Number(v).toLocaleString('en-IN'),
  short:     v => v >= 1e5 ? '₹' + (v / 1e5).toFixed(2) + ' L' : '₹' + Number(v).toLocaleString('en-IN'),
  number:    v => Number(v).toLocaleString('en-IN'),
  percent:   v => (Number(v)).toFixed(1) + '%',
  date:      d => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
};

function filterByDateRange(txns, days) {
  if (days >= 365) return txns;
  const cutoff = new Date();
  cutoff.setFullYear(2025); // demo year
  cutoff.setDate(cutoff.getDate() - days);
  const ref = new Date('2025-12-31');
  const from = new Date(ref.getTime() - days * 86400000);
  return txns.filter(t => t.date >= from);
}

function computeKPIs(txns) {
  const completed = txns.filter(t => t.status === 'Completed' || t.status === 'Processing');
  const revenue  = completed.reduce((s, t) => s + t.revenue, 0);
  const cost     = completed.reduce((s, t) => s + t.cost, 0);
  const profit   = completed.reduce((s, t) => s + t.profit, 0);
  const orders   = completed.length;
  const aov      = orders ? revenue / orders : 0;
  const returned = txns.filter(t => t.status === 'Returned').length;
  const returnRate = txns.length ? (returned / txns.length) * 100 : 0;
  const uniqCust = new Set(completed.map(t => t.customer)).size;
  const visitors  = orders > 0 ? Math.round(orders / 0.0768) : 0;
  const convRate  = visitors ? (orders / visitors) * 100 : 0;
  return { revenue, cost, profit, orders, aov, returnRate, uniqCust, convRate, visitors };
}

// =============================================
// ANIMATED BACKGROUND — PARTICLES
// =============================================
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x:    Math.random() * window.innerWidth,
      y:    Math.random() * window.innerHeight,
      r:    Math.random() * 1.5 + 0.3,
      vx:   (Math.random() - 0.5) * 0.3,
      vy:   (Math.random() - 0.5) * 0.3,
      a:    Math.random() * 0.5 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,179,237,${p.a})`;
      ctx.fill();
    });
    // connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(99,179,237,${0.04 * (1 - dist/120)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// =============================================
// KPI COUNTER ANIMATION
// =============================================
function animateCount(el, from, to, duration = 1200, formatter = null) {
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = from + (to - from) * ease;
    el.textContent = formatter ? formatter(val) : Math.round(val).toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// =============================================
// KPI CARDS
// =============================================
const KPI_DEFS = [
  { key:'revenue',   label:'Total Revenue',       icon:'fa-indian-rupee-sign', color:'--accent-blue',   fmt: v => fmt.currency(Math.round(v)) },
  { key:'sales',     label:'Total Sales',          icon:'fa-chart-line',        color:'--accent-cyan',   fmt: v => fmt.short(Math.round(v)) },
  { key:'orders',    label:'Total Orders',         icon:'fa-bag-shopping',      color:'--accent-purple', fmt: v => Number(Math.round(v)).toLocaleString('en-IN') },
  { key:'aov',       label:'Avg Order Value',      icon:'fa-receipt',           color:'--accent-green',  fmt: v => fmt.currency(Math.round(v)) },
  { key:'profit',    label:'Gross Profit',         icon:'fa-circle-dollar-to-slot', color:'--accent-amber', fmt: v => fmt.currency(Math.round(v)) },
  { key:'convRate',  label:'Conversion Rate',      icon:'fa-bullseye',          color:'--accent-pink',   fmt: v => v.toFixed(2) + '%' },
  { key:'uniqCust',  label:'Customer Acquisition', icon:'fa-user-plus',         color:'--accent-blue',   fmt: v => Number(Math.round(v)).toLocaleString('en-IN') },
  { key:'returnRate',label:'Return Rate',          icon:'fa-rotate-left',       color:'--accent-red',    fmt: v => v.toFixed(1) + '%' },
];

const SPARKLINE_DATA = {
  revenue:    [6.8,7.2,8.1,7.5,9.2,10.1,11.4,10.8,12.1,11.5,12.8,12.85],
  sales:      [6.8,7.2,8.1,7.5,9.2,10.1,11.4,10.8,12.1,11.5,12.8,12.85],
  orders:     [280,310,355,330,400,440,500,470,530,505,560,565],
  aov:        [3100,3150,3200,3250,3200,3300,3280,3310,3350,3320,3340,3342],
  profit:     [2.0,2.2,2.5,2.3,2.9,3.2,3.6,3.4,3.8,3.7,4.1,4.26],
  convRate:   [6.5,6.8,7.0,6.9,7.2,7.4,7.6,7.5,7.8,7.7,7.8,7.84],
  uniqCust:   [90,100,112,104,128,138,155,148,165,158,172,175],
  returnRate: [3.8,3.5,3.2,3.4,3.1,3.0,3.2,3.1,2.9,3.1,3.0,3.2],
};
const KPI_CHANGES = {
  revenue:    { pct: 18.4, up: true },
  sales:      { pct: 18.4, up: true },
  orders:     { pct: 12.6, up: true },
  aov:        { pct:  4.8, up: true },
  profit:     { pct: 15.2, up: true },
  convRate:   { pct:  0.7, up: true },
  uniqCust:   { pct: 22.1, up: true },
  returnRate: { pct:  0.3, up: false },
};

function buildSparkline(canvasEl, data, color) {
  const ctx = canvasEl.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, canvasEl.width, 0);
  grad.addColorStop(0, color + '44');
  grad.addColorStop(1, color);
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [{ data, borderColor: grad, borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4 }]
    },
    options: {
      responsive: false, animation: false,
      plugins: { legend:{ display:false }, tooltip:{ enabled:false } },
      scales:  { x:{ display:false }, y:{ display:false } }
    }
  });
}

function renderKPIs(kpis) {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = '';
  const vals = {
    revenue: kpis.revenue, sales: kpis.revenue,
    orders: kpis.orders, aov: kpis.aov,
    profit: kpis.profit, convRate: kpis.convRate,
    uniqCust: kpis.uniqCust, returnRate: kpis.returnRate,
  };
  KPI_DEFS.forEach((def, i) => {
    const ch = KPI_CHANGES[def.key];
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.style.animationDelay = (i * 0.06) + 's';
    const colorVal = getComputedStyle(document.documentElement).getPropertyValue(def.color).trim();

    card.innerHTML = `
      <div class="kpi-glow" style="background:var(${def.color})"></div>
      <div class="kpi-card-top">
        <div class="kpi-icon-wrap" style="background:var(${def.color},0.12);border:1px solid var(${def.color},0.25)">
          <i class="fa-solid ${def.icon}" style="color:var(${def.color})"></i>
        </div>
        <div class="kpi-sparkline-wrap">
          <canvas class="kpi-spark" width="80" height="32"></canvas>
        </div>
      </div>
      <div class="kpi-label">${def.label}</div>
      <div class="kpi-value" id="kpi-val-${def.key}">₹0</div>
      <span class="kpi-badge ${ch.up ? 'up' : 'down'}">
        <i class="fa-solid fa-arrow-${ch.up?'up':'down'}"></i>
        ${ch.pct}%
      </span>
      <div class="kpi-period">vs previous period</div>
    `;
    grid.appendChild(card);
    // Sparkline
    const spark = card.querySelector('.kpi-spark');
    buildSparkline(spark, SPARKLINE_DATA[def.key], colorVal || '#3B82F6');
    // Animate number
    const valEl = card.querySelector(`#kpi-val-${def.key}`);
    setTimeout(() => {
      animateCount(valEl, 0, vals[def.key], 1400, def.fmt);
    }, 100 + i * 80);
  });
}

// =============================================
// CHART HELPERS
// =============================================
function getChartColors() {
  return {
    blue:   '#3B82F6', cyan:   '#06B6D4', purple: '#8B5CF6',
    green:  '#10B981', amber:  '#F59E0B', red:    '#EF4444',
    pink:   '#EC4899', indigo: '#6366F1', teal:   '#14B8A6', orange:'#F97316'
  };
}

function makeGradient(ctx, color, alpha1=0.35, alpha2=0.0) {
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, color + hexAlpha(alpha1));
  g.addColorStop(1, color + hexAlpha(alpha2));
  return g;
}
function hexAlpha(a) {
  return Math.round(a * 255).toString(16).padStart(2,'0').toUpperCase();
}

const CHART_DEFAULTS = {
  font: { family: "'Plus Jakarta Sans','Inter',system-ui,sans-serif", size: 11 },
  color: '#94A3B8',
  plugins: {
    legend: {
      labels: { color:'#94A3B8', font:{ family:"'Plus Jakarta Sans',sans-serif", size:11 }, padding:16, usePointStyle:true, pointStyleWidth:8 }
    },
    tooltip: {
      backgroundColor:'#0F1E30', titleColor:'#F1F5F9', bodyColor:'#94A3B8',
      borderColor:'rgba(255,255,255,0.1)', borderWidth:1,
      padding:10, cornerRadius:8,
      titleFont:{ family:"'Plus Jakarta Sans',sans-serif", size:12, weight:'700' },
      bodyFont:{ family:"'Plus Jakarta Sans',sans-serif", size:11 },
    }
  },
  scales: {
    x: { grid:{ color:'rgba(255,255,255,0.04)', drawBorder:false }, ticks:{ color:'#94A3B8', font:{family:"'Plus Jakarta Sans',sans-serif",size:10} } },
    y: { grid:{ color:'rgba(255,255,255,0.04)', drawBorder:false }, ticks:{ color:'#94A3B8', font:{family:"'Plus Jakarta Sans',sans-serif",size:10} } }
  }
};

function applyDefaults(opts) {
  Chart.defaults.font.family = CHART_DEFAULTS.font.family;
  Chart.defaults.color = CHART_DEFAULTS.color;
}

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
}

// =============================================
// MONTHLY AGGREGATION
// =============================================
function monthlyRevenue(txns) {
  const rev = new Array(12).fill(0), profit = new Array(12).fill(0), orders = new Array(12).fill(0);
  txns.filter(t => t.status !== 'Cancelled').forEach(t => {
    const m = t.date.getMonth();
    rev[m]    += t.revenue;
    profit[m] += t.profit;
    orders[m]++;
  });
  return { rev, profit, orders };
}

// =============================================
// CHART: MAIN TREND
// =============================================
function initMainTrendChart(txns) {
  destroyChart('mainTrend');
  const { rev, profit, orders } = monthlyRevenue(txns);
  const C = getChartColors();
  const ctx = document.getElementById('mainTrendChart').getContext('2d');
  state.charts.mainTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Revenue', data: rev, borderColor: C.blue, borderWidth: 2.5,
          backgroundColor: makeGradient(ctx, C.blue, 0.25, 0),
          fill: true, tension: 0.45, pointRadius: 4, pointBackgroundColor: C.blue, pointBorderColor:'#fff', pointBorderWidth: 1.5
        },
        {
          label: 'Profit', data: profit, borderColor: C.green, borderWidth: 2,
          backgroundColor: makeGradient(ctx, C.green, 0.15, 0),
          fill: true, tension: 0.45, pointRadius: 3, pointBackgroundColor: C.green, pointBorderColor:'#fff', pointBorderWidth: 1
        },
        {
          label: 'Orders', data: orders, borderColor: C.amber, borderWidth: 2,
          backgroundColor: 'transparent', fill: false, tension: 0.45,
          pointRadius: 3, pointBackgroundColor: C.amber, yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Orders') return `  Orders: ${ctx.raw}`;
              return `  ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString('en-IN')}`;
            }
          }
        }
      },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => '₹' + (v/1000).toFixed(0)+'K' } },
        y2: { position:'right', grid:{ display:false }, ticks:{ color:'#94A3B8', font:{size:10}, callback: v => v } }
      }
    }
  });
}

// =============================================
// CHART: MONTHLY REVENUE BAR
// =============================================
function initMonthlyRevenueChart(txns) {
  destroyChart('monthlyRevenue');
  const { rev } = monthlyRevenue(txns);
  const C = getChartColors();
  const ctx = document.getElementById('monthlyRevenueChart').getContext('2d');
  state.charts.monthlyRevenue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [{ label:'Revenue', data: rev, backgroundColor: C.blue + '99', borderColor: C.blue, borderWidth: 1.5, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1100, easing: 'easeOutBounce' },
      plugins: { ...CHART_DEFAULTS.plugins, legend:{ display:false } },
      scales: { x: CHART_DEFAULTS.scales.x, y: { ...CHART_DEFAULTS.scales.y, ticks:{ ...CHART_DEFAULTS.scales.y.ticks, callback: v => '₹'+(v/1000)+'K' } } }
    }
  });
}

// =============================================
// CHART: MONTHLY PROFIT BAR
// =============================================
function initMonthlyProfitChart(txns) {
  destroyChart('monthlyProfit');
  const { profit } = monthlyRevenue(txns);
  const C = getChartColors();
  const ctx = document.getElementById('monthlyProfitChart').getContext('2d');
  state.charts.monthlyProfit = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [{ label:'Profit', data: profit, backgroundColor: C.green + '88', borderColor: C.green, borderWidth: 1.5, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1100 },
      plugins: { ...CHART_DEFAULTS.plugins, legend:{ display:false } },
      scales: { x: CHART_DEFAULTS.scales.x, y: { ...CHART_DEFAULTS.scales.y, ticks:{ ...CHART_DEFAULTS.scales.y.ticks, callback: v => '₹'+(v/1000)+'K' } } }
    }
  });
}

// =============================================
// CHART: REVENUE VS TARGET
// =============================================
function initRevenueTargetChart(txns) {
  destroyChart('revenueTarget');
  const { rev } = monthlyRevenue(txns);
  const targets = [85000,90000,100000,95000,115000,125000,140000,135000,150000,145000,160000,155000];
  const C = getChartColors();
  const ctx = document.getElementById('revenueTargetChart').getContext('2d');
  state.charts.revenueTarget = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [
        { label:'Actual', data: rev, backgroundColor: C.blue + '99', borderColor: C.blue, borderWidth: 1.5, borderRadius: 4, borderSkipped: false },
        { label:'Target', data: targets, backgroundColor: C.purple + '55', borderColor: C.purple, borderWidth: 1.5, borderRadius: 4, borderSkipped: false, type:'line', fill:false, tension:0.4, pointRadius:0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1100 },
      plugins: { ...CHART_DEFAULTS.plugins },
      scales: { x: CHART_DEFAULTS.scales.x, y: { ...CHART_DEFAULTS.scales.y, ticks:{ ...CHART_DEFAULTS.scales.y.ticks, callback: v => '₹'+(v/1000)+'K' } } }
    }
  });
}

// =============================================
// CHART: PROFIT MARGIN LINE
// =============================================
function initProfitMarginChart(txns) {
  destroyChart('profitMargin');
  const { rev, profit } = monthlyRevenue(txns);
  const margins = rev.map((r,i) => r > 0 ? ((profit[i]/r)*100) : 0);
  const C = getChartColors();
  const ctx = document.getElementById('profitMarginChart').getContext('2d');
  state.charts.profitMargin = new Chart(ctx, {
    type: 'line',
    data: {
      labels: MONTHS,
      datasets: [{ label:'Profit Margin %', data: margins, borderColor: C.cyan, borderWidth: 2.5, backgroundColor: makeGradient(ctx, C.cyan, 0.2, 0), fill: true, tension: 0.45, pointRadius: 4, pointBackgroundColor: C.cyan }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1200 },
      plugins: { ...CHART_DEFAULTS.plugins, legend:{ display:false } },
      scales: { x: CHART_DEFAULTS.scales.x, y: { ...CHART_DEFAULTS.scales.y, ticks:{ ...CHART_DEFAULTS.scales.y.ticks, callback: v => v.toFixed(1)+'%' } } }
    }
  });
}

// =============================================
// PRODUCT ANALYTICS
// =============================================
function getProductStats(txns) {
  const map = {};
  txns.filter(t => t.status !== 'Cancelled').forEach(t => {
    if (!map[t.product]) map[t.product] = { product:t.product, units:0, revenue:0, profit:0, category:t.category };
    map[t.product].units   += t.quantity;
    map[t.product].revenue += t.revenue;
    map[t.product].profit  += t.profit;
  });
  return Object.values(map).map(p => ({
    ...p,
    margin: p.revenue > 0 ? (p.profit/p.revenue*100).toFixed(1) : 0,
    growth: (15 + Math.round(Math.random()*30) - 5).toFixed(1)
  }));
}

function initTopProductsChart(txns) {
  destroyChart('topProducts');
  const stats = getProductStats(txns).sort((a,b)=>b.revenue-a.revenue).slice(0,10);
  const C = getChartColors();
  const colors = [C.blue,C.cyan,C.purple,C.green,C.amber,C.red,C.pink,C.indigo,C.teal,C.orange];
  const ctx = document.getElementById('topProductsChart').getContext('2d');
  state.charts.topProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stats.map(p => p.product),
      datasets: [{
        label:'Revenue', data: stats.map(p=>p.revenue),
        backgroundColor: colors.map(c=>c+'99'), borderColor: colors, borderWidth: 1.5,
        borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      animation: { duration: 1200 },
      plugins: { ...CHART_DEFAULTS.plugins, legend:{ display:false } },
      scales: {
        x: { ...CHART_DEFAULTS.scales.x, ticks:{ ...CHART_DEFAULTS.scales.x.ticks, callback: v => '₹'+(v/1000)+'K' } },
        y: { ...CHART_DEFAULTS.scales.y, ticks:{ color:'#94A3B8', font:{size:10} } }
      }
    }
  });
}

function initCategoryDonut(txns) {
  destroyChart('categoryDonut');
  const map = {};
  txns.filter(t=>t.status!=='Cancelled').forEach(t => {
    map[t.category] = (map[t.category]||0) + t.revenue;
  });
  const labels = Object.keys(map), data = Object.values(map);
  const C = getChartColors();
  const colors = [C.blue, C.cyan, C.purple, C.green, C.amber, C.red];
  const ctx = document.getElementById('categoryDonutChart').getContext('2d');
  state.charts.categoryDonut = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors.map(c=>c+'CC'), borderColor: colors, borderWidth: 2, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      animation: { animateRotate: true, duration: 1200 },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
        tooltip: { ...CHART_DEFAULTS.plugins.tooltip, callbacks: { label: c => `  ${c.label}: ₹${Number(c.raw).toLocaleString('en-IN')} (${(c.raw/data.reduce((a,b)=>a+b)*100).toFixed(1)}%)` } }
      }
    }
  });
  // Custom legend
  const leg = document.getElementById('categoryLegend');
  if (leg) {
    leg.innerHTML = labels.map((l,i)=>`
      <div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div>${l}</div>
    `).join('');
  }
}

function renderProductTable(txns) {
  const stats = getProductStats(txns);
  const search = state.prodSearch.toLowerCase();
  let filtered = stats.filter(p => p.product.toLowerCase().includes(search));
  filtered.sort((a,b) => {
    const dir = state.prodSortDir === 'asc' ? 1 : -1;
    if (typeof a[state.prodSortKey] === 'string') return a[state.prodSortKey].localeCompare(b[state.prodSortKey]) * dir;
    return (a[state.prodSortKey] - b[state.prodSortKey]) * dir;
  });
  const tbody = document.getElementById('productTableBody');
  tbody.innerHTML = filtered.map(p => {
    const status = p.margin > 35 ? 'high' : p.margin > 22 ? 'medium' : 'low';
    const gStr = parseFloat(p.growth) >= 0 ? `<span style="color:var(--accent-green)">+${p.growth}%</span>` : `<span style="color:var(--accent-red)">${p.growth}%</span>`;
    return `<tr>
      <td><strong>${p.product}</strong></td>
      <td>${fmt.number(p.units)}</td>
      <td>${fmt.currency(p.revenue)}</td>
      <td>${fmt.currency(p.profit)}</td>
      <td>${p.margin}%</td>
      <td>${gStr}</td>
      <td><span class="badge badge-${status}">${status.charAt(0).toUpperCase()+status.slice(1)}</span></td>
    </tr>`;
  }).join('');
}

// =============================================
// CUSTOMER ANALYTICS
// =============================================
function initNewReturningChart(txns) {
  destroyChart('newReturning');
  const custs = {};
  const sorted = [...txns].sort((a,b)=>a.date-b.date);
  sorted.forEach(t => { custs[t.customer] = (custs[t.customer]||0) + 1; });
  const returning = Object.values(custs).filter(c=>c>1).length;
  const newC = Object.values(custs).filter(c=>c===1).length;
  const C = getChartColors();
  const ctx = document.getElementById('newReturningChart').getContext('2d');
  state.charts.newReturning = new Chart(ctx, {
    type: 'doughnut',
    data: { labels:['New','Returning'], datasets:[{ data:[newC,returning], backgroundColor:[C.blue+'CC',C.cyan+'CC'], borderColor:[C.blue,C.cyan], borderWidth:2, hoverOffset:6 }] },
    options: { responsive:true, maintainAspectRatio:false, cutout:'65%', animation:{duration:1100}, plugins:{ ...CHART_DEFAULTS.plugins } }
  });
}

function initCustomerGrowthChart(txns) {
  destroyChart('customerGrowth');
  const C = getChartColors();
  const data = [90,100,112,104,128,138,155,148,165,158,172,175];
  const ctx = document.getElementById('customerGrowthChart').getContext('2d');
  state.charts.customerGrowth = new Chart(ctx, {
    type:'line',
    data:{ labels:MONTHS, datasets:[{ label:'Customers', data, borderColor:C.purple, borderWidth:2, backgroundColor:makeGradient(ctx,C.purple,0.2,0), fill:true, tension:0.45, pointRadius:3, pointBackgroundColor:C.purple }] },
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:1100}, plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}}, scales:{ x:CHART_DEFAULTS.scales.x, y:CHART_DEFAULTS.scales.y } }
  });
}

function initCustomerSegmentChart(txns) {
  destroyChart('customerSegment');
  const C = getChartColors();
  const segments = ['New','Returning','VIP','High Value','At Risk'];
  const data = [350,480,120,95,65];
  const colors = [C.blue,C.cyan,C.purple,C.green,C.red];
  const ctx = document.getElementById('customerSegmentChart').getContext('2d');
  state.charts.customerSegment = new Chart(ctx, {
    type:'bar',
    data:{ labels:segments, datasets:[{ label:'Customers', data, backgroundColor:colors.map(c=>c+'99'), borderColor:colors, borderWidth:1.5, borderRadius:6, borderSkipped:false }] },
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:1100}, plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}}, scales:{ x:CHART_DEFAULTS.scales.x, y:CHART_DEFAULTS.scales.y } }
  });
}

function initCustomerRadarChart() {
  destroyChart('customerRadar');
  const C = getChartColors();
  const ctx = document.getElementById('customerRadarChart').getContext('2d');
  state.charts.customerRadar = new Chart(ctx, {
    type:'radar',
    data:{
      labels:['Revenue','Orders','Retention','Satisfaction','Loyalty','Growth'],
      datasets:[
        { label:'This Period', data:[88,76,82,90,74,85], borderColor:C.blue, backgroundColor:C.blue+'33', borderWidth:2, pointBackgroundColor:C.blue, pointRadius:4 },
        { label:'Previous Period', data:[72,65,75,80,68,72], borderColor:C.cyan, backgroundColor:C.cyan+'22', borderWidth:1.5, pointBackgroundColor:C.cyan, pointRadius:3, borderDash:[4,3] }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:1200},
      plugins:{ ...CHART_DEFAULTS.plugins },
      scales:{ r:{ grid:{color:'rgba(255,255,255,0.06)'}, angleLines:{color:'rgba(255,255,255,0.06)'}, ticks:{display:false}, pointLabels:{color:'#94A3B8',font:{size:10}} } }
    }
  });
}

function initScatterChart(txns) {
  destroyChart('scatter');
  const C = getChartColors();
  const pts = txns.filter(t=>t.status==='Completed').slice(0,60).map(t=>({x:t.quantity,y:t.revenue}));
  const ctx = document.getElementById('scatterChart').getContext('2d');
  state.charts.scatter = new Chart(ctx, {
    type:'scatter',
    data:{ datasets:[{ label:'Order', data:pts, backgroundColor:C.blue+'88', borderColor:C.blue, borderWidth:1, pointRadius:5, pointHoverRadius:7 }] },
    options:{
      responsive:true, maintainAspectRatio:false, animation:{duration:1000},
      plugins:{...CHART_DEFAULTS.plugins, legend:{display:false}},
      scales:{
        x:{ ...CHART_DEFAULTS.scales.x, title:{display:true,text:'Quantity',color:'#94A3B8',font:{size:10}} },
        y:{ ...CHART_DEFAULTS.scales.y, ticks:{...CHART_DEFAULTS.scales.y.ticks,callback:v=>'₹'+(v/1000)+'K'}, title:{display:true,text:'Revenue',color:'#94A3B8',font:{size:10}} }
      }
    }
  });
}

function renderCustomerKPIs(txns) {
  const row = document.getElementById('customerKpiRow');
  if (!row) return;
  const kpis = [
    { icon:'👥', label:'Total Customers', value: fmt.number(1284), sub:'Active this period', color:'var(--accent-blue)' },
    { icon:'💎', label:'VIP Customers',   value: '120',             sub:'Top 10% spenders',  color:'var(--accent-purple)' },
    { icon:'🔄', label:'Retention Rate',  value: '68.4%',           sub:'vs 62.1% prev',     color:'var(--accent-cyan)' },
    { icon:'💰', label:'Avg Revenue/Cust',value: fmt.currency(9997), sub:'Per customer',      color:'var(--accent-green)' },
    { icon:'📈', label:'CLV (Demo)',       value: fmt.currency(32500),sub:'Est. lifetime value',color:'var(--accent-amber)' },
  ];
  row.innerHTML = kpis.map(k=>`
    <div class="mini-kpi-card" style="border-top:2px solid ${k.color}">
      <div class="mini-kpi-icon">${k.icon}</div>
      <div class="mini-kpi-label">${k.label}</div>
      <div class="mini-kpi-value">${k.value}</div>
      <div class="mini-kpi-sub">${k.sub}</div>
    </div>
  `).join('');
}

// =============================================
// REGIONAL ANALYTICS
// =============================================
function getRegionStats(txns) {
  const map = {};
  REGIONS.forEach(r => map[r] = { revenue:0, orders:0 });
  txns.filter(t=>t.status!=='Cancelled').forEach(t => {
    map[t.region].revenue += t.revenue;
    map[t.region].orders++;
  });
  return map;
}

function initRegionalBarChart(txns) {
  destroyChart('regionalBar');
  const stats = getRegionStats(txns);
  const C = getChartColors();
  const colors = [C.blue,C.cyan,C.purple,C.green,C.amber,C.red,C.pink,C.indigo];
  const ctx = document.getElementById('regionalBarChart').getContext('2d');
  state.charts.regionalBar = new Chart(ctx, {
    type:'bar',
    data:{
      labels:REGIONS,
      datasets:[
        { label:'Revenue', data:REGIONS.map(r=>stats[r].revenue), backgroundColor:colors.map(c=>c+'99'), borderColor:colors, borderWidth:1.5, borderRadius:6, borderSkipped:false }
      ]
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      animation:{duration:1200},
      plugins:{...CHART_DEFAULTS.plugins, legend:{display:false}},
      scales:{ x:{...CHART_DEFAULTS.scales.x,ticks:{...CHART_DEFAULTS.scales.x.ticks,callback:v=>'₹'+(v/1000)+'K'}}, y:CHART_DEFAULTS.scales.y }
    }
  });
}

function initRegionalPolarChart(txns) {
  destroyChart('regionalPolar');
  const stats = getRegionStats(txns);
  const C = getChartColors();
  const colors = [C.blue,C.cyan,C.purple,C.green,C.amber,C.red,C.pink,C.indigo];
  const ctx = document.getElementById('regionalPolarChart').getContext('2d');
  state.charts.regionalPolar = new Chart(ctx, {
    type:'polarArea',
    data:{
      labels:REGIONS,
      datasets:[{ data:REGIONS.map(r=>stats[r].revenue), backgroundColor:colors.map(c=>c+'88'), borderColor:colors, borderWidth:1.5 }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1200},
      plugins:{ ...CHART_DEFAULTS.plugins },
      scales:{ r:{ grid:{color:'rgba(255,255,255,0.06)'}, ticks:{display:false,backdropColor:'transparent'} } }
    }
  });
}

function renderHeatmap(txns) {
  const wrap = document.getElementById('heatmapWrapper');
  if (!wrap) return;
  const data = {};
  REGIONS.forEach(r => { data[r] = new Array(12).fill(0); });
  txns.filter(t=>t.status!=='Cancelled').forEach(t => {
    const m = t.date.getMonth();
    data[t.region][m] += t.revenue;
  });
  let maxVal = 0;
  REGIONS.forEach(r => MONTHS.forEach((_,m) => { if (data[r][m] > maxVal) maxVal = data[r][m]; }));

  function getColor(val) {
    const ratio = maxVal > 0 ? val / maxVal : 0;
    if (ratio > 0.75) return '#1d4ed8';
    if (ratio > 0.5)  return '#2563eb';
    if (ratio > 0.3)  return '#3b82f6';
    if (ratio > 0.15) return '#60a5fa';
    return '#1e3a5f';
  }

  let html = `<table class="heatmap-table"><thead><tr><th class="hm-label">Region</th>`;
  MONTHS.forEach(m => { html += `<th>${m}</th>`; });
  html += `</tr></thead><tbody>`;
  REGIONS.forEach(r => {
    html += `<tr><td class="hm-label" style="color:var(--text-secondary);font-size:0.72rem;white-space:nowrap">${r}</td>`;
    MONTHS.forEach((_,m) => {
      const v = data[r][m];
      const k = fmt.short(v);
      html += `<td style="background:${getColor(v)}" title="${r} ${MONTHS[m]}: ${fmt.currency(v)}">${k}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

// =============================================
// SALES FUNNEL
// =============================================
function renderFunnel(txns) {
  const kpis = computeKPIs(txns);
  const stages = [
    { name:'Visitors',      value:50000,    color:'#3B82F6' },
    { name:'Product Views', value:32500,    color:'#06B6D4' },
    { name:'Add to Cart',   value:14200,    color:'#8B5CF6' },
    { name:'Checkout',      value:8400,     color:'#F59E0B' },
    { name:'Purchase',      value:kpis.orders || 3842, color:'#10B981' },
  ];
  const maxW = 100;
  const container = document.getElementById('funnelContainer');
  if (!container) return;

  let html = '';
  stages.forEach((s, i) => {
    const w = maxW - (i * 14);
    const conv = i > 0 ? ((s.value / stages[i-1].value) * 100).toFixed(1) : null;
    if (conv) {
      html += `<div class="funnel-conv"><i class="fa-solid fa-chevron-down"></i>${conv}% conversion from previous stage</div>`;
    }
    html += `
      <div class="funnel-stage">
        <div class="funnel-bar-wrap" style="width:${w}%;background:${s.color};min-height:44px;margin:0 auto;border-radius:4px;animation:funnelExpand 0.8s ${i*0.15}s both ease-out">
          <div class="funnel-label">
            <span class="funnel-name">${s.name}</span>
            <span class="funnel-value">${Number(s.value).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;

  // Funnel bar chart
  destroyChart('funnelBar');
  const C = getChartColors();
  const colors = [C.blue, C.cyan, C.purple, C.amber, C.green];
  const ctx = document.getElementById('funnelBarChart').getContext('2d');
  state.charts.funnelBar = new Chart(ctx, {
    type:'bar',
    data:{
      labels:stages.map(s=>s.name),
      datasets:[{ label:'Count', data:stages.map(s=>s.value), backgroundColor:colors.map(c=>c+'99'), borderColor:colors, borderWidth:1.5, borderRadius:6, borderSkipped:false }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1100},
      plugins:{...CHART_DEFAULTS.plugins, legend:{display:false}},
      scales:{ x:CHART_DEFAULTS.scales.x, y:{...CHART_DEFAULTS.scales.y,ticks:{...CHART_DEFAULTS.scales.y.ticks,callback:v=>Number(v).toLocaleString()}} }
    }
  });
}

// Add funnel animation keyframe via JS
const fStyle = document.createElement('style');
fStyle.textContent = `@keyframes funnelExpand { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }`;
document.head.appendChild(fStyle);

// =============================================
// TARGET VS ACTUAL
// =============================================
function renderTargets(txns) {
  const kpis = computeKPIs(txns);
  const targets = [
    { title:'Revenue Target',  target:1500000, actual:kpis.revenue, color:'#3B82F6' },
    { title:'Sales Target',    target:1400000, actual:kpis.revenue * 0.98, color:'#06B6D4' },
    { title:'Profit Target',   target:500000,  actual:kpis.profit, color:'#10B981' },
    { title:'Order Target',    target:4500,    actual:kpis.orders, color:'#8B5CF6' },
  ];
  const row = document.getElementById('targetProgressRow');
  if (!row) return;
  row.innerHTML = targets.map((t,i) => {
    const pct = Math.min((t.actual/t.target)*100, 100).toFixed(1);
    const r = 44, circ = 2 * Math.PI * r;
    return `
      <div class="target-card" style="animation-delay:${i*0.1}s">
        <div class="target-card-title">${t.title}</div>
        <div class="circular-progress">
          <svg viewBox="0 0 100 100" width="100" height="100">
            <circle class="track" cx="50" cy="50" r="${r}" />
            <circle class="fill" cx="50" cy="50" r="${r}"
              stroke="${t.color}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${circ - (circ * pct / 100)}"
              id="cpfill-${i}" />
          </svg>
          <div class="progress-label">${pct}%<span>achieved</span></div>
        </div>
        <div class="target-values">
          <strong>${fmt.currency(Math.round(t.actual))}</strong><br>
          <span>of ${fmt.currency(t.target)} target</span>
        </div>
      </div>
    `;
  }).join('');

  // Animate fill after mount
  setTimeout(() => {
    targets.forEach((t, i) => {
      const r = 44, circ = 2 * Math.PI * r;
      const el = document.getElementById(`cpfill-${i}`);
      if (el) {
        const pct = Math.min((t.actual/t.target)*100, 100);
        el.style.strokeDashoffset = circ - (circ * pct / 100);
      }
    });
  }, 100);

  // Grouped bar
  destroyChart('targetGrouped');
  const C = getChartColors();
  const ctx = document.getElementById('targetGroupedChart').getContext('2d');
  state.charts.targetGrouped = new Chart(ctx, {
    type:'bar',
    data:{
      labels:targets.map(t=>t.title),
      datasets:[
        { label:'Target', data:targets.map(t=>t.target), backgroundColor:C.purple+'66', borderColor:C.purple, borderWidth:1.5, borderRadius:4, borderSkipped:false },
        { label:'Actual', data:targets.map(t=>t.actual), backgroundColor:C.blue+'99', borderColor:C.blue, borderWidth:1.5, borderRadius:4, borderSkipped:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1200},
      plugins:{...CHART_DEFAULTS.plugins},
      scales:{
        x:CHART_DEFAULTS.scales.x,
        y:{...CHART_DEFAULTS.scales.y, ticks:{...CHART_DEFAULTS.scales.y.ticks, callback:v=>'₹'+(v/1000)+'K'}}
      }
    }
  });
}

// =============================================
// TIME ANALYTICS
// =============================================
function initDayOfWeekChart(txns) {
  destroyChart('dayOfWeek');
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const counts = new Array(7).fill(0);
  txns.forEach(t => counts[t.day]++);
  const C = getChartColors();
  const ctx = document.getElementById('dayOfWeekChart').getContext('2d');
  state.charts.dayOfWeek = new Chart(ctx, {
    type:'bar',
    data:{
      labels:days,
      datasets:[{ label:'Orders', data:counts, backgroundColor:counts.map((_,i)=>i===counts.indexOf(Math.max(...counts))?C.blue:C.blue+'55'), borderColor:C.blue, borderWidth:1.5, borderRadius:6, borderSkipped:false }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1000},
      plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}},
      scales:{ x:CHART_DEFAULTS.scales.x, y:CHART_DEFAULTS.scales.y }
    }
  });
}

function initHourOfDayChart(txns) {
  destroyChart('hourOfDay');
  const hours = new Array(24).fill(0);
  txns.forEach(t => { if (t.hour !== undefined) hours[t.hour]++; });
  const labels = Array.from({length:24},(_,i)=>i+':00');
  const C = getChartColors();
  const ctx = document.getElementById('hourOfDayChart').getContext('2d');
  state.charts.hourOfDay = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[{ label:'Orders', data:hours, borderColor:C.cyan, borderWidth:2, backgroundColor:makeGradient(ctx,C.cyan,0.2,0), fill:true, tension:0.45, pointRadius:2, pointBackgroundColor:C.cyan }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1000},
      plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}},
      scales:{ x:{...CHART_DEFAULTS.scales.x,ticks:{...CHART_DEFAULTS.scales.x.ticks,maxTicksLimit:12}}, y:CHART_DEFAULTS.scales.y }
    }
  });
}

// =============================================
// ORDER ANALYTICS
// =============================================
function initOrderStatusChart(txns) {
  destroyChart('orderStatus');
  const map = {};
  STATUSES.forEach(s => map[s]=0);
  txns.forEach(t => { if(map[t.status]!==undefined) map[t.status]++; });
  const C = getChartColors();
  const colors = [C.green, C.blue, C.amber, C.red, C.purple];
  const ctx = document.getElementById('orderStatusChart').getContext('2d');
  state.charts.orderStatus = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:STATUSES,
      datasets:[{ data:STATUSES.map(s=>map[s]), backgroundColor:colors.map(c=>c+'BB'), borderColor:colors, borderWidth:2, hoverOffset:6 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'62%', animation:{duration:1100}, plugins:{...CHART_DEFAULTS.plugins} }
  });
}

function initOrderVolumeTrendChart(txns) {
  destroyChart('orderVolumeTrend');
  const { orders } = monthlyRevenue(txns);
  const C = getChartColors();
  const ctx = document.getElementById('orderVolumeTrendChart').getContext('2d');
  state.charts.orderVolumeTrend = new Chart(ctx, {
    type:'line',
    data:{
      labels:MONTHS,
      datasets:[{ label:'Orders', data:orders, borderColor:C.indigo, borderWidth:2.5, backgroundColor:makeGradient(ctx,C.indigo,0.25,0), fill:true, tension:0.45, pointRadius:4, pointBackgroundColor:C.indigo }]
    },
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:1100}, plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}}, scales:{ x:CHART_DEFAULTS.scales.x, y:CHART_DEFAULTS.scales.y } }
  });
}

// =============================================
// PAYMENT ANALYTICS
// =============================================
function getPaymentStats(txns) {
  const map = {};
  PAYMENTS.forEach(p => map[p] = { count:0, revenue:0 });
  txns.filter(t=>t.status!=='Cancelled').forEach(t => {
    map[t.payment].count++;
    map[t.payment].revenue += t.revenue;
  });
  return map;
}

function initPaymentDonut(txns) {
  destroyChart('paymentDonut');
  const stats = getPaymentStats(txns);
  const C = getChartColors();
  const colors = [C.blue,C.cyan,C.purple,C.amber,C.green,C.pink];
  const ctx = document.getElementById('paymentDonutChart').getContext('2d');
  state.charts.paymentDonut = new Chart(ctx, {
    type:'pie',
    data:{
      labels:PAYMENTS,
      datasets:[{ data:PAYMENTS.map(p=>stats[p].count), backgroundColor:colors.map(c=>c+'CC'), borderColor:colors, borderWidth:2, hoverOffset:6 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:1100}, plugins:{...CHART_DEFAULTS.plugins} }
  });
}

function initPaymentBarChart(txns) {
  destroyChart('paymentBar');
  const stats = getPaymentStats(txns);
  const C = getChartColors();
  const colors = [C.blue,C.cyan,C.purple,C.amber,C.green,C.pink];
  const ctx = document.getElementById('paymentBarChart').getContext('2d');
  state.charts.paymentBar = new Chart(ctx, {
    type:'bar',
    data:{
      labels:PAYMENTS,
      datasets:[{ label:'Revenue', data:PAYMENTS.map(p=>stats[p].revenue), backgroundColor:colors.map(c=>c+'88'), borderColor:colors, borderWidth:1.5, borderRadius:6, borderSkipped:false }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1100},
      plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}},
      scales:{ x:CHART_DEFAULTS.scales.x, y:{...CHART_DEFAULTS.scales.y,ticks:{...CHART_DEFAULTS.scales.y.ticks,callback:v=>'₹'+(v/1000)+'K'}} }
    }
  });
}

function renderPaymentCards(txns) {
  const stats = getPaymentStats(txns);
  const total = PAYMENTS.reduce((s,p)=>s+stats[p].count,0);
  const icons = { 'UPI':'📱', 'Credit Card':'💳', 'Debit Card':'🏦', 'Cash on Delivery':'💵', 'Net Banking':'🖥️', 'Wallet':'👛' };
  const colors = ['var(--accent-blue)','var(--accent-cyan)','var(--accent-purple)','var(--accent-amber)','var(--accent-green)','var(--accent-pink)'];
  const wrap = document.getElementById('paymentMethodCards');
  if (!wrap) return;
  wrap.innerHTML = PAYMENTS.map((p,i) => {
    const pct = total ? ((stats[p].count/total)*100).toFixed(1) : 0;
    return `<div class="payment-card" style="border-top:2px solid ${colors[i]}">
      <div class="payment-icon">${icons[p]||'💳'}</div>
      <div class="payment-name">${p}</div>
      <div class="payment-pct">${pct}%</div>
      <div class="payment-rev">${fmt.short(stats[p].revenue)}</div>
    </div>`;
  }).join('');
}

// =============================================
// PROFITABILITY ANALYTICS
// =============================================
function initCostRevenueStackedChart(txns) {
  destroyChart('costRevenueStacked');
  const { rev } = monthlyRevenue(txns);
  const costs = []; const profits = [];
  txns.filter(t=>t.status!=='Cancelled').forEach(t => {});
  const allCosts = new Array(12).fill(0), allProfit = new Array(12).fill(0);
  txns.filter(t=>t.status!=='Cancelled').forEach(t => {
    const m = t.date.getMonth();
    allCosts[m]  += t.cost;
    allProfit[m] += t.profit;
  });
  const C = getChartColors();
  const ctx = document.getElementById('costRevenueStackedChart').getContext('2d');
  state.charts.costRevenueStacked = new Chart(ctx, {
    type:'bar',
    data:{
      labels:MONTHS,
      datasets:[
        { label:'COGS',   data:allCosts,  backgroundColor:C.red+'88',   borderColor:C.red,   borderWidth:1, borderRadius:0, stack:'s' },
        { label:'Profit', data:allProfit, backgroundColor:C.green+'88', borderColor:C.green, borderWidth:1, borderRadius:4, borderSkipped:'bottom', stack:'s' }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1200},
      plugins:{...CHART_DEFAULTS.plugins},
      scales:{
        x:CHART_DEFAULTS.scales.x,
        y:{...CHART_DEFAULTS.scales.y,stacked:true,ticks:{...CHART_DEFAULTS.scales.y.ticks,callback:v=>'₹'+(v/1000)+'K'}}
      }
    }
  });
}

function initNetProfitChart(txns) {
  destroyChart('netProfit');
  const allProfit = new Array(12).fill(0);
  txns.filter(t=>t.status!=='Cancelled').forEach(t => { allProfit[t.date.getMonth()] += t.profit; });
  const netProfit = allProfit.map(p => p * 0.72); // after ops cost
  const C = getChartColors();
  const ctx = document.getElementById('netProfitChart').getContext('2d');
  state.charts.netProfit = new Chart(ctx, {
    type:'line',
    data:{
      labels:MONTHS,
      datasets:[
        { label:'Gross Profit', data:allProfit, borderColor:C.green, borderWidth:2, backgroundColor:makeGradient(ctx,C.green,0.2,0), fill:true, tension:0.4, pointRadius:3, pointBackgroundColor:C.green },
        { label:'Net Profit',   data:netProfit, borderColor:C.teal, borderWidth:2, backgroundColor:'transparent', fill:false, tension:0.4, pointRadius:3, pointBackgroundColor:C.teal, borderDash:[5,3] }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:1200}, plugins:{...CHART_DEFAULTS.plugins}, scales:{ x:CHART_DEFAULTS.scales.x, y:{...CHART_DEFAULTS.scales.y,ticks:{...CHART_DEFAULTS.scales.y.ticks,callback:v=>'₹'+(v/1000)+'K'}} } }
  });
}

function renderProfitabilityKPIs(txns) {
  const kpis_data = computeKPIs(txns);
  const row = document.getElementById('profitabilityKpiRow');
  if (!row) return;
  const kpis = [
    { icon:'💹', label:'Total Revenue',    value: fmt.currency(kpis_data.revenue), sub:'Gross income', color:'var(--accent-blue)' },
    { icon:'🏭', label:'Total COGS',       value: fmt.currency(kpis_data.cost),    sub:'Cost of goods', color:'var(--accent-red)' },
    { icon:'📊', label:'Gross Profit',     value: fmt.currency(kpis_data.profit),  sub:'Rev minus COGS', color:'var(--accent-green)' },
    { icon:'📉', label:'Gross Margin',     value: kpis_data.revenue > 0 ? fmt.percent(kpis_data.profit/kpis_data.revenue*100) : '0%', sub:'Profit/Revenue', color:'var(--accent-cyan)' },
    { icon:'🎯', label:'Net Profit (est.)',value: fmt.currency(kpis_data.profit * 0.72), sub:'After operating costs', color:'var(--accent-amber)' },
  ];
  row.innerHTML = kpis.map(k=>`
    <div class="mini-kpi-card" style="border-top:2px solid ${k.color}">
      <div class="mini-kpi-icon">${k.icon}</div>
      <div class="mini-kpi-label">${k.label}</div>
      <div class="mini-kpi-value">${k.value}</div>
      <div class="mini-kpi-sub">${k.sub}</div>
    </div>
  `).join('');
}

// =============================================
// RETURN ANALYTICS
// =============================================
function initReturnRateChart(txns) {
  destroyChart('returnRate');
  const returnData = [4.2,3.8,3.5,3.9,3.3,3.0,3.4,3.1,2.9,3.2,3.0,3.2];
  const C = getChartColors();
  const ctx = document.getElementById('returnRateChart').getContext('2d');
  state.charts.returnRate = new Chart(ctx, {
    type:'line',
    data:{
      labels:MONTHS,
      datasets:[
        { label:'Return Rate %', data:returnData, borderColor:C.red, borderWidth:2.5, backgroundColor:makeGradient(ctx,C.red,0.2,0), fill:true, tension:0.45, pointRadius:4, pointBackgroundColor:C.red },
        { label:'Benchmark 5%',  data:new Array(12).fill(5), borderColor:C.amber, borderWidth:1.5, fill:false, tension:0, pointRadius:0, borderDash:[6,4] }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false, animation:{duration:1100}, plugins:{...CHART_DEFAULTS.plugins}, scales:{ x:CHART_DEFAULTS.scales.x, y:{...CHART_DEFAULTS.scales.y,ticks:{...CHART_DEFAULTS.scales.y.ticks,callback:v=>v+'%'},min:0,max:7} } }
  });
}

function initReturnProductsChart(txns) {
  destroyChart('returnProducts');
  const returned = txns.filter(t=>t.status==='Returned');
  const map = {};
  returned.forEach(t => { map[t.product] = (map[t.product]||0)+1; });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const C = getChartColors();
  const ctx = document.getElementById('returnProductsChart').getContext('2d');
  state.charts.returnProducts = new Chart(ctx, {
    type:'bar',
    data:{
      labels:sorted.map(([p])=>p),
      datasets:[{ label:'Returns', data:sorted.map(([,v])=>v), backgroundColor:C.red+'88', borderColor:C.red, borderWidth:1.5, borderRadius:6, borderSkipped:false }]
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      animation:{duration:1100},
      plugins:{...CHART_DEFAULTS.plugins,legend:{display:false}},
      scales:{ x:CHART_DEFAULTS.scales.x, y:CHART_DEFAULTS.scales.y }
    }
  });
}

// =============================================
// FORECAST CHART
// =============================================
function initForecastChart(txns) {
  destroyChart('forecast');
  const { rev } = monthlyRevenue(txns);
  // Simple moving average + linear regression forecast
  const hist = [...rev];
  const n = hist.length;
  const sumX = n*(n-1)/2, sumX2 = n*(n-1)*(2*n-1)/6;
  const sumY = hist.reduce((s,v)=>s+v,0);
  const sumXY = hist.reduce((s,v,i)=>s+i*v,0);
  const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
  const intercept = (sumY - slope*sumX) / n;
  const forecastMonths = 6;
  const forecastData = Array.from({length:forecastMonths},(_,i)=>Math.round(intercept + slope*(n+i)));
  const allLabels = [...MONTHS, 'Jan\'26','Feb\'26','Mar\'26','Apr\'26','May\'26','Jun\'26'];
  const histData  = [...hist, ...new Array(forecastMonths).fill(null)];
  const fcstData  = [...new Array(n-1).fill(null), hist[n-1], ...forecastData];

  const C = getChartColors();
  const ctx = document.getElementById('forecastChart').getContext('2d');
  state.charts.forecast = new Chart(ctx, {
    type:'line',
    data:{
      labels:allLabels,
      datasets:[
        { label:'Historical Revenue', data:histData, borderColor:C.blue, borderWidth:2.5, backgroundColor:makeGradient(ctx,C.blue,0.2,0), fill:true, tension:0.45, pointRadius:4, pointBackgroundColor:C.blue, spanGaps:false },
        { label:'Forecast Revenue',   data:fcstData, borderColor:C.amber, borderWidth:2, backgroundColor:makeGradient(ctx,C.amber,0.12,0), fill:true, tension:0.45, pointRadius:5, pointBackgroundColor:C.amber, borderDash:[6,4], spanGaps:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1400},
      plugins:{...CHART_DEFAULTS.plugins, tooltip:{...CHART_DEFAULTS.plugins.tooltip,callbacks:{label:c=>`  ${c.dataset.label}: ₹${Number(c.raw).toLocaleString('en-IN')}`}}},
      scales:{x:CHART_DEFAULTS.scales.x, y:{...CHART_DEFAULTS.scales.y,ticks:{...CHART_DEFAULTS.scales.y.ticks,callback:v=>'₹'+(v/1000)+'K'}}}
    }
  });
}

// =============================================
// ADVANCED ANALYTICS CARDS
// =============================================
function renderAdvancedAnalytics(txns) {
  const kpis = computeKPIs(txns);
  const { rev } = monthlyRevenue(txns);
  const avgMonthlySales = rev.filter(v=>v>0).reduce((a,b)=>a+b,0) / rev.filter(v=>v>0).length;
  const cagr = ((Math.pow(rev[11]/(rev[0]||1), 1/1) - 1)*100).toFixed(1);
  const arpu = kpis.uniqCust > 0 ? (kpis.revenue / kpis.uniqCust).toFixed(0) : 0;
  const veloc = kpis.orders > 0 ? (kpis.revenue / 30).toFixed(0) : 0;
  const advs = [
    { label:'Growth Rate (YTD)',       value: '+18.4%',                  sub:'vs last year', color:'var(--accent-green)' },
    { label:'CAGR (Trend)',            value: cagr + '%',                 sub:'Annual growth trend', color:'var(--accent-blue)' },
    { label:'Avg Revenue/Customer',   value: fmt.currency(+arpu),        sub:'Per unique buyer', color:'var(--accent-cyan)' },
    { label:'Sales Velocity',         value: fmt.currency(+veloc) + '/d',sub:'Revenue per day', color:'var(--accent-purple)' },
    { label:'Avg Monthly Sales',      value: fmt.short(avgMonthlySales), sub:'12-month average', color:'var(--accent-amber)' },
    { label:'CLV Estimate',           value: fmt.currency(32500),        sub:'Customer lifetime value', color:'var(--accent-pink)' },
    { label:'Product Contribution',   value: 'Electronics: 64%',         sub:'Top category share', color:'var(--accent-indigo)' },
    { label:'Order Frequency',        value: (kpis.orders/((kpis.uniqCust)||1)).toFixed(1)+'x', sub:'Orders per customer', color:'var(--accent-teal)' },
    { label:'Revenue Concentration',  value: 'Top 3 products: 58%',       sub:'Product revenue share', color:'var(--accent-blue)' },
    { label:'Regional Leader',        value: 'Maharashtra',               sub:'Highest revenue region', color:'var(--accent-green)' },
  ];
  const grid = document.getElementById('advancedAnalyticsGrid');
  if (!grid) return;
  grid.innerHTML = advs.map(a=>`
    <div class="adv-card" style="border-left:2px solid ${a.color}">
      <div class="adv-label">${a.label}</div>
      <div class="adv-value">${a.value}</div>
      <div class="adv-sub">${a.sub}</div>
    </div>
  `).join('');
}

// =============================================
// TRANSACTIONS TABLE
// =============================================
function populateFilterDropdowns() {
  const cats = [...new Set(ALL_TRANSACTIONS.map(t=>t.category))];
  const regs = [...new Set(ALL_TRANSACTIONS.map(t=>t.region))];
  const pays = [...new Set(ALL_TRANSACTIONS.map(t=>t.payment))];
  const stats = [...new Set(ALL_TRANSACTIONS.map(t=>t.status))];

  function populate(id, vals) {
    const sel = document.getElementById(id);
    if (!sel) return;
    vals.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
  }
  populate('filterCategory', cats);
  populate('filterRegion', regs);
  populate('filterPayment', pays);
  populate('filterStatus', stats);
}

function getFilteredTxns() {
  let filtered = filterByDateRange(ALL_TRANSACTIONS, state.dateRange);
  if (state.txSearch) {
    const q = state.txSearch.toLowerCase();
    filtered = filtered.filter(t =>
      t.id.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) ||
      t.product.toLowerCase().includes(q) || t.region.toLowerCase().includes(q)
    );
  }
  if (state.txFilterCat)    filtered = filtered.filter(t => t.category === state.txFilterCat);
  if (state.txFilterReg)    filtered = filtered.filter(t => t.region   === state.txFilterReg);
  if (state.txFilterPay)    filtered = filtered.filter(t => t.payment  === state.txFilterPay);
  if (state.txFilterStatus) filtered = filtered.filter(t => t.status   === state.txFilterStatus);
  return filtered;
}

function sortTxns(txns) {
  return [...txns].sort((a,b) => {
    let va = a[state.txSortKey], vb = b[state.txSortKey];
    if (va instanceof Date) return state.txSortDir === 'asc' ? va-vb : vb-va;
    if (typeof va === 'string') return state.txSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return state.txSortDir === 'asc' ? va-vb : vb-va;
  });
}

function renderTxTable() {
  const filtered = getFilteredTxns();
  state.filteredTx = filtered;
  const sorted  = sortTxns(filtered);
  const total   = sorted.length;
  const pages   = Math.max(1, Math.ceil(total / state.txPageSize));
  if (state.txPage > pages) state.txPage = pages;
  const start = (state.txPage - 1) * state.txPageSize;
  const slice = sorted.slice(start, start + state.txPageSize);

  const tbody = document.getElementById('txTableBody');
  tbody.innerHTML = slice.map(t => `
    <tr>
      <td><code style="font-size:0.78rem;color:var(--accent-blue)">${t.id}</code></td>
      <td>${fmt.date(t.date)}</td>
      <td>${t.customer}</td>
      <td><strong>${t.product}</strong></td>
      <td><span style="color:var(--text-secondary)">${t.category}</span></td>
      <td>${t.region}</td>
      <td style="text-align:center">${t.quantity}</td>
      <td><strong>${fmt.currency(t.revenue)}</strong></td>
      <td style="color:var(--accent-green)">${fmt.currency(t.profit)}</td>
      <td>${t.payment}</td>
      <td><span class="badge badge-${t.status.toLowerCase()}">${t.status}</span></td>
    </tr>
  `).join('');

  renderPagination(total, pages);
  updateSortIndicators('txTable');
}

function renderPagination(total, pages) {
  const pag = document.getElementById('txPagination');
  if (!pag) return;
  const start = (state.txPage - 1) * state.txPageSize + 1;
  const end   = Math.min(state.txPage * state.txPageSize, total);
  let btns = `<div class="pagination-info">Showing ${start}–${end} of ${total} transactions</div>`;
  btns += `<div class="pagination-controls">`;
  btns += `<button class="page-btn" onclick="goPage(1)" ${state.txPage===1?'disabled':''}><i class="fa-solid fa-angles-left"></i></button>`;
  btns += `<button class="page-btn" onclick="goPage(${state.txPage-1})" ${state.txPage===1?'disabled':''}><i class="fa-solid fa-angle-left"></i></button>`;
  const rangeStart = Math.max(1, state.txPage-2), rangeEnd = Math.min(pages, state.txPage+2);
  for (let p = rangeStart; p <= rangeEnd; p++) {
    btns += `<button class="page-btn ${p===state.txPage?'active':''}" onclick="goPage(${p})">${p}</button>`;
  }
  btns += `<button class="page-btn" onclick="goPage(${state.txPage+1})" ${state.txPage===pages?'disabled':''}><i class="fa-solid fa-angle-right"></i></button>`;
  btns += `<button class="page-btn" onclick="goPage(${pages})" ${state.txPage===pages?'disabled':''}><i class="fa-solid fa-angles-right"></i></button>`;
  btns += `</div>`;
  pag.innerHTML = btns;
}

window.goPage = function(p) {
  state.txPage = p;
  renderTxTable();
};

function updateSortIndicators(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  table.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
    if (th.dataset.sort === state.txSortKey) th.classList.add('sort-' + state.txSortDir);
  });
}

// =============================================
// AI INSIGHTS
// =============================================
function renderInsights(txns) {
  const kpis = computeKPIs(txns);
  const { rev } = monthlyRevenue(txns);
  const peakMonth = MONTHS[rev.indexOf(Math.max(...rev))];
  const topProd = getProductStats(txns).sort((a,b)=>b.revenue-a.revenue)[0];
  const topReg  = Object.entries(getRegionStats(txns)).sort((a,b)=>b[1].revenue-a[1].revenue)[0];
  const dayCounts = new Array(7).fill(0);
  txns.forEach(t => dayCounts[t.day]++);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const peakDay = days[dayCounts.indexOf(Math.max(...dayCounts))];

  const insights = [
    { icon:'📈', type:'Revenue', color:'var(--accent-blue)', bg:'var(--accent-blue-dim)', text:`Revenue increased by 18.4% compared to the previous period, driven by strong Electronics sales.`, value:`Total: ${fmt.currency(kpis.revenue)}` },
    { icon:'🏆', type:'Product', color:'var(--accent-green)', bg:'var(--accent-green-dim)', text:`${topProd?.product || 'Premium Laptop'} is the highest-revenue product, contributing ${topProd ? fmt.currency(topProd.revenue) : '₹0'} in sales.`, value:`Top product by revenue` },
    { icon:'📅', type:'Trend', color:'var(--accent-amber)', bg:'var(--accent-amber-dim)', text:`${peakMonth} recorded the highest monthly revenue, indicating a strong seasonal demand spike.`, value:`Peak month of the year` },
    { icon:'📍', type:'Regional', color:'var(--accent-purple)', bg:'var(--accent-purple-dim)', text:`${topReg?.[0] || 'Maharashtra'} leads all regions with ${topReg ? fmt.currency(topReg[1].revenue) : '₹0'} in revenue, accounting for the largest regional share.`, value:`Top performing region` },
    { icon:'🔁', type:'Returns', color:'var(--accent-red)', bg:'var(--accent-red-dim)', text:`Return rate is ${kpis.returnRate.toFixed(1)}%, well below the 5% industry benchmark, reflecting strong product quality.`, value:`Healthy return rate` },
    { icon:'📆', type:'Behavior', color:'var(--accent-cyan)', bg:'var(--accent-cyan-dim)', text:`${peakDay} recorded the highest order volume, suggesting peak customer activity mid-to-late week.`, value:`Busiest day of the week` },
    { icon:'👥', type:'Customer', color:'var(--accent-pink)', bg:'rgba(236,72,153,0.1)', text:`Customer acquisition grew 22.1% with ${fmt.number(kpis.uniqCust)} unique customers this period. Retention rate stands at 68.4%.`, value:`Strong acquisition growth` },
    { icon:'💡', type:'Opportunity', color:'var(--accent-amber)', bg:'var(--accent-amber-dim)', text:`Electronics dominates at 64% of revenue. Diversifying into Fashion and Home & Kitchen can reduce concentration risk.`, value:`Strategic recommendation` },
    { icon:'🎯', type:'Target', color:'var(--accent-green)', bg:'var(--accent-green-dim)', text:`Revenue target achievement is 85.6%. With current growth velocity, annual target is within reach by Q4.`, value:`Target tracking` },
  ];

  const grid = document.getElementById('insightsGrid');
  if (!grid) return;
  grid.innerHTML = insights.map((ins,i) => `
    <div class="insight-card" style="animation-delay:${i*0.07}s">
      <div class="insight-icon-wrap" style="background:${ins.bg};border:1px solid ${ins.color}33">
        <span style="font-size:1.1rem">${ins.icon}</span>
      </div>
      <div class="insight-body">
        <div class="insight-type" style="color:${ins.color}">${ins.type}</div>
        <div class="insight-text">${ins.text}</div>
        <div class="insight-value">${ins.value}</div>
      </div>
    </div>
  `).join('');
}

// =============================================
// FULL DASHBOARD RENDER
// =============================================
function renderDashboard(txns) {
  const kpis = computeKPIs(txns);
  renderKPIs(kpis);

  // Sales Performance
  initMainTrendChart(txns);
  initMonthlyRevenueChart(txns);
  initMonthlyProfitChart(txns);
  initRevenueTargetChart(txns);
  initProfitMarginChart(txns);

  // Product
  initTopProductsChart(txns);
  initCategoryDonut(txns);
  renderProductTable(txns);

  // Customer
  initNewReturningChart(txns);
  initCustomerGrowthChart(txns);
  initCustomerSegmentChart(txns);
  initCustomerRadarChart();
  initScatterChart(txns);
  renderCustomerKPIs(txns);

  // Regional
  initRegionalBarChart(txns);
  initRegionalPolarChart(txns);
  renderHeatmap(txns);

  // Funnel
  renderFunnel(txns);

  // Target
  renderTargets(txns);

  // Time
  initDayOfWeekChart(txns);
  initHourOfDayChart(txns);

  // Order
  initOrderStatusChart(txns);
  initOrderVolumeTrendChart(txns);

  // Payment
  initPaymentDonut(txns);
  initPaymentBarChart(txns);
  renderPaymentCards(txns);

  // Profitability
  initCostRevenueStackedChart(txns);
  initNetProfitChart(txns);
  renderProfitabilityKPIs(txns);

  // Return
  initReturnRateChart(txns);
  initReturnProductsChart(txns);

  // Forecast
  initForecastChart(txns);
  renderAdvancedAnalytics(txns);

  // Table
  renderTxTable();

  // Insights
  renderInsights(txns);
}

// =============================================
// SIDEBAR LOGIC
// =============================================
function initSidebar() {
  const sidebar    = document.getElementById('sidebar');
  const toggleBtn  = document.getElementById('sidebarToggleBtn');
  const mobileBtn  = document.getElementById('mobileMenuBtn');
  const overlay    = document.getElementById('sidebarOverlay');
  const wrapper    = document.getElementById('mainWrapper');

  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  mobileBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });

  // Nav item active state on click
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      }
    });
  });
}

// =============================================
// HEADER LOGIC
// =============================================
function initHeader() {
  // Date range
  document.querySelectorAll('.date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dateRange = parseInt(btn.dataset.range);
      const txns = filterByDateRange(ALL_TRANSACTIONS, state.dateRange);
      renderDashboard(txns);
    });
  });

  // Refresh
  const refreshBtn = document.getElementById('refreshBtn');
  refreshBtn?.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('i');
    icon.classList.add('spinning');
    setTimeout(() => {
      icon.classList.remove('spinning');
      const txns = filterByDateRange(ALL_TRANSACTIONS, state.dateRange);
      renderDashboard(txns);
    }, 800);
  });

  // Theme toggle
  const themeBtn = document.getElementById('themeToggleBtn');
  themeBtn?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const icon = themeBtn.querySelector('i');
    if (document.body.classList.contains('light-theme')) {
      icon.className = 'fa-solid fa-sun';
      state.theme = 'light';
    } else {
      icon.className = 'fa-solid fa-moon';
      state.theme = 'dark';
    }
    // Re-apply Chart.js theme colors
    Chart.defaults.color = state.theme === 'light' ? '#475569' : '#94A3B8';
    const txns = filterByDateRange(ALL_TRANSACTIONS, state.dateRange);
    renderDashboard(txns);
  });

  // Export CSV
  const exportBtn = document.getElementById('exportBtn');
  const exportTableBtn = document.getElementById('exportTableBtn');
  [exportBtn, exportTableBtn].forEach(btn => {
    btn?.addEventListener('click', exportCSV);
  });

  // Print
  document.getElementById('printBtn')?.addEventListener('click', () => window.print());

  // Chart type toggle (main trend)
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      if (state.charts.mainTrend) {
        state.charts.mainTrend.config.type = type;
        state.charts.mainTrend.update();
      }
    });
  });
}

// =============================================
// TABLE INTERACTIVITY
// =============================================
function initTableEvents() {
  // Search
  document.getElementById('txSearch')?.addEventListener('input', e => {
    state.txSearch = e.target.value;
    state.txPage = 1;
    renderTxTable();
  });

  // Filters
  ['filterCategory','filterRegion','filterPayment','filterStatus'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', e => {
      const map = { filterCategory:'txFilterCat', filterRegion:'txFilterReg', filterPayment:'txFilterPay', filterStatus:'txFilterStatus' };
      state[map[id]] = e.target.value;
      state.txPage = 1;
      renderTxTable();
    });
  });

  // Reset
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    state.txSearch = ''; state.txFilterCat = ''; state.txFilterReg = '';
    state.txFilterPay = ''; state.txFilterStatus = '';
    document.getElementById('txSearch').value = '';
    ['filterCategory','filterRegion','filterPayment','filterStatus'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    state.txPage = 1;
    renderTxTable();
  });

  // Sort columns (TX table)
  document.getElementById('txTable')?.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.txSortKey === key) state.txSortDir = state.txSortDir === 'asc' ? 'desc' : 'asc';
      else { state.txSortKey = key; state.txSortDir = 'asc'; }
      renderTxTable();
    });
  });

  // Sort columns (product table)
  document.getElementById('productTable')?.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.prodSortKey === key) state.prodSortDir = state.prodSortDir === 'asc' ? 'desc' : 'asc';
      else { state.prodSortKey = key; state.prodSortDir = 'asc'; }
      renderProductTable(filterByDateRange(ALL_TRANSACTIONS, state.dateRange));
      updateSortIndicators('productTable');
    });
  });

  // Product search
  document.getElementById('productSearch')?.addEventListener('input', e => {
    state.prodSearch = e.target.value;
    renderProductTable(filterByDateRange(ALL_TRANSACTIONS, state.dateRange));
  });
}

// =============================================
// CSV EXPORT
// =============================================
function exportCSV() {
  const headers = ['Order ID','Date','Customer','Product','Category','Region','Quantity','Revenue','Cost','Profit','Payment','Status'];
  const rows = state.filteredTx.map(t => [
    t.id, fmt.date(t.date), t.customer, t.product, t.category, t.region,
    t.quantity, t.revenue, t.cost, t.profit, t.payment, t.status
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'sales_dashboard_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================
// SMOOTH SCROLL FOR NAV
// =============================================
function initSmoothScroll() {
  document.querySelectorAll('.nav-item a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// =============================================
// INTERSECTION OBSERVER — ANIMATE ON SCROLL
// =============================================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.dashboard-section').forEach((section, i) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(24px)';
    section.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
    observer.observe(section);
  });
}

// =============================================
// LOADING OVERLAY
// =============================================
function showLoading() {
  const el = document.createElement('div');
  el.className = 'loading-overlay';
  el.id = 'loadingOverlay';
  el.innerHTML = `
    <div class="brand-icon" style="width:52px;height:52px;font-size:1.4rem;box-shadow:0 0 24px rgba(59,130,246,0.5)"><i class="fa-solid fa-chart-column"></i></div>
    <div class="loader-ring"></div>
    <div class="loader-text">Loading Sales Dashboard Analysis…</div>
  `;
  document.body.appendChild(el);
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) {
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 500);
  }
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  showLoading();
  applyDefaults();
  initParticles();
  initSidebar();
  initHeader();
  populateFilterDropdowns();
  initTableEvents();
  initSmoothScroll();

  // Defer heavy rendering to next frame
  requestAnimationFrame(() => {
    setTimeout(() => {
      const txns = filterByDateRange(ALL_TRANSACTIONS, state.dateRange);
      renderDashboard(txns);
      initScrollAnimations();
      hideLoading();
    }, 300);
  });
});
