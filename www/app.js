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
        this.melodyDensity = 4;

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

        // Piano samples
        this.sampleBuffers = {};
        this.samplesLoaded = false;
        this.samplesPromise = null;

        // Pitch range covered by the samples (C2..A4)
        this.lowestSample = 24;
        this.highestSample = 57;
        this.lowestChordNote = 36;
        this.lowestMelodyNote = 45;

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
                this.melodyDensity = 4; // Fixed at 4 notes per chord
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
        // Warm up audio on the first user gesture so samples are ready on demand
        document.addEventListener('click', () => {
            this.ensureAudio().catch(e => console.error(e));
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

    // Create the audio context (needs a user gesture) and load the piano samples.
    // Safe to call from any handler: the load only happens once.
    ensureAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.setupAudioGraph();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
        return this.loadPianoSamples();
    }

    loadPianoSamples() {
        if (this.samplesPromise) return this.samplesPromise;

        const sampleNotes = ['C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4'];

        this.samplesPromise = Promise.all(sampleNotes.map(async (note) => {
            const response = await fetch(`samples/${note}.mp3`);
            if (!response.ok) throw new Error(`${note}.mp3: HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            this.sampleBuffers[note] = await this.audioContext.decodeAudioData(arrayBuffer);
        })).then(() => {
            this.samplesLoaded = true;
            console.log('Piano samples loaded');
        }).catch(e => {
            // Allow a later attempt to retry
            this.samplesPromise = null;
            console.error('Failed to load piano samples:', e);
            throw e;
        });

        return this.samplesPromise;
    }

    getSampleForSemitone(semitone) {
        // Sampled notes in minor thirds (every 3 semitones)
        // C2=24, Ds2=27, Fs2=30, A2=33, C3=36, Ds3=39, Fs3=42, A3=45, C4=48, Ds4=51, Fs4=54, A4=57
        const sampledSemitones = [24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57];
        const sampleNames = ['C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4'];

        // Find nearest sample
        let nearestIndex = 0;
        let minDistance = Math.abs(sampledSemitones[0] - semitone);

        for (let i = 1; i < sampledSemitones.length; i++) {
            const distance = Math.abs(sampledSemitones[i] - semitone);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }

        const detuneCents = (semitone - sampledSemitones[nearestIndex]) * 100;
        return {
            sampleKey: sampleNames[nearestIndex],
            detuneCents: detuneCents
        };
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

    async startExercise(type) {
        const ready = this.ensureAudio();

        if (!this.samplesLoaded) {
            const container = document.querySelector('.container');
            container.innerHTML = `
                <h1>Lisear</h1>
                <p class="loading-indicator">Loading piano samples...</p>
            `;
            try {
                await ready;
            } catch (e) {
                container.innerHTML = `
                    <h1>Lisear</h1>
                    <p>Could not load the piano samples.</p>
                    <div class="exercise-buttons">
                        <button onclick="app.startExercise('${type}')">Try again</button>
                    </div>
                `;
                return;
            }
        }

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
            if (inv.some(n => n < this.lowestChordNote || n > this.highestSample)) continue;

            const sorted = [...inv].sort((a, b) => a - b);
            const prevSorted = [...prevVoicing].sort((a, b) => a - b);
            const distance = sorted.reduce((sum, note, i) => sum + Math.abs(note - prevSorted[i]), 0);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestInversion = sorted;
            }
        }

        return this.fitVoicingToRange(bestInversion);
    }

    // Shift a voicing by octaves until it sits inside the sampled range
    fitVoicingToRange(semitones) {
        let voicing = [...semitones].sort((a, b) => a - b);
        for (let i = 0; i < 4 && voicing[voicing.length - 1] > this.highestSample; i++) {
            voicing = voicing.map(n => n - 12);
        }
        for (let i = 0; i < 4 && voicing[0] < this.lowestChordNote; i++) {
            voicing = voicing.map(n => n + 12);
        }
        return voicing;
    }

    voiceLeadProgression(chordSymbols) {
        const voiced = [];

        for (let i = 0; i < chordSymbols.length; i++) {
            const rawSemitones = this.getChordSemitones(chordSymbols[i]);

            if (i === 0) {
                voiced.push(this.fitVoicingToRange(rawSemitones));
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
        // Map the playable range to pan -0.6 to 0.6
        const normalized = (semitone - this.lowestChordNote) / (this.highestSample - this.lowestChordNote);
        return (normalized - 0.5) * 1.2; // -0.6 to 0.6
    }

    // Get velocity scaling based on pitch (bass slightly louder)
    getVelocityForPitch(semitone, baseVelocity) {
        // Lower notes slightly louder, higher notes slightly softer
        const pitchFactor = 1.0 - (semitone - 48) * 0.008;
        return baseVelocity * Math.max(0.7, Math.min(1.2, pitchFactor));
    }

    // Play a single note using piano sample
    playNote(freq, startTime, duration, velocity = 1.2, panValue = 0) {
        if (!this.audioContext || !this.samplesLoaded) return;

        const ctx = this.audioContext;
        const output = this.getOutputNode();

        // Convert frequency to semitone (middle C = 48 = 261.63 Hz)
        const semitone = Math.round(12 * Math.log2(freq / 261.63) + 48);

        // Get nearest sample and required pitch shift
        const { sampleKey, detuneCents } = this.getSampleForSemitone(semitone);
        const buffer = this.sampleBuffers[sampleKey];

        if (!buffer) return;

        // Create buffer source
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.detune.value = detuneCents;

        // Note gain envelope: the sample carries its own attack and decay, so all
        // this does is damp the tail when the note ends (like releasing the key).
        const noteGain = ctx.createGain();
        const release = Math.min(0.3, duration * 0.4);

        noteGain.gain.setValueAtTime(velocity, startTime);
        noteGain.gain.setValueAtTime(velocity, startTime + duration - release);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        // Stereo panner
        const panner = ctx.createStereoPanner();
        panner.pan.value = panValue;

        // Connect: source -> noteGain -> panner -> dry + wet
        source.connect(noteGain);
        noteGain.connect(panner);
        panner.connect(output.dry);
        panner.connect(output.wet);

        source.start(startTime);
        source.stop(startTime + duration + 0.05);

        this.scheduledNodes.push(source);
    }

    // Play a chord with staggered attacks and spatial positioning
    playChordFromSemitones(semitones, startTime, duration) {
        const baseVelocity = 1.05 + Math.random() * 0.15;

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

    async playChord(chordSymbol) {
        try {
            await this.ensureAudio();
        } catch (e) {
            return; // already logged by loadPianoSamples
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

    generateMelody(voicedProgression, chordSymbols = []) {
        const melody = [];
        let lastNote = null;

        voicedProgression.forEach((chordSemitones, chordIndex) => {
            // A voicing is sorted by pitch, so its lowest note is not necessarily
            // the root: find the root by pitch class, the other two follow.
            const symbol = chordSymbols[chordIndex];
            const rootPitchClass = symbol
                ? ((this.getChordSemitones(symbol)[0] % 12) + 12) % 12
                : chordSemitones[0] % 12;
            const rootIdx = Math.max(0, chordSemitones.findIndex(n => ((n % 12) + 12) % 12 === rootPitchClass));
            const root = chordSemitones[rootIdx];
            const [third, fifth] = chordSemitones.filter((_, i) => i !== rootIdx);

            // For each chord tone, find the best octave (closest to lastNote or center)
            const pickBestOctave = (baseSemitone) => {
                const options = [baseSemitone - 12, baseSemitone, baseSemitone + 12]
                    .filter(n => n >= this.lowestMelodyNote && n <= this.highestSample);
                if (options.length === 0) return baseSemitone;

                if (lastNote === null) {
                    // Pick closest to the middle of the melodic range
                    const center = (this.lowestMelodyNote + this.highestSample) / 2;
                    return options.sort((a, b) => Math.abs(a - center) - Math.abs(b - center))[0];
                }
                // Pick closest to last note
                return options.sort((a, b) => Math.abs(a - lastNote) - Math.abs(b - lastNote))[0];
            };

            // Build 4-note sequence: root first, then third & fifth, then repeat one
            const chordNotes = [];

            // Note 1: always start with root
            const rootNote = pickBestOctave(root);
            chordNotes.push(rootNote);
            lastNote = rootNote;

            // Notes 2-3: third and fifth (shuffled order)
            const remaining = Math.random() < 0.5 ? [third, fifth] : [fifth, third];
            for (const tone of remaining) {
                const note = pickBestOctave(tone);
                chordNotes.push(note);
                lastNote = note;
            }

            // Note 4: repeat one chord tone (pick closest to last note)
            const allTones = [root, third, fifth];
            const fourthNote = pickBestOctave(allTones[Math.floor(Math.random() * 3)]);
            chordNotes.push(fourthNote);
            lastNote = fourthNote;

            melody.push(chordNotes);
        });

        return melody;
    }

    // ========================
    // Playback with Visual Sync
    // ========================

    async startExerciseFlow() {
        try {
            await this.ensureAudio();
        } catch (e) {
            this.updatePlaybackState('idle');
            return; // already logged by loadPianoSamples
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
        const pauseDuration = 1.5;

        // Play cadence at same tempo as progression
        this.voicedCadence.forEach((semitones, index) => {
            this.playChordFromSemitones(semitones, now + index * beat, beat * 0.9);
        });

        const progressionStart = now + cadenceSymbols.length * beat + pauseDuration;

        // Enable answering when progression starts (not after it ends)
        const answeringDelay = (progressionStart - this.audioContext.currentTime) * 1000;
        setTimeout(() => {
            this.updatePlaybackState('answering');
            this.updateActivePlaceholder();
        }, answeringDelay);

        if (this.playMode === 'harmonic') {
            this.voicedProgression.forEach((semitones, index) => {
                const chordStartTime = progressionStart + index * beat;
                this.playChordFromSemitones(semitones, chordStartTime, beat * 0.9);

                // Schedule visual highlight
                const highlightDelay = (chordStartTime - this.audioContext.currentTime) * 1000;
                setTimeout(() => this.highlightPlaceholder(index), highlightDelay);
            });
        } else {
            const melody = this.generateMelody(this.voicedProgression, this.currentProgression);
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
                    this.playNote(freq, time, noteDuration * 0.85, 1.5, panValue);
                });
            });
        }
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
