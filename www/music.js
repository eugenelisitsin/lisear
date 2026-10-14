// Pure music logic: scales, chords, voicings, sample choice. No DOM, no audio, no randomness,
// so tests/ can load it in Node. Semitone numbers: 48 = middle C (C4, 261.63 Hz).
const LisearMusic = (() => {
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const SCALES = {
        major: { intervals: [0, 2, 4, 5, 7, 9, 11], chords: ['I', 'ii', 'iii', 'IV', 'V', 'vi'], cadence: ['I', 'IV', 'V', 'I'] },
        minor: { intervals: [0, 2, 3, 5, 7, 8, 10], chords: ['i', 'III', 'iv', 'V', 'VI', 'VII'], cadence: ['i', 'iv', 'V', 'i'] }
    };

    // Salamander piano samples, one every minor third (D2). Keep in sync with sw.js (a test checks).
    const SAMPLES = [
        ['C2', 24], ['Ds2', 27], ['Fs2', 30], ['A2', 33],
        ['C3', 36], ['Ds3', 39], ['Fs3', 42], ['A3', 45],
        ['C4', 48], ['Ds4', 51], ['Fs4', 54], ['A4', 57],
        ['C5', 60], ['Ds5', 63], ['Fs5', 66], ['A5', 69]
    ].map(([name, semitone]) => ({ name, semitone }));

    // Registers (D6). Root mode: the root alone in the bass, a close triad around middle C above it.
    // Inversions mode: the close triad alone, in the lower register used before D6.
    const RANGES = {
        bass: [33, 44],          // A2..G#3
        upper: [50, 67],         // D4..G5
        inversions: [36, 57],    // C3..A4
        melody: [45, 57]         // A3..A4
    };

    const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

    const pitchClass = n => ((n % 12) + 12) % 12;
    const isMinorChord = symbol => symbol.toLowerCase() === symbol;
    const scaleDegree = symbol => ROMAN[symbol.toLowerCase()] || 1;

    // Root-position triad, root in the octave above middle C: [root, third, fifth]
    function chordSemitones(exercise, tonic, symbol) {
        const root = 48 + NOTES.indexOf(tonic) + SCALES[exercise].intervals[scaleDegree(symbol) - 1];
        return [root, root + (isMinorChord(symbol) ? 3 : 4), root + 7];
    }

    // Every close-position voicing (root position, 1st and 2nd inversion, any octave) inside [lo, hi], sorted by pitch
    function closeVoicings([root, third, fifth], lo, hi) {
        const shapes = [[root, third, fifth], [third, fifth, root + 12], [fifth, root + 12, third + 12]];
        const out = [];
        for (const shape of shapes) {
            for (let k = -6; k <= 6; k++) {
                const v = shape.map(n => n + 12 * k);
                if (v[0] >= lo && v[2] <= hi) out.push(v);
            }
        }
        return out;
    }

    // Smooth voice leading: each chord takes the voicing that moves the voices least from the previous chord,
    // with a pull towards the middle of the range so a progression does not drift to an edge.
    function voiceLead(triads, [lo, hi]) {
        const center = (lo + hi) / 2;
        const mean = v => (v[0] + v[1] + v[2]) / 3;
        const voiced = [];
        for (const triad of triads) {
            const prev = voiced[voiced.length - 1];
            let best = null, bestCost = Infinity;
            for (const v of closeVoicings(triad, lo, hi)) {
                const motion = prev ? v.reduce((sum, n, i) => sum + Math.abs(n - prev[i]), 0) : 0;
                const cost = motion + 0.5 * Math.abs(mean(v) - center);
                if (cost < bestCost) { bestCost = cost; best = v; }
            }
            voiced.push(best);
        }
        return voiced;
    }

    // The root's pitch class in the bass range (one octave wide, so exactly one choice)
    function bassNote(root, [lo] = RANGES.bass) {
        return lo + pitchClass(root - lo);
    }

    // Chords as played harmonically: arrays of semitones, lowest first. bassMode 'root' or 'inversions'.
    function harmonicVoicings(exercise, tonic, symbols, bassMode) {
        const triads = symbols.map(s => chordSemitones(exercise, tonic, s));
        if (bassMode === 'inversions') return voiceLead(triads, RANGES.inversions);
        return voiceLead(triads, RANGES.upper).map((upper, i) => [bassNote(triads[i][0]), ...upper]);
    }

    // Nearest sample and the pitch shift it needs
    function sampleFor(semitone) {
        let best = SAMPLES[0];
        for (const s of SAMPLES) {
            if (Math.abs(s.semitone - semitone) < Math.abs(best.semitone - semitone)) best = s;
        }
        return { sampleKey: best.name, detuneCents: (semitone - best.semitone) * 100 };
    }

    return {
        NOTES, SCALES, SAMPLES, RANGES,
        pitchClass, isMinorChord, scaleDegree, chordSemitones, closeVoicings, voiceLead, bassNote,
        harmonicVoicings, sampleFor
    };
})();

if (typeof module !== 'undefined') module.exports = LisearMusic;
