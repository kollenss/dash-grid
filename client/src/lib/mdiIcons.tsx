import type React from 'react'
import {
  // Lights
  mdiLightbulb, mdiLightbulbOn, mdiLightbulbOutline, mdiLamp, mdiFloorLamp,
  mdiCeilingLight, mdiDeskLamp, mdiStringLights, mdiLedStrip,
  // Switches & power
  mdiToggleSwitchOutline, mdiToggleSwitchOffOutline, mdiPower, mdiPowerOff,
  mdiPowerSocketEu,
  // Fan
  mdiFan, mdiFanOff,
  // Media
  mdiSpeaker, mdiSpeakerMultiple, mdiTelevision, mdiTelevisionPlay,
  mdiCastConnected, mdiMusicNote, mdiVolumeHigh, mdiVolumeMedium,
  mdiVolumeMute, mdiVolumeOff, mdiPlayCircle, mdiPauseCircle,
  mdiRemote, mdiRemoteTv,
  // Climate
  mdiThermometer, mdiThermometerLow, mdiThermometerHigh, mdiSnowflake,
  mdiFire, mdiAirConditioner, mdiThermostat, mdiRadiator,
  // Sensors
  mdiWater, mdiEye, mdiMotionSensor, mdiSmoke, mdiGauge,
  mdiWeatherWindy, mdiWeatherSunny, mdiWeatherCloudy, mdiWeatherRainy,
  mdiWeatherSnowy, mdiBrightness5, mdiThermometerLines,
  // Cover / garage
  mdiGarage, mdiGarageOpen, mdiBlinds, mdiWindowShutter, mdiWindowClosed,
  // Security
  mdiLock, mdiLockOpen, mdiLockOutline, mdiDoor, mdiDoorOpen,
  mdiShieldHome, mdiAlarmLight,
  // Vacuum
  mdiRobotVacuum, mdiRobotVacuumVariant,
  // Binary sensors
  mdiRadioboxMarked, mdiRadioboxBlank, mdiCheckCircle, mdiAlertCircle,
  mdiWaterPercent, mdiFlash, mdiFlashOff,
  // Network
  mdiWifi, mdiBluetooth,
  // Generic / utility
  mdiHome, mdiStar, mdiAlert, mdiHelp, mdiCog, mdiSync,
  mdiArrowUp, mdiArrowDown, mdiCircle, mdiSquare, mdiHelpCircle,
  mdiLightningBolt, mdiPulse, mdiChartLine, mdiChartBar, mdiInformation,
  mdiSprinkler, mdiFountain, mdiLeaf, mdiEarth,
  // Battery
  mdiBattery, mdiBatteryOutline, mdiBatteryAlert,
  mdiBattery10, mdiBattery20, mdiBattery30, mdiBattery40, mdiBattery50,
  mdiBattery60, mdiBattery70, mdiBattery80, mdiBattery90,
  // Additional sensors
  mdiCurrentAc, mdiFlashOutline, mdiSignalCellular2, mdiSpeedometer,
} from '@mdi/js'

