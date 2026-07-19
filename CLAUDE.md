This is a Capacitor-based PWA (Progressive Web App) project called "Lisear" that's set up for iOS deployment. 

The master files of the PWA itself are in www/ directory. Ignore everything else.

The app helps users train their ear to recognize chords in a melody.

Deployment
    GitHub repo: https://github.com/eugenelisitsin/lisear
    Live at: https://apps.lisitsin.com/lisear/
    Auto-deploys on push to main (changes to www/ folder)

Basic Definitions 
    An interval is the distance between two notes.
    An octave is the interval between two notes with the same name (e.g., C to the next C)
    Most common intervals are whole steps and half steps. A half step is the smallest interval, and a whole step is two half steps.
    There is 12 half steps in an octave
    A scale is a set of musical notes ordered by pitch, typically within the span of an octave. Each note in a scale is assigned a degree, first note is assigned first degree, it is also called the root or the tonic.
    A major scale follows the interval pattern: whole, whole, half, whole, whole, whole, half. 
    A natural minor scale follows the interval pattern: whole, half, whole, whole, half, whole, whole
    Major chord is three notes following the interval pattern: four half steps, three half steps. Major chord starting with a note with is denoted with the note's Roman numeral in capital letter, e.g.: I, V, VI. 
    Minor chord is three notes following the interval pattern: three half steps, four half steps. Minor chord starting with a note with is denoted with the note's Roman numeral in capital letter, e.g.: i, v, vi.
    Cadence is a sequence of chords: I IV V I for major scale, i iv V i for natural minor scale
    Harmonic chord playing is when all three notes in chord are played simultaneously

App Functionality

Global Settings
    Default tempo: 30 BPM (configurable 20-120)
    Cadence tempo: fixed 90 BPM
    Volume: adjustable via slider
    
Audio Synthesis
    Enhanced Web Audio synthesis with:
        Staggered note attacks (15-25ms offset) for chord clarity
        Stereo panning based on pitch (low=left, high=right)
        Attack noise burst for transient definition
        Per-note detuning (±5 cents) and inharmonicity
        Velocity scaling by pitch (bass louder, treble softer)
        Improved reverb with stereo early reflections
        Compressor to prevent clipping

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
            Cadence plays harmonically at fixed 90 BPM
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
