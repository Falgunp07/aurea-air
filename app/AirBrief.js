import { cities } from '../lib/profile.mjs'
import SelectField from './SelectField'

const locations = Object.keys(cities)

export default function AirBrief({ city, forecast, onChange, disabled }) {
  const current = forecast?.current
  const reading = current ? current.pm2_5 + ' µg/m³' : forecast ? 'Unavailable' : 'Loading…'

  return (
    <>
      <section id="brief" className="hero" aria-labelledby="brief-title">
        <div className="vista" aria-hidden="true">
          <div className="orb" />
          <i className="ridge far" />
          <i className="ridge mid" />
          <i className="ridge near" />
        </div>
        <div className="heroText">
          <div className="eyeline">
            <span className="line" />
            Urban air quality assistant
          </div>
          <h1 id="brief-title">
            Your daily
            <br />
            <em>air brief.</em>
          </h1>
          <p>
            Local air conditions and small changes
            <br />
            for the day ahead.
          </p>
        </div>
        <div className="caption">{city} · India</div>
      </section>
      <section className="reading" aria-label="Regional air forecast">
        <SelectField
          label="Forecast location"
          name="city"
          options={locations}
          value={city}
          disabled={disabled}
          onChange={onChange}
        />
        <div role="status" aria-atomic="true">
          <small>Current regional PM2.5 estimate</small>
          <strong>{reading}</strong>
          {current && (
            <small>
              <time dateTime={current.time + '+05:30'}>{current.time.replace('T', ' · ')} IST</time>
            </small>
          )}
        </div>
        <div>
          <small>Model estimates · refresh every 5 min</small>
          <a href="https://open-meteo.com/en/docs/air-quality-api">Open-Meteo · CAMS</a>
          <small>
            <a href="https://airquality.cpcb.gov.in/AQI_India/">Station observations · CPCB</a>
          </small>
        </div>
      </section>
    </>
  )
}
