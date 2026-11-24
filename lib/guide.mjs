import { compareWindow, indoorTips, localSlot, travelSuggestion } from './planner.mjs'
import { freshCurrentReading } from './provider.mjs'

export function compareHours(profile, hours, now = Date.now()) {
  const { earliest, lowest, explanation } = compareWindow(profile, hours, now)
  if (explanation) return explanation

  const firstSlot = localSlot(earliest.time, now)
  if (earliest.time === lowest.time) {
    return `The earliest hour, ${firstSlot}, also has the lowest predicted PM2.5 in your window (${lowest.pm} µg/m³). The available readings give no air-quality advantage to waiting.`
  }

  return `The first available hour is ${firstSlot} (${earliest.pm} µg/m³). For a flexible outing, consider ${localSlot(lowest.time, now)} instead (${lowest.pm} µg/m³). This compares regional concentrations. Keep fixed appointments at their original time.`
}

function forecastWarning(city, air, now) {
  const current = freshCurrentReading(air?.current, now)
  if (!current) {
    return 'A recent regional estimate is unavailable. Check a current local bulletin or station reading before deciding on an outdoor activity.'
  }
  return `The regional model estimates ${current.pm2_5} µg/m³ of PM2.5 for ${city} at ${current.time.replace('T', ' ')} IST. Conditions on your street may differ. Even the lowest predicted hour can have substantial pollution. Follow current local advisories.`
}

export function guideAnswer(topic, profile, air, now = Date.now()) {
  switch (topic) {
    case 'Compare outing times':
      return compareHours(profile, air?.hours ?? [], now)
    case 'My time is fixed':
      return 'Keep the appointment. If you expect a queue, ask whether you can wait indoors until called. Leave optional errands for a time that fits their opening hours.'
    case 'The shop closes early':
      return 'Check closing time against your expected arrival. If the shop closes before you get there, leave it off that trip. Choose an earlier available day or ask someone already going there to collect the item.'
    case 'Find a travel alternative':
      return travelSuggestion(profile)
    case 'That trip cannot be combined':
      return profile.audience === 'Community'
        ? 'Ask which participants already pass the collection point. If nobody does, group nonurgent collections on a later day that works for everyone.'
        : 'Keep the necessary trip. Ask whether someone already visiting the shop can collect the item, or defer a flexible errand to your next planned visit.'
    case 'Reduce indoor particles':
      return indoorTips[profile.indoor]
    case 'Check warnings':
      return profile.outdoorAdvisory
        ? compareWindow(profile, [], now).explanation
        : forecastWarning(profile.city, air, now)
    default:
      return 'Choose a guide topic to compare timing, plan a trip or reduce indoor particles.'
  }
}
