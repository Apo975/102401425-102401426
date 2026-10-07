'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const Core = require('../core');
const code = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const identity = 'a'.repeat(64);
const base = { id: 'old', ownerId: identity, createdAt: 1, type: '寻物', name: '水杯', category: '日用品', place: '图书馆', time: '今天', feature: '蓝色', contact: '测试联系方式', status: '寻找中' };
async function boot({ raw = '[]', failRead = false, failWrite = false, clipboard, execCopy = false } = {}) {
  class Node {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.value = ''; this.textContent = ''; this.style = {}; this.hidden = false; this.checked = false; this.disabled = false; this.className = ''; }
    get options() { return this.children; }
    appendChild(node) { this.children.push(node); node.parent = this; return node; }
    replaceChildren() { this.children = []; }
    querySelectorAll() { return []; }
    select() {}
    remove() { this.parent.children = this.parent.children.filter(x => x !== this); }
  }
  const nodes = new Map();
  for (const match of html.matchAll(/id="([^"]+)"/g)) { const node = new Node(); node.id = match[1]; nodes.set(node.id, node); }
  const store = { lost_items: raw, lost_publisher_token: identity }, events = {};
  const context = {
    LostFound: Core, crypto, location: { protocol: 'file:' }, navigator: { clipboard },
    localStorage: { getItem(key) { if (failRead) throw new Error('不可读'); return store[key] ?? null; },
      setItem(key, value) { if (failWrite) throw new Error('容量不足'); store[key] = value; } },
    document: { hidden: false, body: new Node('body'), createElement(tag) { return new Node(tag); },
      getElementById(id) { assert.ok(nodes.has(id), 'HTML 必须包含 ' + id); return nodes.get(id); },
      querySelectorAll(selector) { return selector === '.page' ? [...nodes.values()].filter(x => x.id.startsWith('page-')) : []; },
      execCommand() { return execCopy; } },
    window: { scrollTo() {}, addEventListener(name, handler) { events[name] = handler; } },
    setInterval() {}
  };
  vm.createContext(context); vm.runInContext(code, context); await context.appReady;
  const el = id => nodes.get(id);
  function fill(data = base) { for (const key of Object.keys(Core.limits)) el('f-' + key).value = data[key] || ''; }
  return { c: context, el, fill, store, events };
}
test('本地发布成功后清空表单、归属恢复并按新到旧排列', async () => {
  const b = await boot({ raw: JSON.stringify([base]) }); b.fill({ ...base, name: '新钥匙' });
  const created = await b.c.doPublish(); assert.ok(created); assert.equal(b.el('f-name').value, '');
  assert.equal(b.c.items[0].name, '新钥匙'); assert.equal(b.c.items[0].isOwner, true);
  const restored = await boot({ raw: b.store.lost_items }); assert.equal(restored.c.items[0].id, created.id);
  assert.equal(restored.c.items[0].isOwner, true);
});
test('招领发布后自动切换首页类型，不会误以为发布丢失', async () => {
  const b = await boot(); b.fill(); b.c.setPublishType('招领');
  const item = await b.c.doPublish(); assert.equal(item.status, '待认领'); assert.equal(b.c.homeTab, '招领');
});
test('空白名称拒绝发布且保留输入', async () => {
  const b = await boot(); b.fill({ ...base, name: ' ' });
  assert.equal(await b.c.doPublish(), null); assert.equal(b.c.items.length, 0); assert.equal(b.el('f-place').value, '图书馆');
});
test('状态更新后详情、搜索筛选及持久化保持一致', async () => {
  const b = await boot({ raw: JSON.stringify([base]) }); b.c.searchStatus = '进行中'; b.c.doSearch();
  assert.equal(b.el('search-result').children.length, 1); b.c.openDetail('old'); assert.equal(await b.c.markDone(), true);
  b.c.show('page-detail'); assert.equal(b.el('d-status').textContent, '已找到');
  b.c.show('page-search'); assert.equal(b.el('search-result').children.length, 0);
  assert.equal(JSON.parse(b.store.lost_items)[0].status, '已找到'); assert.equal(b.el('btn-done').disabled, true);
});
test('非发布者、访客和旧无归属数据均不能更新', async () => {
  for (const ownerId of ['b'.repeat(64), undefined]) {
    const b = await boot({ raw: JSON.stringify([{ ...base, ownerId }]) }); b.c.openDetail('old');
    assert.equal(b.el('btn-done').hidden, true); assert.equal(await b.c.markDone(), false); assert.equal(b.c.items[0].status, '寻找中');
  }
  const b = await boot({ raw: JSON.stringify([base]) }); b.c.openDetail('old'); b.el('visitor-toggle').onclick();
  assert.equal(await b.c.markDone(), false); b.fill(); assert.equal(await b.c.doPublish(), null);
});
test('损坏存储保留原文、阻止写入，存储不可用不会中断初始化', async () => {
  const b = await boot({ raw: '{broken' }); b.fill();
  assert.equal(b.c.storageError, true); assert.equal(await b.c.doPublish(), null); assert.equal(b.store.lost_items, '{broken');
  const denied = await boot({ failRead: true }); assert.equal(denied.el('btn-publish').disabled, true);
});
test('写入失败保留表单和原状态，不显示成功页面', async () => {
  const b = await boot({ raw: JSON.stringify([base]), failWrite: true }); b.fill({ ...base, name: '新物品' });
  assert.equal(await b.c.doPublish(), null); assert.equal(b.c.items.length, 1); assert.equal(b.el('f-name').value, '新物品');
  b.c.openDetail('old'); assert.equal(await b.c.markDone(), false); assert.equal(b.el('d-status').textContent, '寻找中');
  assert.equal(JSON.parse(b.store.lost_items)[0].status, '寻找中');
});
test('卡片把 HTML 输入作为字面文字渲染', async () => {
  const b = await boot({ raw: JSON.stringify([{ ...base, name: '<img src=x onerror=alert(1)>' }]) });
  const name = b.el('list').children[0].children[1].children[0];
  assert.equal(name.textContent, '<img src=x onerror=alert(1)>'); assert.equal(name.children.length, 0);
  b.c.openDetail('old'); assert.equal(b.el('d-name').textContent, name.textContent);
});
test('复制等待真正成功；拒绝或无 API 时不会虚报成功', async () => {
  let copied;
  const success = await boot({ clipboard: { async writeText(text) { copied = text; } } });
  success.el('contact-text').textContent = '测试联系方式'; assert.equal(await success.c.copyContact(), true); assert.equal(copied, '测试联系方式');
  const rejected = await boot({ clipboard: { async writeText() { throw new Error('权限拒绝'); } } });
  assert.equal(await rejected.c.copyContact(), false); assert.match(rejected.el('notice').textContent, /手动复制/);
  const absent = await boot(); assert.equal(await absent.c.copyContact(), false); assert.equal(absent.c.document.body.children.length, 0);
  const fallback = await boot({ execCopy: true }); assert.equal(await fallback.c.copyContact(), true);
});
test('另一个标签页写入后 storage 事件刷新列表与详情', async () => {
  const b = await boot({ raw: JSON.stringify([base]) }); b.c.openDetail('old');
  b.store.lost_items = JSON.stringify([{ ...base, status: '已找到' }]);
  b.events.storage({ key: 'lost_items' }); await b.c.reloadItems();
  assert.equal(b.el('d-status').textContent, '已找到');
});
