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
export const shopTrip = 'Shopping errand'
export const activities = [shopTrip, 'Other outdoor activity']
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
  activity: shopTrip,
  start: 15,
  end: 19,
  travel: 'Car',
  indoor: 'Cooking',
  outdoorAdvisory: false,
}

/** @typedef {Omit<typeof initial, "activity" | "outdoorAdvisory"> & {activity?: string, outdoorAdvisory?: boolean}} Profile */

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
    (profile.activity === undefined || activities.includes(profile.activity)) &&
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
