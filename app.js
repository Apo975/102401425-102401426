// 校园失物招领：页面切换 + 发布 / 列表 / 搜索 / 详情 / 状态
// 数据存 localStorage，key = lost_items
var items = JSON.parse(localStorage.getItem('lost_items') || '[]');
var currentType = '寻物';
var homeTab = '寻物'; // 首页 寻物/招领 tab
var currentId = null;
var searchType = '全部';
var searchStatus = '全部';

function save() {
  localStorage.setItem('lost_items', JSON.stringify(items));
}

function show(id) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].style.display = 'none';
  document.getElementById(id).style.display = 'block';
  window.scrollTo(0, 0);
}

function isDone(it) {
  return it.status === '已找到' || it.status === '已归还';
}

function statusPill(it) {
  if (it.type === '寻物') return isDone(it)
    ? '<span class="mini-pill gray">已找到</span>'
    : '<span class="mini-pill orange">寻找中</span>';
  return isDone(it)
    ? '<span class="mini-pill gray">已归还</span>'
    : '<span class="mini-pill green">待认领</span>';
}

function thumbCls(it) {
  if (it.type === '寻物') return 'thumb orange';
  return 'thumb';
}

// 首页列表（按 tab 过滤）
function renderList() {
  var box = document.getElementById('list');
  box.innerHTML = '';
  var list = items.filter(function (it) { return it.type === homeTab; });
  if (!list.length) {
    box.innerHTML = '<p class="subtitle">暂无信息，快来发布第一条吧。</p>';
    return;
  }
  list.forEach(function (it) {
    var d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<div class="' + thumbCls(it) + '">物</div>' +
      '<div class="card-main"><div class="card-name">' + it.name + '</div>' +
      '<div class="card-sub">' + it.place + ' · ' + it.time + '</div>' +
      '<div class="card-foot">' + statusPill(it) + '<span class="link">查看详情 ›</span></div></div>';
    d.onclick = function () { openDetail(it.id); };
    box.appendChild(d);
  });
}

// 表单校验（发布缺项拦截）
function validatePublish(o) {
  if (!o.name) return '请填写物品名称';
  if (!o.place) return '请填写地点';
  if (!o.time) return '请填写时间';
  if (!o.contact) return '请填写联系方式';
  return null;
}

// 发布
function doPublish() {
  var o = {
    id: Date.now(),
    type: currentType,
    name: document.getElementById('f-name').value.trim(),
    category: document.getElementById('f-category').value.trim(),
    place: document.getElementById('f-place').value.trim(),
    time: document.getElementById('f-time').value.trim(),
    feature: document.getElementById('f-feature').value.trim(),
    contact: document.getElementById('f-contact').value.trim(),
    status: '寻找中'
  };
  var err = validatePublish(o);
  if (err) { alert(err); return null; }
  o.status = (o.type === '寻物') ? '寻找中' : '待认领';
  items.push(o);
  save();
  renderList();
  show('page-success');
  return o;
}

// 搜索：关键词同时匹配名称/地点/特征 + 类型/状态筛选
function filterItems(keyword, type, status) {
  keyword = (keyword || '').trim();
  var keys = keyword.split(/\s+/).filter(function (s) { return s; });
  return items.filter(function (it) {
    var hay = it.name + ' ' + it.place + ' ' + it.feature + ' ' + it.category;
    var okKeys = keys.every(function (k) { return hay.indexOf(k) !== -1; });
    var okType = (type === '全部' || it.type === type);
    var done = isDone(it);
    var okStatus = (status === '全部') ||
      (status === '进行中' && !done) ||
      (status === '已处理' && done);
    return okKeys && okType && okStatus;
  });
}

function renderSearch(res, keyword) {
  var box = document.getElementById('search-result');
  var tip = document.getElementById('search-tip');
  var count = document.getElementById('search-count');
  box.innerHTML = '';
  if (!res.length) {
    tip.style.display = 'block';
    count.textContent = '';
    return;
  }
  tip.style.display = 'none';
  count.textContent = '找到 ' + res.length + ' 条与“' + keyword + '”相关的信息';
  res.forEach(function (it) {
    var d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<div class="' + thumbCls(it) + '">物</div>' +
      '<div class="card-main"><div class="card-name">' + it.name + '</div>' +
      '<div class="card-sub">' + it.place + ' · ' + it.time + '</div>' +
      '<div class="card-foot">' + statusPill(it) + '<span class="link">查看详情 ›</span></div></div>';
    d.onclick = function () { openDetail(it.id); };
    box.appendChild(d);
  });
}

function doSearch() {
  var kw = document.getElementById('s-keyword').value;
  var res = filterItems(kw, searchType, searchStatus);
  renderSearch(res, kw.trim());
  return res;
}

