import { describe, expect, it } from 'vitest'
import { pickTitleAnimation } from './title-animation'

describe('the title screen’s animation', () => {
  it('is as the device kept it, and on when it kept nothing or something else', () => {
    expect(pickTitleAnimation('off')).toBe('off')
    expect(pickTitleAnimation('on')).toBe('on')
    expect(pickTitleAnimation(null)).toBe('on')
    expect(pickTitleAnimation('sometimes')).toBe('on')
  })
})
