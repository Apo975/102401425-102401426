// 校园失物招领：页面切换 + 发布 / 列表 / 搜索 / 详情 / 状态
var items = JSON.parse(localStorage.getItem('lost_items') || '[]');
var currentType = '寻物'; // 发布寻物 or 发布招领
var currentId = null;

function save() {
  localStorage.setItem('lost_items', JSON.stringify(items));
}

function show(id) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].style.display = 'none';
  document.getElementById(id).style.display = 'block';
}

// 首页列表
function renderList() {
  var box = document.getElementById('list');
  box.innerHTML = '';
  items.forEach(function (it) {
    var d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<b>' + it.name + '</b> [' + it.type + '] <span class="status">' + it.status + '</span><br>' + it.place + ' · ' + it.time;
    d.onclick = function () { openDetail(it.id); };
    box.appendChild(d);
  });
}

// 发布
function doPublish() {
  var name = document.getElementById('f-name').value.trim();
  if (!name) { alert('请填写物品名称'); return null; }
  var it = {
    id: Date.now(),
    type: currentType,
    name: name,
    category: document.getElementById('f-category').value.trim(),
    place: document.getElementById('f-place').value.trim(),
    time: document.getElementById('f-time').value.trim(),
    feature: document.getElementById('f-feature').value.trim(),
    contact: document.getElementById('f-contact').value.trim(),
    status: '寻找中'
  };
  items.push(it);
  save();
  renderList();
  show('page-success');
  return it;
}

// 搜索：按名称关键词
function doSearch(keyword) {
  keyword = (keyword || '').trim();
  var box = document.getElementById('search-result');
  box.innerHTML = '';
  var res = items.filter(function (it) { return it.name.indexOf(keyword) !== -1; });
  res.forEach(function (it) {
    var d = document.createElement('div');
    d.className = 'card';
    d.textContent = it.name + ' [' + it.type + '] ' + it.status;
    d.onclick = function () { openDetail(it.id); };
    box.appendChild(d);
  });
  return res;
}

// 详情
function openDetail(id) {
  currentId = id;
  var it = items.filter(function (x) { return x.id === id; })[0];
  if (!it) return;
  document.getElementById('detail').innerHTML =
    '<p><b>' + it.name + '</b> [' + it.type + '] ' + it.status + '</p>' +
    '<p>地点：' + it.place + '</p>' +
    '<p>时间：' + it.time + '</p>' +
    '<p>特征：' + it.feature + '</p>' +
    '<p>联系方式：' + it.contact + '</p>';
  show('page-detail');
}

// 联系：弹窗显示，不做聊天
function doContact() {
  var it = items.filter(function (x) { return x.id === currentId; })[0];
  if (it) alert('联系方式：' + it.contact);
}

// 状态更新：发布者标记
function markDone() {
  var it = items.filter(function (x) { return x.id === currentId; })[0];
  if (!it) return;
  it.status = (it.type === '寻物') ? '已找到' : '已归还';
  save();
  renderList();
  openDetail(currentId);
}

// 导航绑定
document.getElementById('nav-home').onclick = function () { renderList(); show('page-home'); };
document.getElementById('nav-publish-lost').onclick = function () { currentType = '寻物'; document.getElementById('publish-title').textContent = '发布寻物'; show('page-publish'); };
document.getElementById('nav-publish-found').onclick = function () { currentType = '招领'; document.getElementById('publish-title').textContent = '发布招领'; show('page-publish'); };
document.getElementById('nav-search').onclick = function () { show('page-search'); };
document.getElementById('btn-publish').onclick = doPublish;
document.getElementById('btn-search').onclick = function () { doSearch(document.getElementById('s-keyword').value); };
document.getElementById('btn-contact').onclick = doContact;
document.getElementById('btn-done').onclick = markDone;
var backs = document.querySelectorAll('.back');
for (var i = 0; i < backs.length; i++) {
  backs[i].onclick = function () { renderList(); show(this.getAttribute('data-go')); };
}

renderList();
