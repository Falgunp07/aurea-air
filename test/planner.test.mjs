import test from 'node:test'
import assert from 'node:assert/strict'
import { baseline, cities, initial, timing, valid } from '../lib/planner.mjs'

const morning = Date.parse('2026-11-25T10:00+05:30')
const hours = [
  { time: '2026-11-25T14:00', hour: 14, pm: 3 },
  { time: '2026-11-25T16:00', hour: 16, pm: 62 },
  { time: '2026-11-25T18:00', hour: 18, pm: 40 },
]

test('a change in forecast values changes the recommended feasible hour', () => {
  assert.match(timing(initial, hours, morning), /today .*18:00 IST/)
  const updated = hours.map((row) => (row.hour === 16 ? { ...row, pm: 10 } : row))
  assert.match(timing(initial, updated, morning), /today .*16:00 IST/)
})

test('stale, invalid, out-of-window and exactly 24-hour-ahead readings are excluded', () => {
  const now = Date.parse('2026-11-25T15:00+05:30')
  const invalid = [
    { time: '2026-11-24T17:00', pm: 0 },
    { time: '2026-11-26T15:00', pm: 0 },
    { time: '2026-11-25T16:00', pm: null },
    { time: '2026-11-25T16:00', pm: -5 },
    { time: 'invalid', pm: 0 },
  ]
  assert.match(timing(initial, invalid, now), /no upcoming readings/)
  assert.match(
    timing(initial, [{ time: '2026-11-25T21:00', pm: 0 }], now),
    /fit your selected window/,
  )
})

test('an unsorted tie selects the earliest hour, preserving a zero reading', () => {
  const tied = hours.map((row) => ({ ...row, pm: 0 })).reverse()
  assert.match(timing(initial, tied, morning), /16:00 IST.*0 µg\/m³/)
})

test("crossing midnight uses the Indian date for tomorrow's slot", () => {
  const night = Date.parse('2026-11-24T23:50+05:30')
  assert.match(timing(initial, hours, night), /tomorrow \(2026-11-25\) at 18:00/)
})

test('validates the supported city list, enums, hour ranges and text length', () => {
  for (const city of Object.keys(cities)) assert.equal(valid({ ...initial, city }), true)
  for (const change of [
    { start: 20 },
    { start: -1 },
    { end: 24 },
    { start: '15' },
    { city: 'constructor' },
    { city: ['Delhi'] },
    { indoor: ['Dust'] },
    { audience: 'Other' },
    { travel: 'Plane' },
    { routine: '  ' },
    { routine: 'x'.repeat(601) },
  ])
    assert.equal(valid({ ...initial, ...change }), false, JSON.stringify(change))
  assert.equal(valid(null), false)
})

test('a fixed pickup at or after closing rules out an after-pickup stop', () => {
  for (const routine of [
    'School pickup is fixed at 3 pm. The shop closes at 2 pm.',
    'Pickup at 15:30. The store closes 15:30.',
    'Pick-up at 12 pm. The market closes at 11:55 am.',
  ]) {
    assert.match(baseline({ ...initial, routine }, [], morning).travel, /closed by pickup/)
  }
})

test('later, missing or ambiguous closing times leave travel suggestions conditional', () => {
  for (const routine of [
    'Pickup is at 3 pm. The shop closes at 4 pm.',
    'Pickup at 3. The shop closes at 2.',
    'School pickup at 3 pm, another pickup at 11 am. Shop closes at 2 pm.',
    'Pickup at 12 am. Shop closes at 1 am.',
    'No school pickup at 3 pm. Shop closes at 2 pm.',
    'Pickup at 3 pm or 1 pm. Shop closes at 2 pm.',
  ]) {
    assert.doesNotMatch(baseline({ ...initial, routine }, [], morning).travel, /closed by pickup/)
  }
})

test('zero budget, community travel, and indoor dust change different parts of the plan', () => {
  const profile = { ...initial, audience: 'Community', routine: 'No extra budget.', indoor: 'Dust' }
  const plan = baseline(profile, [], morning)
  assert.match(plan.summary, /no extra fare/)
  assert.match(plan.travel, /shared collection point/)
  assert.match(plan.indoor, /damp cloth/)
  assert.match(plan.timing, /no upcoming readings/)
})

test('a closing time controls available forecast hours as well as the travel decision', () => {
  const earlyClosing = { ...initial, routine: 'School pickup at 3 pm. Shop closes at 2 pm.' }
  const lateClosing = { ...initial, routine: 'School pickup at 3 pm. Shop closes at 5:30 pm.' }
  assert.match(timing(earlyClosing, hours, morning), /closes by the start/)
  assert.match(timing(lateClosing, hours, morning), /16:00 IST/)
  assert.doesNotMatch(timing(lateClosing, hours, morning), /18:00/)
})
test('a reported local outdoor advisory overrides even a low predicted hour', () => {
  const profile = { ...initial, outdoorAdvisory: true }
  const comparison = baseline(profile, hours, morning)
  assert.match(comparison.timing, /advisory/i)
  assert.doesNotMatch(comparison.timing, /consider today|consider tomorrow/)
  assert.match(comparison.travel, /essential pickup/)
  assert.match(
    baseline({ ...profile, audience: 'Community' }, hours, morning).travel,
    /gatherings indoors/,
  )
  assert.equal(valid({ ...profile, outdoorAdvisory: 'false' }), false)
})

test('a shop deadline applies only to the shopping activity, including for older profiles', () => {
  const { activity, ...legacy } = { ...initial, routine: 'The shop closes at 2 pm.' }
  assert.match(timing(legacy, hours, morning), /closes by the start/)
  const walk = { ...legacy, activity: 'Other outdoor activity' }
  assert.match(timing(walk, hours, morning), /18:00 IST/)
  assert.match(timing({ ...walk, outdoorAdvisory: true }, hours, morning), /advisory/)
  assert.equal(valid({ ...walk, activity: 'unrecognized' }), false)
})
