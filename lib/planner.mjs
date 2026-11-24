export const cities = {Delhi:[28.61,77.21], Mumbai:[19.08,72.88], Bengaluru:[12.97,77.59], Kolkata:[22.57,88.36], Chennai:[13.08,80.27], Hyderabad:[17.39,78.49]}
export const indoorTips = {
  Cooking: 'Use an exhaust hood that vents outdoors while cooking, if available. This helps remove particles where they are produced.',
  Candles: 'Skip burning candles indoors today. Leaving them unlit avoids one source of fine particles.',
  Dust: 'Use a damp cloth on dusty surfaces. This helps keep settled particles from becoming airborne during cleaning.'
}
export const initial = {city:'Delhi', audience:'Household', routine:'School pickup is fixed at 3 pm. I usually drive separately for groceries.', start:15, end:19, travel:'Car', indoor:'Cooking'}
export function valid(p){
  return p && Object.hasOwn(cities,p.city) && ['Household','Community'].includes(p.audience) &&
    typeof p.routine==='string' && p.routine.trim().length>0 && p.routine.length<=600 &&
    [p.start,p.end].every(h=>Number.isInteger(h)&&h>=0&&h<=23) && p.start<=p.end &&
    ['Car','Transit','Walking'].includes(p.travel) && Object.hasOwn(indoorTips,p.indoor)
}
export function timing(p, hours){
  if(!hours.length)return 'The regional forecast feed has no upcoming readings. Check a local bulletin before moving an outing.'
  const choices=hours.filter(row=>row.hour>=p.start && row.hour<=p.end)
  if(!choices.length)return 'No forecast hours are available in your selected window. Keep your fixed commitments and check local conditions before leaving.'
  const best=choices.reduce((a,b)=>a.pm<=b.pm?a:b)
  return 'For flexible outdoor tasks, consider '+best.time.replace('T',' at ')+' IST. Its regional PM2.5 forecast is '+best.pm+' µg/m³, the lowest available within your window over the next 24 hours. Keep fixed appointments as scheduled.'
}
export function baseline(p,hours){
  const travel = {Car:'If two stops share a route and opening times allow, combine them. This avoids a separate drive.',Transit:'Group stops around an existing transit journey where fares and timing allow. This can avoid an extra motorized trip.',Walking:'Group nearby errands on one walk if conditions permit. One outing can avoid retracing the same route.'}
  return {timing:timing(p,hours),travel:p.audience==='Community'?'Coordinate a shared collection point if participants can use it on existing trips. This can avoid duplicate journeys.':travel[p.travel],indoor:indoorTips[p.indoor],source:'Standard plan',summary:'Based on your selected options. Check these suggestions against the details in your routine.'}
}
