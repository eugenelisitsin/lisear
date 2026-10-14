# D6. Harmonic chords: root in the bass, triad around middle C

- **Date:** 2026-10-15 (#2)

Learners could hardly tell harmonic chords apart. Causes found:

1. **No bass line.** The triad was voice-led for minimal motion with nothing under it, so its lowest note was often
   the third or fifth. Hearing a chord's function relies mostly on the root movement in the bass.
2. **Muddy register.** Close triads sat in C3–A4 (the samples ended at A4); close thirds below ~E3 blur.
3. **The "reverb" was five early taps at 15–80 ms plus four later ones**, together about as loud as the dry
   sound: a comb filter that smeared the pitches.

Decided:

- **Bass setting**, default *Root*: the root alone in A2–G#3 under a close-position triad in D4–G5, at least six
  semitones apart. *Inversions* keeps the old sound (triad alone in C3–A4) as a harder level. The cadence follows the
  setting in both play modes, so the key is set up the same way the chords will sound.
- Voice leading over all close-position voicings in the range: least total voice motion, plus a pull towards the
  middle of the range (weight 0.5 per semitone of the chord's mean) so long sequences don't drift to an edge.
- Four more Salamander Grand Piano samples (Alexander Holm, CC BY 3.0; same source as the others), C5–A5
  (≈220 KB), so the triad can sit above middle C. C6 not needed.
- Reverb replaced by a convolver with a generated 1.4 s stereo impulse (decaying, darkening noise, 12 ms
  pre-delay), about 12 dB below the dry sound.
- Melodic mode unchanged: it arpeggiates triads voiced in C3–A4.
- The music logic moved to `www/music.js` (pure, no DOM/audio) so `tests/` can check every tonic, chord and range.

Loudness measured by offline rendering of an eight-chord progression: peak −3.6 dBFS / RMS −20.6 dBFS, versus
−3.2 / −21.2 before.
