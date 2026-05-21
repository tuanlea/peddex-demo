let audioCtx;
let isMusicPlaying = false;
let masterGain;

export function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);
}

export function playHitSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    // --- Shield Zap (Oscillator) ---
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
    
    oscGain.gain.setValueAtTime(1, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    
    osc.start(t);
    osc.stop(t + 0.3);

    // --- Energy Sizzle (White Noise) ---
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    noiseSource.start(t);
    noiseSource.stop(t + 0.4);
}

export function playShootSound() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Laser "pew" effect: high pitch dropping rapidly
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t); // Start at A5
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.15); // Drop to A2 quickly

    // Volume envelope: sharp attack, quick decay
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
}

export function startMusic() {
    if (!audioCtx) initAudio();
    if (isMusicPlaying) return;
    isMusicPlaying = true;
    
    // Simple Synthwave bassline sequencer
    // C minor pentatonic: C, Eb, F, G, Bb
    // Frequencies for octave 2: C2=65.4, Eb2=77.78, F2=87.31, G2=98.0, Bb2=116.54
    const notes = [
        65.41, 65.41, 65.41, 77.78, 
        87.31, 87.31, 87.31, 116.54,
        98.00, 98.00, 98.00, 77.78,
        65.41, 65.41, 116.54, 98.00
    ];
    
    const tempo = 120; // BPM
    const beatDuration = 60 / tempo;
    const eighthNote = beatDuration / 2;
    
    let nextNoteTime = audioCtx.currentTime + 0.1;
    let currentNote = 0;
    
    function scheduleNote() {
        while (nextNoteTime < audioCtx.currentTime + 0.1) {
            playBassNote(notes[currentNote], nextNoteTime, eighthNote);
            
            // Advance to next note
            currentNote = (currentNote + 1) % notes.length;
            nextNoteTime += eighthNote;
        }
        
        if (isMusicPlaying) {
            requestAnimationFrame(scheduleNote);
        }
    }
    
    scheduleNote();
}

function playBassNote(freq, time, duration) {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.value = freq;
    
    // Envelope for a plucky synthwave bass
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + duration * 0.8);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.9);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    
    osc.start(time);
    osc.stop(time + duration);
}
