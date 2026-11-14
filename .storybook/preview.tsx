import type { Decorator, Preview } from '@storybook/react-vite'
import { MotionConfig } from 'motion/react'
import { Suspense } from 'react'
import '../src/ui/styles.css'
import './preview.css'
import { type Locale, LocaleContext } from '../src/ui/stories/board'

/** Every story runs inside the kit's root, in the language picked in the toolbar. */
const withDenborn: Decorator = (Story, context) => {
  const locale: Locale = context.globals.locale === 'fr' ? 'fr' : 'en'
  return (
    <MotionConfig reducedMotion="user">
      <LocaleContext.Provider value={locale}>
        <div className="dn-root sb-board" lang={locale}>
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
  },
  initialGlobals: { locale: 'en' },
  parameters: {
    layout: 'fullscreen',
    options: { storySort: { order: ['To decide', 'Scenes', 'Foundations', 'Components'] } },
  },
}

export default preview
