'use client'

import { useEffect, useRef, useState } from 'react'
import { baseline, initial } from '../lib/planner.mjs'
import AirBrief from './AirBrief'
import Guide from './Guide'
import PlannerForm from './PlannerForm'
import useForecast from './useForecast'

async function requestPlan(profile, forecast, signal) {
  const localPlan = () => baseline(profile, forecast?.hours ?? [])
  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
      signal,
    })
    if (response.ok) {
      const plan = await response.json()
      if (plan.forecastAvailable === false && forecast?.hours?.length) {
        return { ...plan, timing: localPlan().timing }
      }
      return plan
    }
  } catch {
    // The browser may still have a usable forecast if the planning endpoint times out.
  }
  return localPlan()
}

function PlanResult({ plan, audience }) {
  const heading = useRef(null)
  useEffect(() => {
    heading.current?.focus()
  }, [plan])

  return (
    <section className="result" aria-labelledby="result-title">
      <span className="eyeline">{plan.source}</span>
      <h2 id="result-title" ref={heading} tabIndex={-1}>
        Your {audience.toLowerCase()} plan
      </h2>
      <p>{plan.summary}</p>
      <h3>When to go</h3>
      <p>{plan.timing}</p>
      <h3>Getting around</h3>
      <p>{plan.travel}</p>
      <h3>Indoors</h3>
      <p>{plan.indoor}</p>
      <a href="https://www.epa.gov/indoor-air-quality-iaq/sources-indoor-particulate-matter-pm">
        Indoor air guidance · EPA
      </a>
    </section>
  )
}

export default function Page() {
  const [profile, setProfile] = useState(initial)
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const activeRequest = useRef(null)
  const forecast = useForecast(profile.city)

  useEffect(() => () => activeRequest.current?.abort(), [])

  function changeProfile(name, value) {
    setProfile((previous) => ({ ...previous, [name]: value }))
    setPlan(null)
  }

  async function generate() {
    if (activeRequest.current) return
    const controller = new AbortController()
    activeRequest.current = controller
    setBusy(true)
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(18000)])
      const nextPlan = await requestPlan(profile, forecast, signal)
      if (!controller.signal.aborted) setPlan(nextPlan)
    } finally {
      activeRequest.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header>
        <a className="brand" href="#brief">
          <span className="mark" aria-hidden="true">
            ☼
          </span>{' '}
          Aurea <em>Air</em>
        </a>
        <nav aria-label="Main navigation">
          <a href="#brief">Air brief</a>
          <a href="#planner">Daily planner</a>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <AirBrief
          city={profile.city}
          forecast={forecast}
          onChange={changeProfile}
          disabled={busy}
        />
        <PlannerForm profile={profile} busy={busy} onChange={changeProfile} onGenerate={generate} />
        {plan && <PlanResult plan={plan} audience={profile.audience} />}
      </main>
      <Guide profile={profile} air={forecast} />
      <footer>
        Aurea Air <span>Urban air quality assistant</span>
      </footer>
    </>
  )
}
