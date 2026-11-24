import test from 'node:test'
import assert from 'node:assert/strict'
import { compareHours, guideAnswer } from '../lib/guide.mjs'
import { initial } from '../lib/planner.mjs'

const now = Date.parse('2026-11-24T15:30:00+05:30')
const hours = [15, 16, 17].map((hour, i) => ({
  time: `2026-11-24T${hour}:00`,
  hour,
  pm: [2, 50, 20][i],
}))

test('compares future hours, identifies the earliest available option, and excludes elapsed slots', () => {
  const answer = compareHours(initial, [...hours].reverse(), now)
  assert.match(answer, /first available hour.*16:00 IST \(50 µg\/m³\)/)
  assert.match(answer, /17:00 IST instead \(20 µg\/m³\)/)
  assert.doesNotMatch(answer, /15:00/)
})

test('explains a tie without suggesting an unnecessary wait', () => {
  const tied = hours.map((row) => ({ ...row, pm: 50 }))
  assert.match(compareHours(initial, tied, now), /no air-quality advantage to waiting/)
})

test('keeps fixed appointments and explains unavailable forecasts', () => {
  assert.match(guideAnswer('My time is fixed', initial, null), /Keep the appointment/)
  assert.match(guideAnswer('Check warnings', initial, null, now), /unavailable/)
  assert.match(compareHours(initial, [], now), /no upcoming/)
  assert.match(compareHours({ ...initial, end: 10 }, hours, now), /ends before/)
})

test('warnings reject stale model estimates and present a fresh reading with local time', () => {
  const air = { current: { time: '2026-11-24T15:00', pm2_5: 46.7 } }
  assert.match(guideAnswer('Check warnings', initial, air, now), /46.7 µg\/m³.*Delhi.*15:00 IST/)
  const later = now + 5 * 60 * 60 * 1000
  assert.match(guideAnswer('Check warnings', initial, air, later), /unavailable/)
})

test('guide travel advice respects the same closing-time constraint as the planner', () => {
  const profile = { ...initial, routine: 'School pickup at 3 pm. Shop closes at 2:30 pm.' }
  assert.match(guideAnswer('Find a travel alternative', profile, null, now), /closed by pickup/)
})
