class LisearApp {
    constructor() {
        this.audioContext = null;
        this.currentExercise = null;
        this.currentTonic = null;
        this.tempo = 60; // BPM
        this.beatDuration = 60 / this.tempo; // seconds per beat
        
        // Note frequencies (C4 = 261.63 Hz)
        this.noteFrequencies = {
            'C': 261.63,
            'C#': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'B': 493.88
        };
        
        this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        this.init();
    }
    
    init() {
        // Initialize audio context on user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
        
        this.showHomeScreen();
    }
    
    showHomeScreen() {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <h1>Lisear</h1>
            <p>Train your ear to recognize chords</p>
            <div class="exercise-buttons">
                <button onclick="app.startExercise('major')">Major Scale</button>
                <button onclick="app.startExercise('minor')">Minor Scale</button>
            </div>
        `;
    }
    
    startExercise(type) {
        this.currentExercise = type;
        this.currentTonic = this.getRandomTonic();
        this.showExerciseScreen();
    }
    
    getRandomTonic() {
        return this.notes[Math.floor(Math.random() * this.notes.length)];
    }
    
    showExerciseScreen() {
        const exerciseName = this.currentExercise === 'major' ? 'Major Scale' : 'Minor Scale';
        const chordButtons = this.getChordButtons();
        
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="exercise-header">
                <button onclick="app.showHomeScreen()">Home</button>
                <div class="exercise-title">
                    <h2>${exerciseName}</h2>
                    <p>Tonic: ${this.currentTonic}</p>
                </div>
                <button onclick="app.playStartSequence()">Start</button>
            </div>
            
            <div class="placeholders">
                <div class="placeholder">_</div>
                <div class="placeholder">_</div>
                <div class="placeholder">_</div>
                <div class="placeholder">_</div>
            </div>
            
            <div class="chord-buttons">
                ${chordButtons}
            </div>
        `;
    }
    
    getChordButtons() {
        const chords = this.currentExercise === 'major' 
            ? ['I', 'ii', 'iii', 'IV', 'V', 'vi']
            : ['i', 'III', 'iv', 'V', 'VI', 'VII'];
            
        return chords.map(chord => 
            `<button class="chord-button" onclick="app.playChord('${chord}')">${chord}</button>`
        ).join('');
    }
    
    playStartSequence() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const cadence = this.currentExercise === 'major' 
            ? ['I', 'IV', 'V', 'I']
            : ['i', 'iv', 'V', 'i'];
            
        cadence.forEach((chord, index) => {
            setTimeout(() => {
                this.playChord(chord);
            }, index * this.beatDuration * 1000);
        });
    }
    
    playChord(chordSymbol) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const frequencies = this.getChordFrequencies(chordSymbol);
        const now = this.audioContext.currentTime;
        const duration = 0.8;
        
        frequencies.forEach(freq => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            // Envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
        });
    }
    
    getChordFrequencies(chordSymbol) {
        const tonicIndex = this.notes.indexOf(this.currentTonic);
        const baseFreq = this.noteFrequencies[this.currentTonic];
        
        // Determine chord type and scale degree
        const isMinorChord = chordSymbol.toLowerCase() === chordSymbol;
        const degree = this.getScaleDegree(chordSymbol);
        
        // Get root note of the chord
        const scaleIntervals = this.currentExercise === 'major' 
            ? [0, 2, 4, 5, 7, 9, 11] // Major scale intervals
            : [0, 2, 3, 5, 7, 8, 10]; // Natural minor scale intervals
            
        const chordRootSemitones = scaleIntervals[degree - 1];
        const chordRootIndex = (tonicIndex + chordRootSemitones) % 12;
        const chordRootFreq = this.noteFrequencies[this.notes[chordRootIndex]];
        
        // Build chord (root, third, fifth)
        const frequencies = [chordRootFreq]; // Root
        
        if (isMinorChord) {
            // Minor chord: root + minor third (3 semitones) + perfect fifth (7 semitones)
            frequencies.push(chordRootFreq * Math.pow(2, 3/12)); // Minor third
            frequencies.push(chordRootFreq * Math.pow(2, 7/12)); // Perfect fifth
        } else {
            // Major chord: root + major third (4 semitones) + perfect fifth (7 semitones)
            frequencies.push(chordRootFreq * Math.pow(2, 4/12)); // Major third
            frequencies.push(chordRootFreq * Math.pow(2, 7/12)); // Perfect fifth
        }
        
        return frequencies;
    }
    
    getScaleDegree(chordSymbol) {
        const romanNumerals = {
            'I': 1, 'i': 1,
            'II': 2, 'ii': 2,
            'III': 3, 'iii': 3,
            'IV': 4, 'iv': 4,
            'V': 5, 'v': 5,
            'VI': 6, 'vi': 6,
            'VII': 7, 'vii': 7
        };
        
        return romanNumerals[chordSymbol] || 1;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LisearApp();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}