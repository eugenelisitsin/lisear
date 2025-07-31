class LisearApp {
    constructor() {
        this.audioContext = null;
        this.currentExercise = null;
        this.currentTonic = null;
        this.selectedTempo = 30; // Default BPM
        this.beatDuration = 60 / this.selectedTempo; // seconds per beat
        
        // Exercise state
        this.exerciseActive = false;
        this.currentProgression = [];
        this.currentChordIndex = 0;
        this.identifiedChords = [];
        
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
        this.resetExerciseState();
        this.showExerciseScreen();
    }
    
    resetExerciseState() {
        this.exerciseActive = false;
        this.currentProgression = [];
        this.currentChordIndex = 0;
        this.identifiedChords = ['_', '_', '_', '_'];
    }
    
    getRandomTonic() {
        return this.notes[Math.floor(Math.random() * this.notes.length)];
    }
    
    showExerciseScreen() {
        const exerciseName = this.currentExercise === 'major' ? 'Major Scale' : 'Minor Scale';
        const chordButtons = this.getChordButtons();
        const controlButtons = this.getControlButtons();
        
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="exercise-header">
                <button onclick="app.showHomeScreen()">Home</button>
                <div class="exercise-title">
                    <h2>${exerciseName}</h2>
                    <p>Tonic: ${this.currentTonic}</p>
                </div>
                ${controlButtons}
            </div>
            
            <div class="tempo-control">
                <label for="tempo-input">Tempo:</label>
                <input type="number" id="tempo-input" min="20" max="120" value="${this.selectedTempo}" 
                       onchange="app.updateTempo(this.value)" ${this.exerciseActive ? 'disabled' : ''}>
                <span>BPM</span>
            </div>
            
            <div class="placeholders">
                ${this.getPlaceholders()}
            </div>
            
            <div class="chord-buttons">
                ${chordButtons}
            </div>
        `;
    }
    
    getControlButtons() {
        if (!this.exerciseActive) {
            return '<button onclick="app.startExerciseFlow()">Start</button>';
        } else {
            return `
                <button onclick="app.nextTry()">Next try</button>
                <button onclick="app.repeatProgression()">Repeat</button>
            `;
        }
    }
    
    getPlaceholders() {
        return this.identifiedChords.map((chord, index) => 
            `<div class="placeholder" id="placeholder-${index}">${chord}</div>`
        ).join('');
    }
    
    getChordButtons() {
        const chords = this.currentExercise === 'major' 
            ? ['I', 'ii', 'iii', 'IV', 'V', 'vi']
            : ['i', 'III', 'iv', 'V', 'VI', 'VII'];
            
        return chords.map(chord => 
            `<button class="chord-button" onclick="app.handleChordGuess('${chord}')">${chord}</button>`
        ).join('');
    }
    
    updateTempo(newTempo) {
        this.selectedTempo = parseInt(newTempo);
        this.beatDuration = 60 / this.selectedTempo;
    }
    
    generateRandomProgression() {
        const chords = this.currentExercise === 'major' 
            ? ['I', 'ii', 'iii', 'IV', 'V', 'vi']
            : ['i', 'III', 'iv', 'V', 'VI', 'VII'];
            
        this.currentProgression = [];
        for (let i = 0; i < 4; i++) {
            const randomChord = chords[Math.floor(Math.random() * chords.length)];
            this.currentProgression.push(randomChord);
        }
    }
    
    startExerciseFlow() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        this.exerciseActive = true;
        this.generateRandomProgression();
        this.currentChordIndex = 0;
        this.identifiedChords = ['_', '_', '_', '_'];
        
        // Update UI to show new buttons
        this.showExerciseScreen();
        
        // Play cadence first, then progression
        this.playSequence();
    }
    
    playSequence() {
        const cadence = this.currentExercise === 'major' 
            ? ['I', 'IV', 'V', 'I']
            : ['i', 'iv', 'V', 'i'];
        
        // Play cadence
        cadence.forEach((chord, index) => {
            setTimeout(() => {
                this.playChord(chord);
            }, index * this.beatDuration * 1000);
        });
        
        // Play progression after cadence + 4-beat pause
        const cadenceDelay = cadence.length * this.beatDuration * 1000;
        const pauseDelay = 4 * this.beatDuration * 1000; // 4 beats pause
        const totalDelay = cadenceDelay + pauseDelay;
        
        this.currentProgression.forEach((chord, index) => {
            setTimeout(() => {
                this.playChord(chord);
            }, totalDelay + index * this.beatDuration * 1000);
        });
    }
    
    repeatProgression() {
        this.playSequence();
    }
    
    nextTry() {
        this.currentTonic = this.getRandomTonic();
        this.generateRandomProgression();
        this.currentChordIndex = 0;
        this.identifiedChords = ['_', '_', '_', '_'];
        this.showExerciseScreen();
        this.playSequence();
    }
    
    handleChordGuess(guessedChord) {
        if (!this.exerciseActive) {
            // If exercise not active, just play the chord for reference
            this.playChord(guessedChord);
            return;
        }
        
        const correctChord = this.currentProgression[this.currentChordIndex];
        
        if (guessedChord === correctChord) {
            // Correct guess
            this.identifiedChords[this.currentChordIndex] = guessedChord;
            this.updatePlaceholder(this.currentChordIndex, guessedChord);
            this.currentChordIndex++;
            
            // Check if exercise is complete
            if (this.currentChordIndex >= 4) {
                // All chords identified - wait for "Next try"
                return;
            }
        } else {
            // Incorrect guess - flash red
            this.flashPlaceholder(this.currentChordIndex);
        }
    }
    
    updatePlaceholder(index, chord) {
        const placeholder = document.getElementById(`placeholder-${index}`);
        if (placeholder) {
            placeholder.textContent = chord;
        }
    }
    
    flashPlaceholder(index) {
        const placeholder = document.getElementById(`placeholder-${index}`);
        if (placeholder) {
            placeholder.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            setTimeout(() => {
                placeholder.style.backgroundColor = '';
            }, 500); // 0.5 seconds
        }
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