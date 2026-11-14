import { useEffect, useState } from 'react'
import { loadDataPack } from '../data/pack'
import { LANGUAGES, setLanguage, useLanguage, useMessages } from '../i18n'
import { probeRelay } from '../network/relay-probe'
import { useOfflineStatus } from '../pwa/use-offline-status'

type RelayCheck = { state: 'idle' } | { state: 'checking' } | { state: 'ok'; ms: number } | { state: 'failed' }
type PackState = { state: 'loading' } | { state: 'ok'; version: string; species: number; moves: number } | { state: 'failed' }
type EngineCheck = { state: 'idle' } | { state: 'checking' } | { state: 'ok'; rounds: number; ms: number } | { state: 'failed' }

export function App() {
  const t = useMessages()
  const language = useLanguage()
  const offline = useOfflineStatus()
  const [relay, setRelay] = useState<RelayCheck>({ state: 'idle' })
  const [engine, setEngine] = useState<EngineCheck>({ state: 'idle' })
  const [pack, setPack] = useState<PackState>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadDataPack().then(
      (data) => {
        if (cancelled) return
        setPack({
          state: 'ok',
          version: data.version,
          species: Object.keys(data.species).length,
          moves: Object.keys(data.moves).length,
        })
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
    import('../battle/self-check').then(
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

  const offlineText = {
    unsupported: t.system.offlineUnsupported,
    preparing: t.system.offlinePreparing,
    ready: t.system.offlineReady,
  }[offline.status]

  const relayText = {
    idle: '',
    checking: t.system.relayChecking,
    ok: relay.state === 'ok' ? t.system.relayOk(relay.ms) : '',
    failed: t.system.relayFailed,
  }[relay.state]

  const packText =
    pack.state === 'ok'
      ? t.system.dataPackOk(pack.version, pack.species, pack.moves)
      : pack.state === 'loading'
        ? t.system.dataPackLoading
        : t.system.dataPackFailed

  const engineText = {
    idle: '',
    checking: t.system.engineChecking,
    ok: engine.state === 'ok' ? t.system.engineOk(engine.rounds, engine.ms) : '',
    failed: t.system.engineFailed,
  }[engine.state]

  return (
    <main className="shell">
      <header>
        <h1>{t.app.name}</h1>
        <p>{t.app.tagline}</p>
      </header>

      <section aria-labelledby="system-title">
        <h2 id="system-title">{t.system.title}</h2>
        <dl>
          <dt>{t.system.appVersion}</dt>
          <dd>{__APP_VERSION__}</dd>
          <dt>{t.system.engineVersion}</dt>
          <dd>@pkmn/sim {__ENGINE_VERSION__}</dd>
          <dt>{t.system.dataPack}</dt>
          <dd role="status">{packText}</dd>
          <dt>{t.system.engine}</dt>
          <dd>
            <button type="button" onClick={checkEngine} disabled={engine.state === 'checking'}>
              {t.system.engineCheck}
            </button>{' '}
            <span role="status">{engineText}</span>
          </dd>
          <dt>{t.system.offline}</dt>
          <dd role="status">{offlineText}</dd>
          <dt>{t.system.relay}</dt>
          <dd>
            <button type="button" onClick={checkRelay} disabled={relay.state === 'checking'}>
              {t.system.relayCheck}
            </button>{' '}
            <span role="status">{relayText}</span>
          </dd>
        </dl>
        {offline.updateAvailable && (
          <p role="status">
            {t.system.updateAvailable}{' '}
            <button type="button" onClick={offline.applyUpdate}>
              {t.system.updateNow}
            </button>
          </p>
        )}
      </section>

      <fieldset>
        <legend>{t.language.label}</legend>
        {LANGUAGES.map((code) => (
          <label key={code}>
            <input
              type="radio"
              name="language"
              value={code}
              checked={language === code}
              onChange={() => setLanguage(code)}
            />
            {t.language[code]}
          </label>
        ))}
      </fieldset>

      <footer>
        <small>{t.app.notice}</small>
      </footer>
    </main>
  )
}