// 详情
function openDetail(id) {
  currentId = id;
  var it = items.filter(function (x) { return x.id === id; })[0];
  if (!it) return;
  document.getElementById('d-name').textContent = it.name;
  document.getElementById('d-type').textContent = (it.type === '寻物') ? '寻物' : '招领';
  var st = document.getElementById('d-status');
  st.textContent = it.status;
  st.className = 'mini-pill ' + (isDone(it) ? 'gray' : (it.type === '寻物' ? 'orange' : 'green'));
  var isLost = (it.type === '寻物');
  document.getElementById('d-k-place').textContent = isLost ? '丢失地点' : '拾获地点';
  document.getElementById('d-k-time').textContent = isLost ? '丢失时间' : '拾获时间';
  document.getElementById('d-place').textContent = it.place;
  document.getElementById('d-time').textContent = it.time;
  document.getElementById('d-feature').textContent = it.feature || '—';
  document.getElementById('btn-done').textContent = isLost ? '标记为已找到' : '标记为已归还';
  show('page-detail');
}

// 联系：进联系提示页
function doContact() {
  var it = items.filter(function (x) { return x.id === currentId; })[0];
  if (!it) return;
  document.getElementById('contact-text').textContent = it.contact || '未留下联系方式';
  show('page-contact');
}

// 一键复制联系方式（附加特点）
function copyContact() {
  var t = document.getElementById('contact-text').textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(t);
  alert('已复制：' + t);
}

// 状态更新
function markDone() {
  var it = items.filter(function (x) { return x.id === currentId; })[0];
  if (!it) return;
  it.status = (it.type === '寻物') ? '已找到' : '已归还';
  save();
  renderList();
  document.getElementById('done-title').textContent = '已标记为' + it.status;
  show('page-done');
}

// 发布类型切换
function setPublishType(t) {
  currentType = t;
  var isLost = (t === '寻物');
  document.getElementById('publish-title').textContent = isLost ? '发布寻物' : '发布招领';
  document.getElementById('seg-lost').className = 'seg-btn' + (isLost ? ' active' : '');
  document.getElementById('seg-found').className = 'seg-btn' + (!isLost ? ' active' : '');
  document.getElementById('label-place').textContent = isLost ? '丢失地点' : '拾获地点';
  document.getElementById('label-time').textContent = isLost ? '丢失时间' : '拾获时间';
}

// 事件绑定
document.getElementById('tab-lost').onclick = function () {
  homeTab = '寻物';
  this.className = 'tab tab-lost active';
  document.getElementById('tab-found').className = 'tab tab-found';
  renderList();
};
document.getElementById('tab-found').onclick = function () {
  homeTab = '招领';
  this.className = 'tab tab-found active';
  document.getElementById('tab-lost').className = 'tab tab-lost';
  renderList();
};
document.getElementById('seg-lost').onclick = function () { setPublishType('寻物'); };
document.getElementById('seg-found').onclick = function () { setPublishType('招领'); };
document.getElementById('home-publish').onclick = function () { setPublishType(homeTab === '招领' ? '招领' : '寻物'); show('page-publish'); };
document.getElementById('hero-search').onclick = function () { show('page-search'); };
document.getElementById('btn-publish').onclick = doPublish;
document.getElementById('btn-search').onclick = doSearch;
document.getElementById('btn-contact').onclick = doContact;
document.getElementById('btn-copy').onclick = copyContact;
document.getElementById('btn-done').onclick = markDone;
document.getElementById('btn-again').onclick = function () { show('page-publish'); };

// 筛选 pills
function bindPills(id, cb) {
  var box = document.getElementById(id);
  var btns = box.querySelectorAll('.pill');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () {
      var all = box.querySelectorAll('.pill');
      for (var j = 0; j < all.length; j++) all[j].className = all[j].className.replace(' active', '');
      this.className += ' active';
      cb(this.getAttribute('data-v'));
      doSearch();
    };
  }
}
bindPills('filter-type', function (v) { searchType = v; });
bindPills('filter-status', function (v) { searchStatus = v; });
var quicks = document.querySelectorAll('.quick');
for (var qi = 0; qi < quicks.length; qi++) {
  quicks[qi].onclick = function () {
    document.getElementById('s-keyword').value = this.getAttribute('data-k');
    doSearch();
  };
}

// 通用返回
function goBack(el) {
  renderList();
  show(el.getAttribute('data-go'));
}
var backs = document.querySelectorAll('[data-go]');
for (var i = 0; i < backs.length; i++) {
  (function (el) {
    if (el.onclick) return;
    el.onclick = function () { goBack(el); };
  })(backs[i]);
}

renderList();
