# Lisear requirements

What the app does today. Change this file in the same pull request as the behaviour it describes.
Why things are the way they are: `docs/decisions/`.

Lisear helps learners train their ear to recognise the chords of a progression in a key.
The app is a static PWA in `www/` (an iOS wrapper via Capacitor is planned; `ios/` and the
npm files belong to that and are not used by the web app).

Basic Definitions 
    An interval is the distance between two notes.
    An octave is the interval between two notes with the same name (e.g., C to the next C)
    Most common intervals are whole steps and half steps. A half step is the smallest interval, and a whole step is two half steps.
    There is 12 half steps in an octave
    A scale is a set of musical notes ordered by pitch, typically within the span of an octave. Each note in a scale is assigned a degree, first note is assigned first degree, it is also called the root or the tonic.
    A major scale follows the interval pattern: whole, whole, half, whole, whole, whole, half. 
    A natural minor scale follows the interval pattern: whole, half, whole, whole, half, whole, whole
    Major chord is three notes following the interval pattern: four half steps, three half steps. Major chord starting with a note with is denoted with the note's Roman numeral in capital letter, e.g.: I, V, VI. 
    Minor chord is three notes following the interval pattern: three half steps, four half steps. Minor chord starting with a note with is denoted with the note's Roman numeral in lower-case letters, e.g.: i, v, vi.
    Cadence is a sequence of chords: I IV V I for major scale, i iv V i for natural minor scale
    Harmonic chord playing is when all three notes in chord are played simultaneously

App Functionality

Global Settings
    Default tempo: 30 BPM (configurable 20-120)
    Volume: adjustable via slider
    
Audio
    Sampled piano (www/samples/), played through Web Audio:
        12 MP3 samples a minor third apart, C2 to A4
        Each note plays the nearest sample, pitch-shifted by at most 1.5 semitones
        Samples are loaded and decoded once, on the first user gesture;
            the exercise screen shows "Loading piano samples..." until they are ready
        All generated notes stay inside the sampled range:
            chord voicings 36-57 (C3-A4), melody notes 45-57 (A3-A4)
        Staggered note attacks (15-25ms offset) for chord clarity
        Stereo panning based on pitch (low=left, high=right)
        Velocity scaling by pitch (bass louder, treble softer)
        Gain envelope damps the sample tail when a note ends
        Reverb with stereo early reflections
        Compressor to prevent clipping
        Peak output around -7 dBFS at the default volume

Offline / caching
    Service worker caches the app shell and all samples
    Samples are served cache-first; HTML/JS/CSS are network-first so a deploy
        shows up without waiting for a cache-name bump

Home Screen
    List of exercises, each exercise is a button
    For now there will be 2 exercises named "Major Scale" and "Minor Scale"
    Pressing on the button opens the exercise screen


Exercise Screen
    Layout:
        Header: 
            Home button
            Exercise name and current tonic
            Start button (or Next/Repeat buttons when active)
        Stats bar:
            Streak counter (consecutive correct answers)
            Session score (correct/total)
        Controls:
            Tempo: number input 20-120 BPM (default 30)
            Volume: slider control
            Mode toggle: Harmonic / Melodic
        Playback state indicator: "Press Start", "Listening...", or "Your turn!"
        Placeholders: four slots showing identified chords (e.g., _ _ _ _)
            Active placeholder (awaiting answer) has green pulsing border
            Currently playing chord has gold highlight
        Chord buttons:
            Major Scale: I ii iii IV V vi
            Minor Scale: i III iv V VI VII
            Disabled during playback
    
    Playback Modes:
        Harmonic: all three chord notes played simultaneously
        Melodic: chord played as 4-note arpeggio sequence
            Always starts with root note
            Third and fifth follow in random order
            Fourth note repeats one chord tone
            All three chord tones (root, third, fifth) appear in each sequence
    
    Behaviour:
        When opened, app randomly chooses a tonic
        Preferences (tempo, mode, volume) persist in localStorage
        When "Start" is pressed:
            Start button replaced with Next/Repeat
            Cadence plays harmonically at the chosen tempo
            After 1.5s pause, chord progression plays at chosen tempo
            Placeholders highlight as each chord plays
            User identifies chords by pressing chord buttons
            Correct: placeholder fills, move to next chord
            Incorrect: placeholder flashes red with shake animation, streak resets
            All correct: auto-starts next exercise after 1 second
        Repeat: replays cadence and progression
        Next: new tonic, new progression, restart exercise 
    

Future functionality:
    iOS app wrapper via Capacitor
    Additional exercise types
    Progressive difficulty levels
    Achievement/badge system
