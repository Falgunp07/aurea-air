import { closingMinutes, pickupMinutes } from './routine.mjs'

export const cities = {
  Delhi: [28.61, 77.21],
  Mumbai: [19.08, 72.88],
  Bengaluru: [12.97, 77.59],
  Kolkata: [22.57, 88.36],
  Chennai: [13.08, 80.27],
  Hyderabad: [17.39, 78.49],
}

export const audiences = ['Household', 'Community']
export const travelModes = ['Car', 'Transit', 'Walking']
export const routineLimit = 600

export const indoorTips = {
  Cooking:
    'If your exhaust hood vents outdoors, use it while cooking. It removes some particles where they are produced.',
  Candles: 'Leave candles unlit today to avoid adding combustion particles indoors.',
  Dust: 'Use a damp cloth on dusty surfaces to keep settled particles from becoming airborne while cleaning.',
}

export const initial = {
  city: 'Delhi',
  audience: 'Household',
  routine: 'School pickup is fixed at 3 pm. I usually drive separately for groceries.',
  start: 15,
  end: 19,
  travel: 'Car',
  indoor: 'Cooking',
  outdoorAdvisory: false,
}

function isHour(value) {
  return Number.isInteger(value) && value >= 0 && value < 24
}

export function valid(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false
  const { city, audience, start, end, travel, indoor, routine } = profile
  return (
    typeof city === 'string' &&
    Object.hasOwn(cities, city) &&
    typeof indoor === 'string' &&
    Object.hasOwn(indoorTips, indoor) &&
    audiences.includes(audience) &&
    travelModes.includes(travel) &&
    typeof routine === 'string' &&
    routine.length <= routineLimit &&
    routine.trim().length > 0 &&
    (profile.outdoorAdvisory === undefined || typeof profile.outdoorAdvisory === 'boolean') &&
    isHour(start) &&
    isHour(end) &&
    start <= end
  )
}

const dayInMs = 24 * 60 * 60 * 1000
const indiaOffsetMs = 330 * 60 * 1000

// The feed provides local ISO minutes. Converting with an explicit offset keeps
// the decision independent of the browser or server's time zone.
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

  const closesAt = closingMinutes(profile.routine)
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

const travelOptions = {
  Car: 'If the shop is on an existing route and still open when you arrive, combine the stops. This can avoid one separate car trip.',
  Transit:
    'If a shop is near your existing transit stop and still open, collect your errand on the same journey. Check the fare before adding a leg.',
  Walking:
    'If conditions and distance fit, group nearby errands into one walk. This can avoid retracing the same route.',
}

export function travelSuggestion(profile) {
  const { routine, audience, travel } = profile
  if (profile.outdoorAdvisory) {
    return audience === 'Community'
      ? 'Move optional outdoor gatherings indoors or postpone them. Coordinate essential collections on existing journeys so fewer people need to travel.'
      : 'Defer optional errands. For an essential pickup, confirm the time and ask about an indoor waiting area to reduce time spent outside.'
  }
  const pickup = pickupMinutes(routine)
  const closing = closingMinutes(routine)
  if (pickup !== null && closing !== null && closing <= pickup) {
    return 'If the pickup and closing times are for the same day, the shop will be closed by pickup. Keep pickup fixed. Ask someone already visiting the shop to collect the items, or choose another opening day. Either option can avoid an unsuccessful trip.'
  }
  if (audience === 'Community') {
    return 'Arrange a shared collection point on journeys participants already make. Confirm timing and capacity first. Each separate pickup replaced avoids one extra journey.'
  }
  return travelOptions[travel]
}

export function baseline(profile, hours, now = Date.now()) {
  const noExtraCost =
    /(?:₹|rs\.?\s*)\s*0\b|\b(?:no|zero) (?:extra |additional )?(?:travel )?budget\b|\bno extra (?:fare|cost|spending)\b/i.test(
      profile.routine,
    )
  return {
    timing: timing(profile, hours, now),
    travel: travelSuggestion(profile),
    indoor: indoorTips[profile.indoor],
    source: 'Standard plan',
    summary: profile.outdoorAdvisory
      ? 'Follow the reported advisory before choosing an outing time. Keep essential commitments and reschedule flexible trips.'
      : noExtraCost
        ? 'Keep the change within your stated budget. Use an existing journey and equipment you already have. Confirm that any shared pickup carries no extra fare.'
        : 'Keep fixed commitments in place. Use the timing comparison for a flexible task and check shop hours and travel time before combining stops.',
  }
}
