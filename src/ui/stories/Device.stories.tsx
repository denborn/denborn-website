import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Account } from '../../features/account/Account'
import { Credits } from '../../features/credits/Credits'
import { Home } from '../../features/home/Home'
import { LoadingScreen } from '../../features/home/LoadingScreen'
import { DualScreenFrame } from '../DualScreen'
import { Device, Note, Phone, Section } from './board'

/** The windows the DS is judged in: their name on the board, their size in CSS pixels. */
const WINDOWS = [
  { name: 'A small phone', width: 320, height: 568 },
  { name: 'A phone, the app installed', width: 412, height: 839 },
  { name: 'A phone, in a browser with its bars', width: 393, height: 660 },
  { name: 'A laptop’s window', width: 960, height: 650 },
  { name: 'A phone on its side', width: 844, height: 390 },
] as const

function Windows() {
  return (
    <div className="sb-stack" style={{ justifyItems: 'center' }}>
      <Note>
        The app is a DS (decisions 214 to 216): two screens, one over the other, each exactly 4:3, each showing its own thing. Together they
        are as large as fits in the window, never wider than 480 px, with black around them; the window itself never scrolls. What is longer
        than the bottom screen scrolls inside it: here the credits, under the den in the rain that a page with nothing of its own shows on
        top (decision 217). The one exception is the last window. The DS is never drawn narrower than 320 px, the narrowest phone the kit
        is made for, so a window under 480 px high scrolls down to the bottom screen: a phone on its side, or a page enlarged four times in
        a browser.
      </Note>
      {WINDOWS.map(({ name, width, height }) => (
        <Section key={name} title={`${name}: ${width} × ${height}`}>
          <Device width={width} height={height}>
            <Credits onBack={() => undefined} />
          </Device>
        </Section>
      ))}
    </div>
  )
}

/** Three of the app's screens in the app's own frame, to go between as the app does. */
function Changes() {
  const [at, setAt] = useState<'loading' | 'home' | 'account'>('home')
  return (
    <Phone>
      <Note>
        How a screen changes (decisions 218 and 219). The two screens stay; nothing fades. Press ACCOUNT, then BACK: the den is the same
        screen on both, so it carries on and its rain never stops, while the bottom screen’s pieces fly out and the next ones fly in. The
        title goes up over the top edge; rows go out by the left when going further in and by the right when coming back; a button goes
        by the side it is nearest to. “Loading” has another backdrop on top: black stripes sweep in from both sides, close, and sweep on
        off the next screen. With reduced motion a screen is replaced at once. All of it is Denborn’s own, after the games’ battle menu
        and the stripes before a fight, and is to be judged here.
      </Note>
      <div className="sb-tools">
        <button type="button" onClick={() => setAt('loading')}>
          Loading
        </button>
        <button type="button" onClick={() => setAt('home')}>
          Home
        </button>
      </div>
      <Device width={412} height={839}>
        <DualScreenFrame route={at} depth={at === 'account' ? 1 : 0}>
          {at === 'loading' && <LoadingScreen />}
          {at === 'home' && (
            <Home titled={false} animated onStart={() => undefined} onOpen={(entry) => entry === 'account' && setAt('account')} onUpdate={undefined} />
          )}
          {at === 'account' && <Account onBack={() => setAt('home')} />}
        </DualScreenFrame>
      </Device>
    </Phone>
  )
}

const meta = { title: 'Screens/The DS' } satisfies Meta
export default meta

export const InEveryWindow: StoryObj = { render: () => <Windows /> }
export const Changing: StoryObj = { render: () => <Changes /> }
