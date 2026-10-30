const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function loadCard() {
  const registry = new Map();
  const customElements = {
    get(name) { return registry.get(name); },
    define(name, component) {
      if (!registry.has(name)) registry.set(name, component);
    },
  };
  class LitBase {
    static html(strings, ...values) { return { strings: Array.from(strings), values }; }
    static css(strings, ...values) { return { strings: Array.from(strings), values }; }
    html(strings, ...values) { return { strings: Array.from(strings), values }; }
    css(strings, ...values) { return { strings: Array.from(strings), values }; }
    requestUpdate() {}
    connectedCallback() {}
    disconnectedCallback() {}
    dispatchEvent() {}
  }
  class HaPanel extends LitBase {}
  registry.set('ha-panel-lovelace', HaPanel);
  const window = { setTimeout, clearTimeout, customCards: [] };
  const context = {
    customElements,
    window,
    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    JSON,
    Event: class Event {},
    document: { createElement: () => ({}) },
    localStorage: { getItem: () => '', setItem: () => {} },
  };
  const bundle = path.resolve(__dirname, '../dist/ch_calendar-card.js');
  vm.runInNewContext(fs.readFileSync(bundle, 'utf8'), context, { filename: bundle });
  return {
    Card: registry.get('ch_calendar-card'),
    Editor: registry.get('ch-calendar-card-editor'),
  };
}

test('card converts solar, lunar, and leap-month anniversaries', () => {
  const { Card } = loadCard();
  const card = new Card();
  card._nowMs = Date.UTC(2026, 9, 29, 12);

  const solar = card._decorateMemorial({ name: '公历生日', date: '03-21', mode: 'yearly', source: 'card' });
  const lunar = card._decorateMemorial({ name: '中秋', date: 'L08-15', mode: 'yearly', source: 'card' });
  const leap = card._decorateMemorial({ name: '闰五月纪念日', date: 'LL05-15', mode: 'yearly', source: 'card' });

  assert.equal(solar.date, '2027-03-21');
  assert.equal(lunar.date, '2027-09-15');
  assert.equal(leap.date, '2028-07-07');
  assert.equal(leap.sub.startsWith('农历闰五月十五'), true);
});

test('card form stores solar, lunar, and leap-month anniversaries distinctly', () => {
  const { Card } = loadCard();
  const card = new Card();
  card._userAnniversaries = [];
  let saved;
  card._saveUserAnniversaries = items => { saved = items; card._userAnniversaries = items; };

  card._draftName = '中秋';
  card._draftCalendar = 'lunar';
  card._draftLunarMonth = '8';
  card._draftLunarDay = '15';
  card._addMemorial();
  assert.equal(saved[0].date, 'L8-15');

  card._draftName = '闰五月纪念';
  card._draftCalendar = 'lunar';
  card._draftLunarMonth = '5';
  card._draftLunarDay = '15';
  card._draftLunarLeap = true;
  card._addMemorial();
  assert.equal(saved[1].date, 'LL5-15');

  card._draftName = '妈妈生日';
  card._draftCalendar = 'solar';
  card._draftDate = '1970-03-21';
  card._addMemorial();
  assert.equal(saved[2].date, '1970-03-21');
});

test('visual editor renders controls for both calendars and leap months', () => {
  const { Editor } = loadCard();
  const editor = new Editor();
  editor._config = {
    entity: 'sensor.chinese_holiday',
    anniversaries: [{ name: '闰月', date: 'LL05-15', mode: 'yearly_count', calendar: 'lunar' }],
  };
  editor.hass = { states: {} };
  const template = editor.render();
  const source = template.strings.join('');
  assert.match(source, /公历/);
  assert.match(source, /农历/);
  assert.ok(template.values.length > 0);
});

test('live ticks do not render over an active memorial input', () => {
  const { Card } = loadCard();
  const card = new Card();
  card.shadowRoot = {
    activeElement: {
      closest: selector => selector === '.memorial-form',
      matches: () => true,
    },
  };
  assert.equal(card.shouldUpdate(new Map()), false);
  card._allowFormRender = true;
  assert.equal(card.shouldUpdate(new Map()), true);
});

test('disabled memorial section does not calculate local memorials', () => {
  const { Card } = loadCard();
  const card = new Card();
  card.config = { entity: 'sensor.chinese_holiday', show_memorials: false };
  card._hass = {
    states: { 'sensor.chinese_holiday': { state: '工作日', attributes: {} } },
  };
  let calls = 0;
  card._localMemorials = () => { calls += 1; return []; };
  card.render();
  assert.equal(calls, 0);
});
