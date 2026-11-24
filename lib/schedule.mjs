import { shopTrip } from './profile.mjs'
import { closingMinutes } from './routine.mjs'

const dayInMs = 24 * 60 * 60 * 1000
const indiaOffsetMs = 330 * 60 * 1000

/** @typedef {{time: string, pm: number}} ForecastHour */

// The feed provides local ISO minutes. Converting with an explicit offset keeps
// the decision independent of the browser or server's time zone.
/**
 * @param {import('./profile.mjs').Profile} profile
 * @param {ForecastHour[]} hours
 * @param {number} [now]
 */
export function compareWindow(profile, hours, now = Date.now()) {
  if (profile.start > profile.end) {
    return {
      explanation:
        'Your time window ends before it starts. Adjust the hours in the daily planner, then compare again.',
    }
  }

  if (profile.outdoorAdvisory) {
    return {
      explanation:
        'You reported a local advisory to limit outdoor activity. Defer flexible outdoor tasks until the advisory is lifted. Check the issuing authority before rescheduling.',
    }
  }

  const activity = profile.activity ?? shopTrip
  const closesAt = activity === shopTrip ? closingMinutes(profile.routine) : null
  if (closesAt !== null && closesAt <= profile.start * 60) {
    return {
      explanation:
        'If that shop closes at the stated time on your planned day, it closes by the start of your flexible window. Choose an earlier window if your schedule allows, or arrange another collection. Keep fixed appointments in place.',
    }
  }

  let earliest
  let lowest
  let hasUpcoming = false
  for (const row of hours) {
    if (!Number.isFinite(row?.pm) || row.pm < 0) continue
    const timestamp = Date.parse(row.time + '+05:30')
    if (!(timestamp >= now && timestamp < now + dayInMs)) continue
    hasUpcoming = true
    const hour = Number(row.time.slice(11, 13))
    if (hour < profile.start || hour > profile.end) continue
    if (closesAt !== null && hour * 60 + Number(row.time.slice(14, 16)) >= closesAt) continue
    if (!earliest || row.time < earliest.time) earliest = row
    if (!lowest || row.pm < lowest.pm || (row.pm === lowest.pm && row.time < lowest.time)) {
      lowest = row
    }
  }

  if (lowest) return { earliest, lowest, checkClosing: closesAt !== null }
  const reason = hasUpcoming
    ? 'No forecast hours fit your selected window and stated timing constraints. Widen the time window for a flexible task, or keep the original schedule.'
    : 'The regional forecast feed has no upcoming readings. Check a local bulletin before moving an outing.'
  return { explanation: reason }
}

export function localSlot(time, now) {
  const indiaToday = new Date(now + indiaOffsetMs).toISOString().slice(0, 10)
  const date = time.slice(0, 10)
  const day = date === indiaToday ? 'today' : 'tomorrow'
  return `${day} (${date}) at ${time.slice(11, 16)} IST`
}

export function timing(profile, hours, now = Date.now()) {
  const { explanation, lowest, checkClosing } = compareWindow(profile, hours, now)
  if (explanation) return explanation
  const reminder = checkClosing
    ? 'Confirm opening hours on that day and allow time to arrive before closing.'
    : 'Keep fixed appointments as scheduled.'
  return `For a flexible outdoor task, consider ${localSlot(lowest.time, now)}. The regional PM2.5 forecast of ${lowest.pm} µg/m³ is the lowest available within your feasible hours over the next 24 hours. ${reminder}`
}
