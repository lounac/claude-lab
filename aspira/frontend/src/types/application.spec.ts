import { describe, it, expect } from 'vitest'
import { listenPfad } from './application'

describe('listenPfad', () => {
  it('schickt "interessant" auf die Merkliste', () => {
    expect(listenPfad('interessant')).toBe('/merkliste')
  })

  it('schickt alle anderen Status in "Meine Stellen"', () => {
    expect(listenPfad('beworben')).toBe('/')
    expect(listenPfad('in vorbereitung')).toBe('/')
  })
})
