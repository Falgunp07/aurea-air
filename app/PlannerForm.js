import { useState } from 'react'
import { activities, audiences, indoorTips, routineLimit, travelModes } from '../lib/profile.mjs'
import SelectField from './SelectField'

const hours = Array.from({ length: 24 }, (_, hour) => hour)
const concerns = Object.keys(indoorTips)

function validate(profile) {
  if (!profile.routine.trim()) {
    return { field: 'routine', message: 'Enter a routine or a fixed commitment.' }
  }
  if (profile.start > profile.end) {
    return { field: 'end', message: 'Choose an end hour at or after the start hour.' }
  }
  return null
}

export default function PlannerForm({ profile, busy, onChange, onGenerate }) {
  const [error, setError] = useState(null)

  function change(name, value) {
    setError(null)
    onChange(name, value)
  }

  function submit(event) {
    event.preventDefault()
    const problem = validate(profile)
    setError(problem)
    if (problem) {
      event.currentTarget.elements.namedItem(problem.field)?.focus()
      return
    }
    onGenerate()
  }

  return (
    <section id="planner" aria-labelledby="planner-title">
      <div className="intro">
        <span className="eyeline">Daily planner</span>
        <h2 id="planner-title">Make a plan.</h2>
        <p>
          Tell us what’s fixed and what can move. Compare forecast hours, find a lower-emission trip
          and choose one change indoors.
        </p>
        <small id="planner-timezone">All times are local to India.</small>
      </div>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset className="fields" disabled={busy}>
          <legend className="sr-only">Daily planning preferences</legend>
          <SelectField
            label="Planning for"
            name="audience"
            options={audiences}
            value={profile.audience}
            onChange={change}
          />
          <SelectField
            label="Usual travel"
            name="travel"
            options={travelModes}
            value={profile.travel}
            onChange={change}
          />
          <SelectField
            label="Activity to schedule"
            name="activity"
            options={activities}
            value={profile.activity}
            onChange={change}
          />
          <label className="wide">
            Your routine and constraints
            <textarea
              name="routine"
              required
              maxLength={routineLimit}
              value={profile.routine}
              aria-invalid={error?.field === 'routine' || undefined}
              aria-describedby={
                error?.field === 'routine' ? 'planner-error routine-help' : 'routine-help'
              }
              onChange={(event) => change('routine', event.target.value)}
            />
          </label>
          <small className="wide fieldHint" id="routine-help">
            Gemini may use this text to suggest changes. Leave out names and addresses.
          </small>
          <SelectField
            label="Flexible tasks from"
            name="start"
            options={hours}
            descriptionId="planner-timezone"
            value={profile.start}
            onChange={change}
          />
          <SelectField
            label="Until"
            name="end"
            options={hours}
            value={profile.end}
            onChange={change}
            invalid={error?.field === 'end'}
            descriptionId={
              error?.field === 'end' ? 'planner-error planner-timezone' : 'planner-timezone'
            }
          />
          <SelectField
            label="Indoor concern"
            name="indoor"
            options={concerns}
            value={profile.indoor}
            onChange={change}
          />
          <label className="wide advisory">
            <input
              type="checkbox"
              checked={Boolean(profile.outdoorAdvisory)}
              onChange={(event) => change('outdoorAdvisory', event.target.checked)}
            />
            My local authority has advised limiting outdoor activity.
          </label>
        </fieldset>
        {error && (
          <p id="planner-error" role="alert">
            {error.message}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {busy ? 'Preparing your plan…' : 'Create my plan'}
        </button>
      </form>
      <span className="sr-only" role="status">
        {busy ? 'Preparing your plan.' : ''}
      </span>
    </section>
  )
}
