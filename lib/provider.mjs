import {cities} from './planner.mjs'
export async function fetchRegionalForecast(city,now=Date.now()){
  const [lat,lon]=cities[city]
  const url=new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.search=new URLSearchParams({latitude:lat,longitude:lon,current:'pm2_5',hourly:'pm2_5',forecast_days:3,timezone:'Asia/Kolkata'})
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),6500)
  try{
    const response=await fetch(url,{signal:controller.signal})
    if(!response.ok)throw Error()
    const data=await response.json()
    const hours=data.hourly.time.map((time,i)=>({time,hour:Number(time.slice(11,13)),pm:data.hourly.pm2_5[i]})).filter(row=>{const t=Date.parse(row.time+'+05:30');return t>=now&&t<now+86400000&&Number.isFinite(row.pm)&&row.pm>=0})
    const result={hours,current:Number.isFinite(data.current?.pm2_5)?data.current:null}
    return result
  } finally {clearTimeout(timer)}
}