// ── Icon path lookup ─────────────────────────────────────────────────────────
const PATHS: Record<string, string> = {
  'mdi:lightbulb':              mdiLightbulb,
  'mdi:lightbulb-on':           mdiLightbulbOn,
  'mdi:lightbulb-outline':      mdiLightbulbOutline,
  'mdi:lamp':                   mdiLamp,
  'mdi:floor-lamp':             mdiFloorLamp,
  'mdi:ceiling-light':          mdiCeilingLight,
  'mdi:desk-lamp':              mdiDeskLamp,
  'mdi:string-lights':          mdiStringLights,
  'mdi:led-strip':              mdiLedStrip,
  'mdi:toggle-switch-outline':  mdiToggleSwitchOutline,
  'mdi:toggle-switch-off-outline': mdiToggleSwitchOffOutline,
  'mdi:power':                  mdiPower,
  'mdi:power-off':              mdiPowerOff,
  'mdi:power-socket-eu':        mdiPowerSocketEu,
  'mdi:fan':                    mdiFan,
  'mdi:fan-off':                mdiFanOff,
  'mdi:speaker':                mdiSpeaker,
  'mdi:speaker-multiple':       mdiSpeakerMultiple,
  'mdi:television':             mdiTelevision,
  'mdi:television-play':        mdiTelevisionPlay,
  'mdi:cast-connected':         mdiCastConnected,
  'mdi:remote':                 mdiRemote,
  'mdi:remote-tv':              mdiRemoteTv,
  'mdi:music-note':             mdiMusicNote,
  'mdi:volume-high':            mdiVolumeHigh,
  'mdi:volume-medium':          mdiVolumeMedium,
  'mdi:volume-mute':            mdiVolumeMute,
  'mdi:volume-off':             mdiVolumeOff,
  'mdi:play-circle':            mdiPlayCircle,
  'mdi:pause-circle':           mdiPauseCircle,
  'mdi:thermometer':            mdiThermometer,
  'mdi:thermometer-low':        mdiThermometerLow,
  'mdi:thermometer-high':       mdiThermometerHigh,
  'mdi:snowflake':              mdiSnowflake,
  'mdi:fire':                   mdiFire,
  'mdi:air-conditioner':        mdiAirConditioner,
  'mdi:thermostat':             mdiThermostat,
  'mdi:radiator':               mdiRadiator,
  'mdi:water':                  mdiWater,
  'mdi:water-percent':          mdiWaterPercent,
  'mdi:eye':                    mdiEye,
  'mdi:motion-sensor':          mdiMotionSensor,
  'mdi:smoke':                  mdiSmoke,
  'mdi:gauge':                  mdiGauge,
  'mdi:weather-windy':          mdiWeatherWindy,
  'mdi:weather-sunny':          mdiWeatherSunny,
  'mdi:weather-cloudy':         mdiWeatherCloudy,
  'mdi:weather-rainy':          mdiWeatherRainy,
  'mdi:weather-snowy':          mdiWeatherSnowy,
  'mdi:brightness-5':           mdiBrightness5,
  'mdi:thermometer-lines':      mdiThermometerLines,
  'mdi:garage':                 mdiGarage,
  'mdi:garage-open':            mdiGarageOpen,
  'mdi:blinds':                 mdiBlinds,
  'mdi:window-shutter':         mdiWindowShutter,
  'mdi:window-closed':          mdiWindowClosed,
  'mdi:lock':                   mdiLock,
  'mdi:lock-open':              mdiLockOpen,
  'mdi:lock-outline':           mdiLockOutline,
  'mdi:door':                   mdiDoor,
  'mdi:door-open':              mdiDoorOpen,
  'mdi:shield-home':            mdiShieldHome,
  'mdi:alarm-light':            mdiAlarmLight,
  'mdi:robot-vacuum':           mdiRobotVacuum,
  'mdi:robot-vacuum-variant':   mdiRobotVacuumVariant,
  'mdi:radiobox-marked':        mdiRadioboxMarked,
  'mdi:radiobox-blank':         mdiRadioboxBlank,
  'mdi:check-circle':           mdiCheckCircle,
  'mdi:alert-circle':           mdiAlertCircle,
  'mdi:flash':                  mdiFlash,
  'mdi:flash-off':              mdiFlashOff,
  'mdi:wifi':                   mdiWifi,
  'mdi:bluetooth':              mdiBluetooth,
  'mdi:home':                   mdiHome,
  'mdi:star':                   mdiStar,
  'mdi:alert':                  mdiAlert,
  'mdi:help':                   mdiHelp,
  'mdi:cog':                    mdiCog,
  'mdi:sync':                   mdiSync,
  'mdi:arrow-up':               mdiArrowUp,
  'mdi:arrow-down':             mdiArrowDown,
  'mdi:circle':                 mdiCircle,
  'mdi:square':                 mdiSquare,
  'mdi:help-circle':            mdiHelpCircle,
  'mdi:lightning-bolt':         mdiLightningBolt,
  'mdi:pulse':                  mdiPulse,
  'mdi:chart-line':             mdiChartLine,
  'mdi:chart-bar':              mdiChartBar,
  'mdi:information':            mdiInformation,
  'mdi:sprinkler':              mdiSprinkler,
  'mdi:fountain':               mdiFountain,
  'mdi:leaf':                   mdiLeaf,
  'mdi:earth':                  mdiEarth,
  'mdi:battery':                mdiBattery,
  'mdi:battery-outline':        mdiBatteryOutline,
  'mdi:battery-alert':          mdiBatteryAlert,
  'mdi:battery-10':             mdiBattery10,
  'mdi:battery-20':             mdiBattery20,
  'mdi:battery-30':             mdiBattery30,
  'mdi:battery-40':             mdiBattery40,
  'mdi:battery-50':             mdiBattery50,
  'mdi:battery-60':             mdiBattery60,
  'mdi:battery-70':             mdiBattery70,
  'mdi:battery-80':             mdiBattery80,
  'mdi:battery-90':             mdiBattery90,
  'mdi:current-ac':             mdiCurrentAc,
  'mdi:voltage':                mdiFlashOutline,
  'mdi:signal-cellular-2':      mdiSignalCellular2,
  'mdi:speedometer':            mdiSpeedometer,
}

