import {baseline,indoorTips} from './planner.mjs'

export function compareHours(profile, hours, now=Date.now()){
  if(profile.start>profile.end)return 'Your time window ends before it starts. Adjust the hours in the daily planner, then compare again.'
  const choices=hours.filter(row=>{
    const timestamp=Date.parse(row.time+'+05:30')
    return timestamp>=now && timestamp<now+86400000 && Number.isFinite(row.pm) && row.hour>=profile.start && row.hour<=profile.end
  })
  if(!choices.length)return 'There are no upcoming forecast readings in your selected window. Keep fixed appointments and check a local air-quality bulletin before moving a flexible outing.'
  const first=choices[0]
  const best=choices.reduce((a,b)=>a.pm<=b.pm?a:b)
  const label=row=>row.time.replace('T',' at ')+' IST ('+row.pm+' µg/m³)'
  if(best===first)return 'The earliest available hour, '+label(first)+', also has the lowest predicted PM2.5 in your window. Waiting offers no forecast advantage among these hours.'
  return 'The first available hour is '+label(first)+'. For a flexible outing, consider '+label(best)+' instead. Its predicted PM2.5 is lower. Keep fixed appointments at their original time.'
}
export function guideAnswer(topic,p,air){
  switch(topic){
    case 'Compare outing times':return compareHours(p,air?.hours||[])
    case 'My time is fixed':return 'Keep the appointment. If a queue is likely, ask whether you can wait indoors until called. Leave optional errands for a time that fits their opening hours.'
    case 'The shop closes early':return 'Check closing time against your expected arrival. If the shop closes before you can get there, leave it off that trip. Choose an earlier available day or ask someone already going there to collect the item.'
    case 'Find a travel alternative':return baseline(p,[]).travel
    case 'That trip cannot be combined':return p.audience==='Community'?'Ask which participants already pass the collection point. If nobody does, group nonurgent collections on a later day that works for everyone.':'Keep the necessary trip. For a flexible errand, check whether someone already visiting the shop can collect the item, or defer it to your next planned visit.'
    case 'Reduce indoor particles':return indoorTips[p.indoor]
    case 'Check warnings':return (air?.current?'The city forecast for '+p.city+' at '+air.current.time.replace('T',' ')+' IST is '+air.current.pm2_5+' µg/m³. A regional estimate can differ from conditions on your street.':'A current regional reading is unavailable. Check a local bulletin before deciding on an outdoor activity.')+' A lower forecast hour can still have substantial pollution. Follow local advisories if they recommend limiting outdoor activity.'
  }
}
