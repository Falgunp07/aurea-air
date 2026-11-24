'use client'

import { useEffect, useRef, useState } from 'react'
import { guideAnswer } from '../lib/guide.mjs'

const topics = [
  'Compare outing times',
  'Find a travel alternative',
  'Reduce indoor particles',
  'Check warnings',
]

const followups = {
  'Compare outing times': ['My time is fixed', 'Check warnings'],
  'Find a travel alternative': ['That trip cannot be combined', 'The shop closes early'],
  'My time is fixed': ['The shop closes early', 'Reduce indoor particles'],
}

export default function Guide({ profile, air }) {
  const [topic, setTopic] = useState('')
  const dialog = useRef(null)
  const question = useRef(null)
  const launcher = useRef(null)
  const choices = followups[topic] ?? topics.filter((item) => item !== topic)

  useEffect(() => {
    if (dialog.current.open) question.current?.focus()
  }, [topic])

  function restoreFocus() {
    setTopic('')
    launcher.current?.focus()
  }

  return (
    <aside className="guide" aria-label="Interactive air guide">
      <button
        type="button"
        className="launcher"
        ref={launcher}
        aria-haspopup="dialog"
        aria-controls="guide-panel"
        onClick={() => dialog.current.showModal()}
      >
        <span aria-hidden="true">☼　</span>Air guide
      </button>
      <dialog
        id="guide-panel"
        className="guidePanel"
        ref={dialog}
        aria-labelledby="guide-heading"
        onClose={restoreFocus}
      >
        <div className="guideHead">
          <h2 id="guide-heading">Air guide</h2>
          <button type="button" onClick={() => dialog.current.close()} aria-label="Close air guide">
            ×
          </button>
        </div>
        <small>
          {profile.city} · {profile.audience} · Guided suggestions
        </small>
        <h3 ref={question} tabIndex={-1}>
          {topic || 'What would you like help with?'}
        </h3>
        {topic && <p>{guideAnswer(topic, profile, air)}</p>}
        <div className="choices">
          {choices.map((choice) => (
            <button type="button" key={choice} onClick={() => setTopic(choice)}>
              {choice}
            </button>
          ))}
        </div>
        {topic && (
          <button type="button" className="restart" onClick={() => setTopic('')}>
            All topics
          </button>
        )}
      </dialog>
    </aside>
  )
}
