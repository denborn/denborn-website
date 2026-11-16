import { useEffect, useState } from 'react'
import { loadDataPack } from '../../data/pack'
import { LANGUAGES, setLanguage, useLanguage, useMessages } from '../../i18n'
import { probeRelay } from '../../network/relay-probe'
import type { OfflineState } from '../../pwa/use-offline-status'
import { OptionButton, Screen, StepHeader } from '../../ui'
import { TEXT_SPEEDS, setTextSpeed, useTextSpeed } from './text-speed'

type RelayCheck = { state: 'idle' } | { state: 'checking' } | { state: 'ok'; ms: number } | { state: 'failed' }
type PackState = { state: 'loading' } | { state: 'ok'; version: string; species: number; moves: number } | { state: 'failed' }
type EngineCheck = { state: 'idle' } | { state: 'checking' } | { state: 'ok'; rounds: number; ms: number } | { state: 'failed' }

export interface OptionsProps {
  offline: OfflineState
  onBack: () => void
}

/** The language, and a check of everything the app relies on: its data, the battle engine, the offline cache, the relay. */
export function Options({ offline, onBack }: OptionsProps) {
  const t = useMessages()
  const language = useLanguage()
  const textSpeed = useTextSpeed()
  const [relay, setRelay] = useState<RelayCheck>({ state: 'idle' })
  const [engine, setEngine] = useState<EngineCheck>({ state: 'idle' })
  const [pack, setPack] = useState<PackState>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadDataPack().then(
      (data) => {
        if (!cancelled) setPack({ state: 'ok', version: data.version, species: Object.keys(data.species).length, moves: Object.keys(data.moves).length })
      },
      () => {
        if (!cancelled) setPack({ state: 'failed' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // The engine is its own chunk: it is only fetched (or read from the offline cache) here, on demand.
  const checkEngine = (): void => {
    setEngine({ state: 'checking' })
    const startedAt = performance.now()
    import('../../battle/self-check').then(
      ({ runEngineSelfCheck }) => {
        try {
          const { rounds } = runEngineSelfCheck()
          setEngine({ state: 'ok', rounds, ms: Math.round(performance.now() - startedAt) })
        } catch {
          setEngine({ state: 'failed' })
        }
      },
      () => setEngine({ state: 'failed' }),
    )
  }

  const checkRelay = (): void => {
    setRelay({ state: 'checking' })
    probeRelay().then(
      (ms) => setRelay({ state: 'ok', ms }),
      () => setRelay({ state: 'failed' }),
    )
  }

  const offlineText = { unsupported: t.system.offlineUnsupported, preparing: t.system.offlinePreparing, sprites: t.system.offlineSprites(offline.sprites?.done ?? 0, offline.sprites?.of ?? 0), ready: t.system.offlineReady }[offline.status]
  const relayText = { idle: '', checking: t.system.relayChecking, ok: relay.state === 'ok' ? t.system.relayOk(relay.ms) : '', failed: t.system.relayFailed }[relay.state]
  const packText = pack.state === 'ok' ? t.system.dataPackOk(pack.version, pack.species, pack.moves) : pack.state === 'loading' ? t.system.dataPackLoading : t.system.dataPackFailed
  const engineText = { idle: '', checking: t.system.engineChecking, ok: engine.state === 'ok' ? t.system.engineOk(engine.rounds, engine.ms) : '', failed: t.system.engineFailed }[engine.state]

  return (
    <div className="dn-page">
      <Screen kind="menu" label={t.options.title} tall>
        <StepHeader title={t.options.title} />
        <div className="dn-stack">
          <div role="radiogroup" aria-label={t.language.label} className="dn-entry">
            <span className="dn-label">{t.language.label}</span>
            <div className="dn-row">
              {LANGUAGES.map((code) => (
                <OptionButton key={code} role="radio" aria-checked={language === code} onClick={() => setLanguage(code)}>
                  {t.language[code]}
                </OptionButton>
              ))}
            </div>
          </div>

          <div role="radiogroup" aria-label={t.options.textSpeed} className="dn-entry">
            <span className="dn-label">{t.options.textSpeed}</span>
            <p className="dn-note">{t.options.textSpeedHint}</p>
            <div className="dn-row">
              {TEXT_SPEEDS.map((speed) => (
                <OptionButton key={speed} role="radio" aria-checked={textSpeed === speed} onClick={() => setTextSpeed(speed)}>
                  {t.options.textSpeeds[speed]}
                </OptionButton>
              ))}
            </div>
          </div>

          <section aria-labelledby="system-title" className="dn-entry">
            <h2 id="system-title" className="dn-label">
              {t.system.title}
            </h2>
            <dl className="dn-facts">
              <dt>{t.system.appVersion}</dt>
              <dd>{__APP_VERSION__}</dd>
              <dt>{t.system.engineVersion}</dt>
              <dd>@pkmn/sim {__ENGINE_VERSION__}</dd>
              <dt>{t.system.dataPack}</dt>
              <dd role="status">{packText}</dd>
              <dt>{t.system.offline}</dt>
              {/* The count of sprites is not read out as it moves; the two states around it are. */}
              <dd role={offline.status === 'sprites' ? undefined : 'status'}>{offlineText}</dd>
              <dt>{t.system.engine}</dt>
              <dd role="status">{engineText}</dd>
              <dt>{t.system.relay}</dt>
              <dd role="status">{relayText}</dd>
            </dl>
            <div className="dn-row">
              <OptionButton onClick={checkEngine} disabled={engine.state === 'checking'}>
                {t.system.engineCheck}
              </OptionButton>
              <OptionButton onClick={checkRelay} disabled={relay.state === 'checking'}>
                {t.system.relayCheck}
              </OptionButton>
            </div>
            {offline.updateAvailable && (
              <p className="dn-note" role="status">
                {t.system.updateAvailable}{' '}
                <OptionButton primary onClick={offline.applyUpdate}>
                  {t.system.updateNow}
                </OptionButton>
              </p>
            )}
          </section>
          <p className="dn-note">{t.app.notice}</p>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{t.nav.back}</OptionButton>
        </div>
      </Screen>
    </div>
  )
}
