import { useEffect } from 'react'

const APP = 'Denborn'

/** Names the page in the browser's tab and history: its own title, then the app's. */
export function usePageTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : APP
  }, [title])
}
