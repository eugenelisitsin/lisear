// Unit tests for www/music.js. Run: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../www/music.js');

const www = path.join(__dirname, '..', 'www');
const exercises = Object.keys(M.SCALES);
const pcs = notes => [...new Set(notes.map(M.pitchClass))].sort((a, b) => a - b);
const inRange = (n, [lo, hi]) => n >= lo && n <= hi;

// Every chord of an exercise, plus the cadence chords (V in minor is not in the answer set's order)
const allChords = ex => [...new Set([...M.SCALES[ex].chords, ...M.SCALES[ex].cadence])];

// Deterministic pseudo-random progressions
function* progressions(count) {
    let seed = 12345;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < count; i++) {
        const ex = exercises[Math.floor(rand() * exercises.length)];
        const tonic = M.NOTES[Math.floor(rand() * 12)];
        const chords = M.SCALES[ex].chords;
        const prog = Array.from({ length: 4 }, () => chords[Math.floor(rand() * chords.length)]);
        yield { ex, tonic, symbols: [...M.SCALES[ex].cadence, ...prog] };
    }
}

test('chord qualities follow the scale', () => {
    assert.deepEqual(M.chordSemitones('major', 'C', 'I'), [48, 52, 55]);
    assert.deepEqual(M.chordSemitones('major', 'C', 'ii'), [50, 53, 57]);
    assert.deepEqual(M.chordSemitones('minor', 'A', 'III'), [60, 64, 67]);
    assert.deepEqual(M.chordSemitones('minor', 'A', 'V'), [64, 68, 71]); // harmonic-minor dominant: major
});

test('every chord has a close voicing in every register', () => {
    for (const ex of exercises) for (const tonic of M.NOTES) for (const sym of allChords(ex)) {
        const triad = M.chordSemitones(ex, tonic, sym);
        for (const range of [M.RANGES.upper, M.RANGES.inversions]) {
            assert.ok(M.closeVoicings(triad, ...range).length > 0, `${ex} ${tonic} ${sym} in ${range}`);
        }
    }
});

test('root mode: the root alone in the bass, the triad above it', () => {
    for (const { ex, tonic, symbols } of progressions(500)) {
        const voiced = M.harmonicVoicings(ex, tonic, symbols, 'root');
        voiced.forEach((notes, i) => {
            const triad = M.chordSemitones(ex, tonic, symbols[i]);
            const [bass, ...upper] = notes;
            assert.equal(notes.length, 4);
            assert.equal(M.pitchClass(bass), M.pitchClass(triad[0]), 'bass is the root');
            assert.ok(inRange(bass, M.RANGES.bass), `bass ${bass} in range`);
            assert.deepEqual(pcs(upper), pcs(triad), 'upper voices are the chord');
            upper.forEach(n => assert.ok(inRange(n, M.RANGES.upper), `upper ${n} in range`));
            assert.ok(upper[2] - upper[0] <= 9, 'close position');
            assert.ok(upper[0] - bass >= 6, 'bass stands apart from the triad');
        });
    }
});

test('inversions mode: the triad alone, in the lower register', () => {
    for (const { ex, tonic, symbols } of progressions(500)) {
        M.harmonicVoicings(ex, tonic, symbols, 'inversions').forEach((notes, i) => {
            assert.equal(notes.length, 3);
            assert.deepEqual(pcs(notes), pcs(M.chordSemitones(ex, tonic, symbols[i])));
            notes.forEach(n => assert.ok(inRange(n, M.RANGES.inversions)));
        });
    }
});

test('voice leading moves the upper voices smoothly', () => {
    for (const { ex, tonic, symbols } of progressions(500)) {
        const voiced = M.harmonicVoicings(ex, tonic, symbols, 'root').map(v => v.slice(1));
        for (let i = 1; i < voiced.length; i++) {
            voiced[i].forEach((n, v) => assert.ok(Math.abs(n - voiced[i - 1][v]) <= 7,
                `${ex} ${tonic} ${symbols[i - 1]}->${symbols[i]}: ${voiced[i - 1]} -> ${voiced[i]}`));
        }
    }
});

test('every playable note is within 1.5 semitones of a sample', () => {
    const lo = Math.min(...Object.values(M.RANGES).map(r => r[0]));
    const hi = Math.max(...Object.values(M.RANGES).map(r => r[1]));
    for (let n = lo; n <= hi; n++) assert.ok(Math.abs(M.sampleFor(n).detuneCents) <= 150, `note ${n}`);
});

test('sample files, the service worker list and music.js agree', () => {
    const sw = fs.readFileSync(path.join(www, 'sw.js'), 'utf8');
    const swSamples = JSON.parse(sw.match(/const SAMPLES = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
    assert.deepEqual(swSamples, M.SAMPLES.map(s => s.name));
    for (const s of M.SAMPLES) assert.ok(fs.existsSync(path.join(www, 'samples', `${s.name}.mp3`)), s.name);
});

test('the service worker caches every script and stylesheet of the page', () => {
    const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(www, 'sw.js'), 'utf8');
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m => m[1]);
    assert.ok(assets.includes('music.js') && assets.includes('app.js'));
    for (const a of assets) assert.ok(sw.includes(`ASSETS + '${a}'`), `${a} in sw.js SHELL`);
});
