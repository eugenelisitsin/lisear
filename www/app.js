class LisearApp {
    constructor() {
        this.audioContext = null;
        this.currentExercise = null;
        this.currentTonic = null;
        this.selectedTempo = 30;
        this.beatDuration = 60 / this.selectedTempo;
        this.volume = 0.8;

        // Exercise state
        this.exerciseActive = false;
        this.currentProgression = [];
        this.currentChordIndex = 0;
        this.identifiedChords = [];
        this.scheduledNodes = [];
        this.playbackState = 'idle'; // 'idle', 'playing', 'answering'
        this.activeChordHighlight = null;

        // Stats
        this.streak = 0;
        this.sessionCorrect = 0;
        this.sessionTotal = 0;

        // Mode state
        this.playMode = 'harmonic';
        this.melodyDensity = 2;

        // Voiced progressions
        this.voicedCadence = [];
        this.voicedProgression = [];

        this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // Audio nodes
        this.reverbSetup = false;
        this.masterGain = null;
        this.reverbGain = null;
        this.dryGain = null;
        this.compressor = null;

        this.loadPreferences();
        this.init();
    }

    // ========================
    // Persistence
    // ========================

    loadPreferences() {
        try {
            const saved = localStorage.getItem('lisear_preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.selectedTempo = prefs.tempo || 30;
                this.playMode = prefs.playMode || 'harmonic';
                this.melodyDensity = prefs.melodyDensity || 2;
                this.volume = prefs.volume !== undefined ? prefs.volume : 0.8;
                this.beatDuration = 60 / this.selectedTempo;
            }
        } catch (e) {
            console.warn('Could not load preferences:', e);
        }
    }

    savePreferences() {
        try {
            localStorage.setItem('lisear_preferences', JSON.stringify({
                tempo: this.selectedTempo,
                playMode: this.playMode,
                melodyDensity: this.melodyDensity,
                volume: this.volume
            }));
        } catch (e) {
            console.warn('Could not save preferences:', e);
        }
    }

    init() {
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.setupAudioGraph();
            }
        }, { once: true });

        this.showHomeScreen();
    }

    // ========================
    // Audio Graph Setup
    // ========================

    setupAudioGraph() {
        if (this.reverbSetup) return;
        this.reverbSetup = true;

        const ctx = this.audioContext;

        // Compressor to prevent clipping
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.compressor.connect(ctx.destination);

        // Master output with volume control
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.compressor);

        // Dry signal path
        this.dryGain = ctx.createGain();
        this.dryGain.gain.value = 0.7;
        this.dryGain.connect(this.masterGain);

        // Reverb bus with improved algorithm
        this.reverbGain = ctx.createGain();
        this.reverbGain.gain.value = 0.35;

        // Early reflections
        const earlyReflections = [
            { time: 0.015, gain: 0.5, pan: -0.3 },
            { time: 0.025, gain: 0.4, pan: 0.3 },
            { time: 0.04, gain: 0.35, pan: -0.2 },
            { time: 0.055, gain: 0.3, pan: 0.2 },
            { time: 0.08, gain: 0.2, pan: 0 },
        ];

        // Late reverb tail
        const lateTail = [
            { time: 0.12, gain: 0.15 },
            { time: 0.18, gain: 0.1 },
            { time: 0.25, gain: 0.06 },
            { time: 0.35, gain: 0.03 },
        ];

        // Early reflections with stereo
        earlyReflections.forEach(({ time, gain: g, pan }) => {
            const delay = ctx.createDelay();
            delay.delayTime.value = time;

            const gain = ctx.createGain();
            gain.gain.value = g;

            const panner = ctx.createStereoPanner();
            panner.pan.value = pan;

            // High-shelf filter to darken reflections slightly
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 8000;

            this.reverbGain.connect(delay);
            delay.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(this.masterGain);
        });

        // Late reverb tail (mono, darker)
        lateTail.forEach(({ time, gain: g }) => {
            const delay = ctx.createDelay();
            delay.delayTime.value = time;

            const gain = ctx.createGain();
            gain.gain.value = g;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 4000;

            this.reverbGain.connect(delay);
            delay.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
        });
    }

    getOutputNode() {
        if (!this.reverbSetup) {
            this.setupAudioGraph();
        }
        return { dry: this.dryGain, wet: this.reverbGain };
    }

    updateVolume(value) {
        this.volume = parseFloat(value);
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        this.savePreferences();
    }

    // ========================
    // UI Screens
    // ========================

    showHomeScreen() {
        this.resetExerciseState();
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
        this.streak = 0;
        this.sessionCorrect = 0;
        this.sessionTotal = 0;
        this.showExerciseScreen();
    }

    resetExerciseState() {
        this.exerciseActive = false;
        this.currentProgression = [];
        this.currentChordIndex = 0;
        this.identifiedChords = ['_', '_', '_', '_'];
        this.playbackState = 'idle';
        this.stopAllSound();
        this.clearHighlights();
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
                <button onclick="app.goHome()">Home</button>
                <div class="exercise-title">
                    <h2>${exerciseName}</h2>
                    <p>Tonic: ${this.currentTonic}</p>
                </div>
                ${controlButtons}
            </div>

            <div class="stats-bar">
                <span class="streak" title="Current streak">🔥 ${this.streak}</span>
                <span class="score" title="Session score">${this.sessionCorrect}/${this.sessionTotal}</span>
            </div>

            <div class="controls-row">
                <div class="tempo-control">
                    <label for="tempo-input">Tempo:</label>
                    <input type="number" id="tempo-input" min="20" max="120" value="${this.selectedTempo}"
                           onchange="app.updateTempo(this.value)" ${this.exerciseActive ? 'disabled' : ''}>
                </div>
                <div class="volume-control">
                    <label for="volume-input">🔊</label>
                    <input type="range" id="volume-input" min="0" max="1" step="0.1" value="${this.volume}"
                           oninput="app.updateVolume(this.value)">
                </div>
            </div>

            <div class="mode-control">
                <button class="mode-btn ${this.playMode === 'harmonic' ? 'active' : ''}"
                        onclick="app.setPlayMode('harmonic')" ${this.exerciseActive ? 'disabled' : ''}>Harmonic</button>
                <button class="mode-btn ${this.playMode === 'melodic' ? 'active' : ''}"
                        onclick="app.setPlayMode('melodic')" ${this.exerciseActive ? 'disabled' : ''}>Melodic</button>
            </div>

            ${this.playMode === 'melodic' ? `
            <div class="density-control">
                <span>Notes per chord:</span>
                <button class="density-btn ${this.melodyDensity === 2 ? 'active' : ''}"
                        onclick="app.setMelodyDensity(2)" ${this.exerciseActive ? 'disabled' : ''}>2</button>
                <button class="density-btn ${this.melodyDensity === 4 ? 'active' : ''}"
                        onclick="app.setMelodyDensity(4)" ${this.exerciseActive ? 'disabled' : ''}>4</button>
            </div>
            ` : ''}

            <div class="playback-state" id="playback-state">
                ${this.getPlaybackStateText()}
            </div>

            <div class="placeholders">
                ${this.getPlaceholders()}
            </div>

            <div class="chord-buttons" id="chord-buttons">
                ${chordButtons}
            </div>
        `;

        this.updateChordButtonsState();
    }

    getPlaybackStateText() {
        switch (this.playbackState) {
            case 'playing':
                return '<span class="state-playing">🎵 Listening...</span>';
            case 'answering':
                return '<span class="state-answering">👆 Your turn!</span>';
            default:
                return '<span class="state-idle">Press Start to begin</span>';
        }
    }

    updatePlaybackState(state) {
        this.playbackState = state;
        const el = document.getElementById('playback-state');
        if (el) {
            el.innerHTML = this.getPlaybackStateText();
        }
        this.updateChordButtonsState();
    }

    updateChordButtonsState() {
        const buttons = document.querySelectorAll('.chord-button');
        const disabled = this.playbackState === 'playing';
        buttons.forEach(btn => {
            btn.disabled = disabled;
            btn.classList.toggle('disabled', disabled);
        });
    }

    goHome() {
        this.stopAllSound();
        this.showHomeScreen();
    }

    setPlayMode(mode) {
        this.playMode = mode;
        this.savePreferences();
        this.showExerciseScreen();
    }

    setMelodyDensity(density) {
        this.melodyDensity = density;
        this.savePreferences();
        this.showExerciseScreen();
    }

    getControlButtons() {
        if (!this.exerciseActive) {
            return '<button onclick="app.startExerciseFlow()">Start</button>';
        } else {
            return `
                <button onclick="app.nextTry()">Next</button>
                <button onclick="app.repeatProgression()">Repeat</button>
            `;
        }
    }

    getPlaceholders() {
        return this.identifiedChords.map((chord, index) => {
            const isActive = this.exerciseActive && index === this.currentChordIndex && this.playbackState === 'answering';
            const activeClass = isActive ? 'active' : '';
            return `<div class="placeholder ${activeClass}" id="placeholder-${index}">${chord}</div>`;
        }).join('');
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
        this.savePreferences();
    }

    updateStatsDisplay() {
        const streakEl = document.querySelector('.streak');
        const scoreEl = document.querySelector('.score');
        if (streakEl) streakEl.textContent = `🔥 ${this.streak}`;
        if (scoreEl) scoreEl.textContent = `${this.sessionCorrect}/${this.sessionTotal}`;
    }

    highlightPlaceholder(index) {
        this.clearHighlights();
        const el = document.getElementById(`placeholder-${index}`);
        if (el) {
            el.classList.add('playing');
            this.activeChordHighlight = index;
        }
    }

    clearHighlights() {
        document.querySelectorAll('.placeholder').forEach(el => {
            el.classList.remove('playing', 'active');
        });
        this.activeChordHighlight = null;
    }

    updateActivePlaceholder() {
        document.querySelectorAll('.placeholder').forEach((el, index) => {
            el.classList.toggle('active', index === this.currentChordIndex && this.playbackState === 'answering');
        });
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

    // ========================
    // Voice Leading System
    // ========================

    getScaleDegree(chordSymbol) {
        const romanNumerals = {
            'I': 1, 'i': 1, 'II': 2, 'ii': 2, 'III': 3, 'iii': 3,
            'IV': 4, 'iv': 4, 'V': 5, 'v': 5, 'VI': 6, 'vi': 6,
            'VII': 7, 'vii': 7
        };
        return romanNumerals[chordSymbol] || 1;
    }

    isMinorChord(chordSymbol) {
        return chordSymbol.toLowerCase() === chordSymbol;
    }

    getChordSemitones(chordSymbol) {
        const tonicIndex = this.notes.indexOf(this.currentTonic);
        const degree = this.getScaleDegree(chordSymbol);
        const isMinor = this.isMinorChord(chordSymbol);

        const scaleIntervals = this.currentExercise === 'major'
            ? [0, 2, 4, 5, 7, 9, 11]
            : [0, 2, 3, 5, 7, 8, 10];

        const rootSemitone = 48 + tonicIndex + scaleIntervals[degree - 1];

        if (isMinor) {
            return [rootSemitone, rootSemitone + 3, rootSemitone + 7];
        } else {
            return [rootSemitone, rootSemitone + 4, rootSemitone + 7];
        }
    }

    getInversions(semitones) {
        const [a, b, c] = semitones;
        return [
            [a, b, c],
            [a - 12, b, c],
            [a, b - 12, c],
            [a, b, c - 12],
            [a + 12, b, c],
            [a, b + 12, c],
            [a, b, c + 12],
            [a - 12, b - 12, c],
            [a, b, c + 12],
        ];
    }

    getClosestVoicing(prevVoicing, newChordSemitones) {
        const inversions = this.getInversions(newChordSemitones);
        let bestInversion = inversions[0];
        let bestDistance = Infinity;

        for (const inv of inversions) {
            if (inv.some(n => n < 40 || n > 64)) continue;

            const sorted = [...inv].sort((a, b) => a - b);
            const prevSorted = [...prevVoicing].sort((a, b) => a - b);
            const distance = sorted.reduce((sum, note, i) => sum + Math.abs(note - prevSorted[i]), 0);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestInversion = sorted;
            }
        }

        return bestInversion.sort((a, b) => a - b);
    }

    voiceLeadProgression(chordSymbols) {
        const voiced = [];

        for (let i = 0; i < chordSymbols.length; i++) {
            const rawSemitones = this.getChordSemitones(chordSymbols[i]);

            if (i === 0) {
                voiced.push(rawSemitones.sort((a, b) => a - b));
            } else {
                voiced.push(this.getClosestVoicing(voiced[i - 1], rawSemitones));
            }
        }

        return voiced;
    }

    semitoneToFreq(semitone) {
        return 261.63 * Math.pow(2, (semitone - 48) / 12);
    }

    // ========================
    // Enhanced Sound Synthesis (Option B)
    // ========================

    // Calculate stereo pan based on pitch (-1 to 1)
    getPanForPitch(semitone) {
        // Map semitone 40-64 to pan -0.6 to 0.6
        const normalized = (semitone - 40) / (64 - 40);
        return (normalized - 0.5) * 1.2; // -0.6 to 0.6
    }

    // Get velocity scaling based on pitch (bass slightly louder)
    getVelocityForPitch(semitone, baseVelocity) {
        // Lower notes slightly louder, higher notes slightly softer
        const pitchFactor = 1.0 - (semitone - 48) * 0.008;
        return baseVelocity * Math.max(0.7, Math.min(1.2, pitchFactor));
    }

    // Generate attack noise burst
    playAttackNoise(startTime, duration, velocity, panValue) {
        if (!this.audioContext) return;

        const ctx = this.audioContext;
        const output = this.getOutputNode();

        // Create noise buffer
        const bufferSize = ctx.sampleRate * 0.03; // 30ms of noise
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Bandpass filter for "thump" quality
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 1.5;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.15, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);

        const panner = ctx.createStereoPanner();
        panner.pan.value = panValue;

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(panner);
        panner.connect(output.dry);

        noise.start(startTime);
        noise.stop(startTime + 0.03);

        this.scheduledNodes.push(noise);
    }

    // Play a single note with enhanced timbre
    playNote(freq, startTime, duration, velocity = 0.12, panValue = 0) {
        if (!this.audioContext) return;

        const ctx = this.audioContext;
        const output = this.getOutputNode();

        // Per-note random detuning for richness (±5 cents)
        const detuneBase = (Math.random() - 0.5) * 10;

        // Harmonics with slight inharmonicity (piano-like)
        const harmonics = [
            { ratio: 1, gain: 1.0, detune: 0 },
            { ratio: 2, gain: 0.45, detune: 0.5 },      // Slightly sharp
            { ratio: 3, gain: 0.2, detune: 1.2 },       // More sharp (inharmonicity)
            { ratio: 4, gain: 0.1, detune: 2.0 },       // Even more sharp
            { ratio: 5, gain: 0.05, detune: 3.0 },
        ];

        // Note gain envelope
        const noteGain = ctx.createGain();

        // Stereo panner
        const panner = ctx.createStereoPanner();
        panner.pan.value = panValue;

        noteGain.connect(panner);
        panner.connect(output.dry);
        panner.connect(output.wet);

        // ADSR envelope with two-stage release
        const attack = 0.008 + Math.random() * 0.004; // 8-12ms attack variation
        const decay = 0.12;
        const sustainLevel = 0.35;
        const release = 0.4;

        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(velocity, startTime + attack);
        noteGain.gain.exponentialRampToValueAtTime(velocity * sustainLevel, startTime + attack + decay);
        noteGain.gain.setValueAtTime(velocity * sustainLevel, startTime + duration - release);
        noteGain.gain.exponentialRampToValueAtTime(velocity * 0.1, startTime + duration - release * 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        harmonics.forEach((h, index) => {
            const osc = ctx.createOscillator();
            const hGain = ctx.createGain();

            // Apply inharmonicity and per-oscillator detuning
            const totalDetune = detuneBase + h.detune + (Math.random() - 0.5) * 2;
            osc.frequency.value = freq * h.ratio;
            osc.detune.value = totalDetune;

            // Use sine for fundamental, triangle for upper harmonics (softer)
            osc.type = index === 0 ? 'sine' : 'sine';

            // Slight gain variation per harmonic
            hGain.gain.value = h.gain * (0.9 + Math.random() * 0.2);

            osc.connect(hGain);
            hGain.connect(noteGain);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.1);

            this.scheduledNodes.push(osc);
        });

        // Add attack noise
        this.playAttackNoise(startTime, duration, velocity, panValue);
    }

    // Play a chord with staggered attacks and spatial positioning
    playChordFromSemitones(semitones, startTime, duration) {
        const baseVelocity = 0.1 + Math.random() * 0.02;

        // Sort by pitch for consistent staggering (low to high)
        const sortedSemitones = [...semitones].sort((a, b) => a - b);

        sortedSemitones.forEach((st, index) => {
            const freq = this.semitoneToFreq(st);

            // Stagger attacks: 15-25ms between notes
            const staggerOffset = index * (0.015 + Math.random() * 0.01);

            // Stereo positioning based on pitch
            const panValue = this.getPanForPitch(st);

            // Velocity scaling by pitch
            const velocity = this.getVelocityForPitch(st, baseVelocity);

            this.playNote(freq, startTime + staggerOffset, duration, velocity, panValue);
        });
    }

    playChord(chordSymbol) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.setupAudioGraph();
        }

        const semitones = this.getChordSemitones(chordSymbol);
        const now = this.audioContext.currentTime;
        this.playChordFromSemitones(semitones, now, 0.8);
    }

    stopAllSound() {
        const now = this.audioContext ? this.audioContext.currentTime : 0;
        this.scheduledNodes.forEach(node => {
            try { node.stop(now); } catch(e) { /* already stopped */ }
        });
        this.scheduledNodes = [];
    }

    // ========================
    // Melody Generation
    // ========================

    generateMelody(voicedProgression) {
        const melody = [];
        let lastNote = null;

        for (const chordSemitones of voicedProgression) {
            const chordNotes = [];

            const expandedTones = [];
            for (const st of chordSemitones) {
                expandedTones.push(st - 12, st, st + 12);
            }
            const playable = expandedTones.filter(n => n >= 48 && n <= 72);

            for (let i = 0; i < this.melodyDensity; i++) {
                if (lastNote === null) {
                    const sorted = [...playable].sort((a, b) => Math.abs(a - 57) - Math.abs(b - 57));
                    lastNote = sorted[0];
                } else {
                    const sorted = [...playable].sort((a, b) => Math.abs(a - lastNote) - Math.abs(b - lastNote));
                    const candidates = sorted.slice(0, Math.min(3, sorted.length));
                    lastNote = candidates[Math.floor(Math.random() * candidates.length)];
                }
                chordNotes.push(lastNote);
            }

            melody.push(chordNotes);
        }

        return melody;
    }

    // ========================
    // Playback with Visual Sync
    // ========================

    startExerciseFlow() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.setupAudioGraph();
        }

        this.exerciseActive = true;
        this.generateRandomProgression();
        this.currentChordIndex = 0;
        this.identifiedChords = ['_', '_', '_', '_'];

        this.showExerciseScreen();
        this.playSequence();
    }

    playSequence() {
        this.stopAllSound();
        this.updatePlaybackState('playing');

        const cadenceSymbols = this.currentExercise === 'major'
            ? ['I', 'IV', 'V', 'I']
            : ['i', 'iv', 'V', 'i'];

        const allSymbols = [...cadenceSymbols, ...this.currentProgression];
        const allVoiced = this.voiceLeadProgression(allSymbols);

        this.voicedCadence = allVoiced.slice(0, cadenceSymbols.length);
        this.voicedProgression = allVoiced.slice(cadenceSymbols.length);

        const now = this.audioContext.currentTime + 0.1;
        const beat = this.beatDuration;
        const cadenceBeat = 60 / 90;
        const pauseDuration = 1.5;

        // Play cadence
        this.voicedCadence.forEach((semitones, index) => {
            this.playChordFromSemitones(semitones, now + index * cadenceBeat, cadenceBeat * 0.9);
        });

        const progressionStart = now + cadenceSymbols.length * cadenceBeat + pauseDuration;

        if (this.playMode === 'harmonic') {
            this.voicedProgression.forEach((semitones, index) => {
                const chordStartTime = progressionStart + index * beat;
                this.playChordFromSemitones(semitones, chordStartTime, beat * 0.9);

                // Schedule visual highlight
                const highlightDelay = (chordStartTime - this.audioContext.currentTime) * 1000;
                setTimeout(() => this.highlightPlaceholder(index), highlightDelay);
            });
        } else {
            const melody = this.generateMelody(this.voicedProgression);
            const noteDuration = beat / this.melodyDensity;

            melody.forEach((chordNotes, chordIndex) => {
                const chordStartTime = progressionStart + chordIndex * beat;

                // Highlight at start of each chord's notes
                const highlightDelay = (chordStartTime - this.audioContext.currentTime) * 1000;
                setTimeout(() => this.highlightPlaceholder(chordIndex), highlightDelay);

                chordNotes.forEach((semitone, noteIndex) => {
                    const freq = this.semitoneToFreq(semitone);
                    const time = chordStartTime + noteIndex * noteDuration;
                    const panValue = this.getPanForPitch(semitone);
                    this.playNote(freq, time, noteDuration * 0.85, 0.15, panValue);
                });
            });
        }

        // Calculate total playback time
        const totalPlayTime = cadenceSymbols.length * cadenceBeat + pauseDuration + 4 * beat;
        const endDelay = totalPlayTime * 1000 + 100;

        setTimeout(() => {
            this.clearHighlights();
            this.updatePlaybackState('answering');
            this.updateActivePlaceholder();
        }, endDelay);
    }

    repeatProgression() {
        this.playSequence();
    }

    nextTry() {
        this.stopAllSound();
        this.currentTonic = this.getRandomTonic();
        this.generateRandomProgression();
        this.currentChordIndex = 0;
        this.identifiedChords = ['_', '_', '_', '_'];
        this.showExerciseScreen();
        this.playSequence();
    }

    handleChordGuess(guessedChord) {
        if (!this.exerciseActive) {
            this.playChord(guessedChord);
            return;
        }

        if (this.playbackState === 'playing') {
            return; // Ignore during playback
        }

        const correctChord = this.currentProgression[this.currentChordIndex];
        this.sessionTotal++;

        if (guessedChord === correctChord) {
            this.sessionCorrect++;
            this.streak++;
            this.identifiedChords[this.currentChordIndex] = guessedChord;
            this.updatePlaceholder(this.currentChordIndex, guessedChord, true);
            this.updateStatsDisplay();
            this.currentChordIndex++;

            if (this.currentChordIndex >= 4) {
                setTimeout(() => {
                    this.nextTry();
                }, 1000);
                return;
            }

            this.updateActivePlaceholder();
        } else {
            this.streak = 0;
            this.updateStatsDisplay();
            this.flashPlaceholder(this.currentChordIndex);
        }
    }

    updatePlaceholder(index, chord, correct = false) {
        const placeholder = document.getElementById(`placeholder-${index}`);
        if (placeholder) {
            placeholder.textContent = chord;
            if (correct) {
                placeholder.classList.add('correct');
                setTimeout(() => placeholder.classList.remove('correct'), 500);
            }
        }
    }

    flashPlaceholder(index) {
        const placeholder = document.getElementById(`placeholder-${index}`);
        if (placeholder) {
            placeholder.classList.add('incorrect');
            setTimeout(() => {
                placeholder.classList.remove('incorrect');
            }, 500);
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LisearApp();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}
