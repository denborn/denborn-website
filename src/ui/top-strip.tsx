import { BATTLE_HUD } from '../data/sprites'
import { usePixelScale } from './Screen'
import { type ClockTime, type PingLevel, batteryMark } from './device'

export interface TopStripProps {
  /** The device's time. */
  clock: ClockTime
  /** How far the relay is: the level sets the colour and how full the square is; the text is the figure, such as "48 ms". */
  ping: { level: PingLevel; text: string; label: string }
  /** The battery, where the browser tells it. */
  battery?: { percent: number; charging: boolean; text: string; label: string } | undefined
}

/**
 * The strip across the top of a fight's bottom screen (decision 249), after
 * the games' touch screen: the time on the left; on the right the ping, a
 * square and a figure in one colour, then the battery, as one of the games'
 * own three marks (decision 255). Nothing in it can be pressed, and nothing
 * in it is announced when it changes: a screen reader finds it where it is.
 */
export function TopStrip({ clock, ping, battery }: TopStripProps) {
  const pixel = usePixelScale(1)
  const mark = battery && BATTLE_HUD.battery[batteryMark(battery.percent)]
  return (
    <div className="dn-topstrip">
      <time className="dn-topstrip__clock" dateTime={clock.iso}>
        {clock.text}
      </time>
      <span className="dn-topstrip__ping" data-level={ping.level} role="img" aria-label={ping.label}>
        <span className="dn-topstrip__square" />
        {ping.text}
      </span>
      {battery && (
        <span className={`dn-topstrip__battery${battery.charging ? ' dn-topstrip__battery--charging' : ''}`} role="img" aria-label={battery.label}>
          {mark && (
            <span
              className="dn-topstrip__cell"
              style={{
                width: mark.width * pixel,
                height: mark.height * pixel,
                backgroundImage: `url(${BATTLE_HUD.url})`,
                backgroundSize: `${BATTLE_HUD.width * pixel}px ${BATTLE_HUD.height * pixel}px`,
                backgroundPosition: `${-mark.x * pixel}px ${-mark.y * pixel}px`,
              }}
            />
          )}
          {battery.text}
        </span>
      )}
    </div>
  )
}