// ── Domain → default icon ────────────────────────────────────────────────────
export function getDomainIcon(domain: string, state?: string): string {
  switch (domain) {
    case 'light':
      return state === 'on' ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline'
    case 'switch':
      return state === 'on' ? 'mdi:toggle-switch-outline' : 'mdi:toggle-switch-off-outline'
    case 'input_boolean':
      return state === 'on' ? 'mdi:check-circle' : 'mdi:radiobox-blank'
    case 'fan':
      return state === 'on' ? 'mdi:fan' : 'mdi:fan-off'
    case 'media_player':
      return state === 'playing' ? 'mdi:speaker-multiple' : 'mdi:speaker'
    case 'climate':
      return 'mdi:thermostat'
    case 'sensor':
      return 'mdi:chart-line'
    case 'binary_sensor':
      return state === 'on' ? 'mdi:radiobox-marked' : 'mdi:radiobox-blank'
    case 'cover':
      return state === 'open' ? 'mdi:garage-open' : 'mdi:garage'
    case 'lock':
      return state === 'unlocked' ? 'mdi:lock-open' : 'mdi:lock'
    case 'vacuum':
      return 'mdi:robot-vacuum'
    case 'alarm_control_panel':
      return 'mdi:shield-home'
    case 'remote':
      return 'mdi:remote-tv'
    case 'automation':
      return 'mdi:sync'
    case 'script':
      return 'mdi:play-circle'
    case 'scene':
      return 'mdi:star'
    case 'input_number':
    case 'number':
      return 'mdi:gauge'
    case 'weather':
      return 'mdi:weather-sunny'
    default:
      return 'mdi:circle'
  }
}

function getBatteryIcon(pct: number): string {
  if (!isFinite(pct) || pct < 0) return 'mdi:battery-alert'
  if (pct <  5) return 'mdi:battery-outline'
  if (pct < 15) return 'mdi:battery-10'
  if (pct < 25) return 'mdi:battery-20'
  if (pct < 35) return 'mdi:battery-30'
  if (pct < 45) return 'mdi:battery-40'
  if (pct < 55) return 'mdi:battery-50'
  if (pct < 65) return 'mdi:battery-60'
  if (pct < 75) return 'mdi:battery-70'
  if (pct < 85) return 'mdi:battery-80'
  if (pct < 95) return 'mdi:battery-90'
  return 'mdi:battery'
}

/** Icon resolution: HA attribute → device_class → domain fallback */
export function getEntityIcon(domain: string, state?: { state: string; attributes: Record<string, any> }): string {
  const attr = state?.attributes ?? {}

  // 1. Explicit icon from HA (integration-set, e.g. "mdi:battery-60")
  if (attr.icon && typeof attr.icon === 'string') return attr.icon

  // 2. Device class → specific icon
  const dc  = attr.device_class as string | undefined
  const val = state ? parseFloat(state.state) : NaN
  if (dc) {
    switch (dc) {
      case 'battery':      return getBatteryIcon(val)
      case 'temperature':  return 'mdi:thermometer'
      case 'humidity':     return 'mdi:water-percent'
      case 'illuminance':  return 'mdi:brightness-5'
      case 'power':        return 'mdi:lightning-bolt'
      case 'energy':       return 'mdi:flash'
      case 'voltage':      return 'mdi:voltage'
      case 'current':      return 'mdi:current-ac'
      case 'wind_speed':   return 'mdi:weather-windy'
      case 'pressure':     return 'mdi:gauge'
      case 'signal_strength': return 'mdi:signal-cellular-2'
      case 'speed':        return 'mdi:speedometer'
      case 'moisture':     return 'mdi:water'
      case 'smoke':        return 'mdi:smoke'
      case 'motion':       return state?.state === 'on' ? 'mdi:motion-sensor' : 'mdi:eye'
      case 'door':         return state?.state === 'on' ? 'mdi:door-open' : 'mdi:door'
      case 'window':       return state?.state === 'on' ? 'mdi:window-shutter' : 'mdi:window-closed'
      case 'lock':         return state?.state === 'unlocked' ? 'mdi:lock-open' : 'mdi:lock'
      case 'occupancy':    return state?.state === 'on' ? 'mdi:home' : 'mdi:home'
      case 'connectivity': return 'mdi:wifi'
      case 'co2':          return 'mdi:leaf'
    }
  }

  // 3. Domain fallback
  return getDomainIcon(domain, state?.state)
}

// ── Domain → accent color ────────────────────────────────────────────────────
export const DOMAIN_COLORS: Record<string, string> = {
  light:          '#ffd60a',
  switch:         '#5ac8fa',
  input_boolean:  '#5ac8fa',
  fan:            '#64d2ff',
  media_player:   '#ff6b6b',
  climate:        '#ff9f0a',
  sensor:         '#5ac8fa',
  binary_sensor:  '#34c759',
  cover:          '#bf5af2',
  vacuum:         '#32ade6',
  lock:           '#ff453a',
  alarm_control_panel: '#ff3b30',
  automation:     '#34c759',
  script:         '#30d158',
  scene:          '#bf5af2',
  input_number:   '#5ac8fa',
  number:         '#5ac8fa',
  weather:        '#ffd60a',
}

export function getDomainColor(domain: string): string {
  return DOMAIN_COLORS[domain] ?? '#5ac8fa'
}

// ── MDI SVG Component ─────────────────────────────────────────────────────────
interface MdiIconProps {
  icon: string
  size?: number
  style?: React.CSSProperties
  className?: string
}

export function MdiIcon({ icon, size = 24, style, className }: MdiIconProps) {
  const path = PATHS[icon] ?? PATHS['mdi:help-circle'] ?? ''
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={style}
      className={className}
      aria-hidden="true"
    >
      <path d={path} fill="currentColor" />
    </svg>
  )
}
