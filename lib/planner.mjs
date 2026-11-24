import { closingMinutes, pickupMinutes } from './routine.mjs'
import { indoorTips } from './profile.mjs'
import { timing } from './schedule.mjs'

export {
  audiences,
  cities,
  indoorTips,
  initial,
  routineLimit,
  travelModes,
  valid,
} from './profile.mjs'
export { compareWindow, localSlot, timing } from './schedule.mjs'

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

/**
 * @param {import('./profile.mjs').Profile} profile
 * @param {import('./schedule.mjs').ForecastHour[]} hours
 * @param {number} [now]
 */
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
