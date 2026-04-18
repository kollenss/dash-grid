import '../../styles/glass.css'
import './WeatherCard.css'
import { HAState } from '../../types'

interface Props {
  config: { entity_id: string; title?: string; show_forecast?: boolean }
  state?: HAState
}

const CONDITION_ICON: Record<string, string> = {
  'clear-night': '🌙', cloudy: '☁️', fog: '🌫️', hail: '🌨️',
  lightning: '⛈️', 'lightning-rainy': '⛈️', partlycloudy: '⛅',
  pouring: '🌧️', rainy: '🌦️', snowy: '❄️', 'snowy-rainy': '🌨️',
  sunny: '☀️', windy: '💨', 'windy-variant': '💨', exceptional: '⚠️',
}

const CONDITION_LABEL: Record<string, string> = {
  'clear-night': 'Clear', cloudy: 'Cloudy', fog: 'Fog', hail: 'Hail',
  lightning: 'Thunder', 'lightning-rainy': 'Thunder & rain', partlycloudy: 'Partly cloudy',
  pouring: 'Heavy rain', rainy: 'Rain', snowy: 'Snow', 'snowy-rainy': 'Sleet',
  sunny: 'Clear', windy: 'Windy', 'windy-variant': 'Windy', exceptional: 'Unusual',
}

function dayName(iso: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[new Date(iso).getDay()]
}

export default function WeatherCard({ config, state }: Props) {
  const label       = config.title || state?.attributes?.friendly_name || 'Weather'
  const condition   = state?.state ?? 'unknown'
  const icon        = CONDITION_ICON[condition] ?? '🌡️'
  const description = CONDITION_LABEL[condition] ?? condition
  const temp        = state?.attributes?.temperature ?? null
  const humidity    = state?.attributes?.humidity ?? null
  const windSpeed   = state?.attributes?.wind_speed ?? null
  const forecast    = state?.attributes?.forecast ?? []
  const showForecast = config.show_forecast !== false

  return (
    <div className="glass-card weather-card">
      <div className="card-label">{label}</div>

      {/* Current */}
      <div className="weather-current">
        <span className="weather-icon">{icon}</span>
        <div>
          {temp !== null && (
            <div className="weather-temp">
              <span className="card-value-large">{Number(temp).toFixed(1)}</span>
              <span className="card-unit">°C</span>
            </div>
          )}
          <div className="weather-desc">{description}</div>
        </div>
      </div>

      {/* Details */}
      {(humidity !== null || windSpeed !== null) && (
        <div className="weather-details">
          {humidity !== null && <span>💧 {humidity}%</span>}
          {windSpeed !== null && <span>💨 {windSpeed} m/s</span>}
        </div>
      )}

      {/* 5-day forecast */}
      {showForecast && forecast.length > 0 && (
        <div className="weather-forecast">
          {forecast.slice(0, 5).map((day: any, i: number) => (
            <div key={i} className="weather-forecast-day">
              <div className="weather-fc-day">{dayName(day.datetime)}</div>
              <div className="weather-fc-icon">{CONDITION_ICON[day.condition] ?? '🌡️'}</div>
              <div className="weather-fc-temp">{Math.round(day.temperature)}°</div>
              {day.templow != null && (
                <div className="weather-fc-low">{Math.round(day.templow)}°</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
