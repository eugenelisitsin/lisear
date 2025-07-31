This is a Capacitor-based PWA (Progressive Web App) project called "Lisear" that's set up for iOS deployment. 

The master files of the PWA itself are in www/ directory. Ignore everything else.

The app should help user to train ear to recognize chords in a melody.

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

Global things
    The tempo is 60 bpm

Home Screen
    List of exercises, each exercise is a button
    For now there will be 2 exercises named "Major Scale" and "Minor Scale"
    Pressing on the button opens the exercise screen


Exercise Screen (1)
    Layout:
        At the top of the screen: exercise name, Home button, Start button
        Middle of the screen: a set of four empty placeholders (e.g., _ _ _ _) 
        Bottom of the screen: button with chord names depending of the chosen exercise:
            Major Scale: I ii iii IV V vi
            Minor Scale: i III iv V VI VII
    Behaviour:
        When the exercise screen is opened, the app randomly chooses the tonic
        When the user presses "Start", the cadence corresponding to the exercise scale is played harmonically, with a chord on each beat
        When the user presses the any of the buttons denoting chords, the corresponding chord is played harmonically
    

Future functionality:
The app will play chord sequences and ask the user to identify the chords and press the corresponding buttons
The app will also be wrapped in an iOS app
