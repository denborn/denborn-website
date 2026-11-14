import type { Decorator, Preview } from '@storybook/react-vite'
import { MotionConfig } from 'motion/react'
import { type CSSProperties, Suspense } from 'react'
// The four candidate fonts, Latin and extended Latin only (French accents included).
import '@fontsource/dotgothic16/latin-400.css'
import '@fontsource/dotgothic16/latin-ext-400.css'
import '@fontsource/pixelify-sans/latin-400.css'
import '@fontsource/pixelify-sans/latin-ext-400.css'
import '@fontsource/tiny5/latin-400.css'
import '@fontsource/tiny5/latin-ext-400.css'
import '@fontsource/vt323/latin-400.css'
import '@fontsource/vt323/latin-ext-400.css'
import '../src/ui/tokens.css'
import '../src/ui/kit.css'
import './preview.css'
import { FONT_CANDIDATES, type FontId, type Locale, LocaleContext } from '../src/ui/stories/board'

function fontOf(value: unknown): FontId {
  return typeof value === 'string' && value in FONT_CANDIDATES ? (value as FontId) : 'dotgothic16'
}

/** Every story runs inside the kit's root, in the language and the font picked in the toolbar. */
const withDenborn: Decorator = (Story, context) => {
  const locale: Locale = context.globals.locale === 'fr' ? 'fr' : 'en'
  const font = FONT_CANDIDATES[fontOf(context.globals.font)]
  const style = { '--dn-font': font.family, '--dn-font-scale': font.scale } as CSSProperties
  return (
    <MotionConfig reducedMotion="user">
      <LocaleContext.Provider value={locale}>
        <div className="dn-root sb-board" lang={locale} style={style}>
          <Suspense fallback={null}>
            <Story />
          </Suspense>
        </div>
      </LocaleContext.Provider>
    </MotionConfig>
  )
}

const preview: Preview = {
  decorators: [withDenborn],
  globalTypes: {
    locale: {
      description: 'Language',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        dynamicTitle: true,
        items: [
          { value: 'en', title: 'English' },
          { value: 'fr', title: 'Français' },
        ],
      },
    },
    font: {
      description: 'Font candidate',
      toolbar: {
        title: 'Font',
        icon: 'document',
        dynamicTitle: true,
        items: Object.entries(FONT_CANDIDATES).map(([value, font]) => ({ value, title: font.name })),
      },
    },
  },
  initialGlobals: { locale: 'en', font: 'dotgothic16' },
  parameters: {
    layout: 'fullscreen',
    options: { storySort: { order: ['To decide', 'Scenes', 'Foundations', 'Components'] } },
  },
}

export default preview
