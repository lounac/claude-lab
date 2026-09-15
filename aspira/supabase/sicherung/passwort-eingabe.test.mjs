import { test } from 'node:test'
import assert from 'node:assert/strict'
import { passwortEingabe } from './passwort-eingabe.mjs'

function tippe(...stuecke) {
  let stand = { passwort: '', fertig: false, abgebrochen: false }
  for (const s of stuecke) {
    stand = passwortEingabe(stand.passwort, s)
    if (stand.fertig || stand.abgebrochen) break
  }
  return stand
}

test('übernimmt getippte Zeichen bis Enter', () => {
  assert.deepEqual(tippe('g', 'e', 'h', 'e', 'i', 'm', '\r'), {
    passwort: 'geheim',
    fertig: true,
    abgebrochen: false,
  })
})

test('Rücktaste löscht das letzte Zeichen', () => {
  assert.equal(tippe('abx', '\b', 'c\r').passwort, 'abc')
  assert.equal(tippe('abx', '\u007f', 'c\r').passwort, 'abc')
})

test('entfernt Bracketed-Paste-Markierungen beim Einfügen', () => {
  assert.equal(tippe('\x1b[200~Pa$$wört!\x1b[201~', '\r').passwort, 'Pa$$wört!')
})

test('ignoriert ein \\n ganz am Anfang (Rest der E-Mail-Zeile)', () => {
  assert.deepEqual(tippe('\n', 'abc', '\r'), { passwort: 'abc', fertig: true, abgebrochen: false })
})

test('ignoriert Pfeiltasten und andere Steuerzeichen', () => {
  assert.equal(tippe('ab\x1b[D', '\u0016', 'c\r').passwort, 'abc')
})

test('behält Leerzeichen und Sonderzeichen', () => {
  assert.equal(tippe(' ä ß € \r').passwort, ' ä ß € ')
})

test('Strg+C bricht ab', () => {
  assert.equal(tippe('abc', '\u0003').abgebrochen, true)
})
