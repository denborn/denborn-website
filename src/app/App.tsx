import { useState } from 'react'
import { LANGUAGES, setLanguage, useLanguage, useMessages } from '../i18n'
import { probeRelay } from '../network/relay-probe'
import { useOfflineStatus } from '../pwa/use-offline-status'

type RelayCheck = { state: 'idle' } | { state: 'checking' } | { state: 'ok'; ms: number } | { state: 'failed' }

export function App() {
  const t = useMessages()
  const language = useLanguage()
  const offline = useOfflineStatus()
  const [relay, setRelay] = useState<RelayCheck>({ state: 'idle' })

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
