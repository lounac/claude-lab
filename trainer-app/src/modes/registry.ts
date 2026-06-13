import type { ComponentType } from 'react'
import LearnMode from './LearnMode'
import QuizMode from './QuizMode'

// Zentrale Registry der Modi.
// Neuer Modus = neue Datei in src/modes/ + ein Eintrag hier. Sonst nichts:
// Navigation (Layout) und Routing (App) lesen automatisch aus dieser Liste.

export interface ModeDef {
  id: string
  path: string
  title: string
  /** Emoji als einfaches Icon. */
  icon: string
  description: string
  component: ComponentType
}

export const modes: ModeDef[] = [
  {
    id: 'learn',
    path: '/learn',
    title: 'Firmenwissen',
    icon: '📚',
    description: 'Firma per URL recherchieren und aufbereiten lassen.',
    component: LearnMode,
  },
  {
    id: 'quiz',
    path: '/quiz',
    title: 'Quiz',
    icon: '❓',
    description: 'Wissensfragen zur Firma beantworten und auswerten.',
    component: QuizMode,
  },
]
