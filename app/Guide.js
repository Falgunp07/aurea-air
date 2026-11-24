'use client'
import {useEffect,useRef,useState} from 'react'
import {guideAnswer} from '../lib/guide.mjs'

const topics=['Compare outing times','Find a travel alternative','Reduce indoor particles','Check warnings']
const followups={
  'Compare outing times':['My time is fixed','Check warnings'],
  'Find a travel alternative':['That trip cannot be combined','The shop closes early'],
  'My time is fixed':['The shop closes early','Reduce indoor particles']
}
export default function Guide({profile,air}){
  const [open,setOpen]=useState(false)
  const [topic,setTopic]=useState('')
  const first=useRef(null)
  const launcher=useRef(null)
  function close(){setOpen(false);launcher.current?.focus()}
  useEffect(()=>{if(open)first.current?.focus()},[open])
  const choices=followups[topic]||topics.filter(t=>t!==topic)
  return <aside className="guide" aria-label="Interactive air guide" onKeyDown={e=>{if(open&&e.key==='Escape')close()}}>
    {open&&<section id="guide-panel" className="guidePanel" aria-label="Air guide"><div className="guideHead"><h2>Air guide</h2><button ref={first} onClick={close} aria-label="Close air guide">×</button></div><small>{profile.city} · {profile.audience} · Guided suggestions</small><p>{topic?'Your question':'What would you like help with?'}</p>
    {topic&&<div aria-live="polite" role="status"><h3>{topic}</h3><p>{guideAnswer(topic,profile,air)}</p></div>}
    <div className="choices">{choices.map(t=><button key={t} onClick={()=>setTopic(t)}>{t}</button>)}</div>
    {topic&&<button className="restart" onClick={()=>setTopic('')}>All topics</button>}</section>}
    <button className="launcher" ref={launcher} aria-expanded={open} aria-controls="guide-panel" onClick={()=>open?close():setOpen(true)}>☼　Air guide</button>
  </aside>
}
