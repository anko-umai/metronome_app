/**
 * RhythmEditor
 * リズムパターンの編集・再生制御
 */
class RhythmEditor {
  constructor() {
    this.pattern = [];
    this.beatsPerMeasure = 4;
    this.tempo = 120;
    this.isPlaying = false;
    this.metronomeEnabled = true;

    this.audioContext = null;
    this.timerID = null;
    this.scheduleAheadTime = 0.15;
    this.lookahead = 25;

    this.currentEventIndex = 0;
    this.nextEventTime = 0;
    this.currentBeat = 0;
    this.nextBeatTime = 0;

    this.onNotePlay = null;
    this.onBeatPlay = null;
    this.onPatternChange = null;
  }

  // --- パターン操作 ---

  getTotalDuration() {
    return this.pattern.reduce((sum, e) => sum + e.duration, 0);
  }

  getRemainingDuration() {
    return Math.max(0, this.beatsPerMeasure - this.getTotalDuration());
  }

  isFull() {
    return this.getRemainingDuration() < 0.01;
  }

  canAdd(duration) {
    return this.getRemainingDuration() >= duration - 0.001;
  }

  addEvent(type, duration) {
    if (!this.canAdd(duration)) return false;
    this.pattern.push({ type, duration });
    this._notifyChange();
    return true;
  }

  removeLastEvent() {
    if (this.pattern.length === 0) return;
    this.pattern.pop();
    this._notifyChange();
  }

  clearPattern() {
    this.pattern = [];
    this._notifyChange();
  }

  loadPreset(name) {
    const presets = {
      'basic-quarter': [
        { type: 'note', duration: 1 },
        { type: 'note', duration: 1 },
        { type: 'note', duration: 1 },
        { type: 'note', duration: 1 }
      ],
      'basic-eighth': [
        { type: 'note', duration: 0.5 }, { type: 'note', duration: 0.5 },
        { type: 'note', duration: 0.5 }, { type: 'note', duration: 0.5 },
        { type: 'note', duration: 0.5 }, { type: 'note', duration: 0.5 },
        { type: 'note', duration: 0.5 }, { type: 'note', duration: 0.5 }
      ],
      'sixteenth-eighth': [
        { type: 'note', duration: 0.25 }, { type: 'note', duration: 0.25 },
        { type: 'note', duration: 0.5 },
        { type: 'note', duration: 0.25 }, { type: 'note', duration: 0.25 },
        { type: 'note', duration: 0.5 },
        { type: 'note', duration: 0.25 }, { type: 'note', duration: 0.25 },
        { type: 'note', duration: 0.5 },
        { type: 'note', duration: 0.25 }, { type: 'note', duration: 0.25 },
        { type: 'note', duration: 0.5 }
      ],
      'with-rests': [
        { type: 'note', duration: 1 },
        { type: 'rest', duration: 1 },
        { type: 'note', duration: 0.5 }, { type: 'note', duration: 0.5 },
        { type: 'rest', duration: 1 }
      ],
      'syncopation': [
        { type: 'note', duration: 0.5 },
        { type: 'note', duration: 1 },
        { type: 'note', duration: 1 },
        { type: 'note', duration: 1 },
        { type: 'note', duration: 0.5 }
      ],
      'dotted-rhythm': [
        { type: 'note', duration: 1.5 },
        { type: 'note', duration: 0.5 },
        { type: 'note', duration: 1.5 },
        { type: 'note', duration: 0.5 }
      ]
    };

    const preset = presets[name];
    if (!preset) return;

    this.beatsPerMeasure = 4;
    this.pattern = preset.map(e => ({ ...e }));
    this._notifyChange();
  }

  setBeats(n) {
    this.beatsPerMeasure = n;
    this.pattern = [];
    if (this.isPlaying) this.stop();
    this._notifyChange();
  }

  setTempo(bpm) {
    this.tempo = Math.max(40, Math.min(200, bpm));
  }

  // --- 音声 ---

  _initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  _playSound(time, freq, dur, vol) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.start(time);
    osc.stop(time + dur);
  }

  _playPatternNote(time) {
    this._playSound(time, 660, 0.08, 0.8);
  }

  _playMetronomeClick(time, isAccent) {
    if (isAccent) {
      this._playSound(time, 880, 0.06, 0.6);
    } else {
      this._playSound(time, 440, 0.06, 0.4);
    }
  }

  // --- スケジューラ ---

  _scheduler() {
    const quarterInterval = 60 / this.tempo;

    if (this.metronomeEnabled) {
      while (this.nextBeatTime < this.audioContext.currentTime + this.scheduleAheadTime) {
        this._playMetronomeClick(this.nextBeatTime, this.currentBeat === 0);
        if (this.onBeatPlay) {
          const d = Math.max(0, (this.nextBeatTime - this.audioContext.currentTime) * 1000);
          const b = this.currentBeat;
          setTimeout(() => this.onBeatPlay(b), d);
        }
        this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
        this.nextBeatTime += quarterInterval;
      }
    }

    if (this.pattern.length > 0) {
      while (this.nextEventTime < this.audioContext.currentTime + this.scheduleAheadTime) {
        const event = this.pattern[this.currentEventIndex];
        if (event.type === 'note') {
          this._playPatternNote(this.nextEventTime);
        }
        if (this.onNotePlay) {
          const d = Math.max(0, (this.nextEventTime - this.audioContext.currentTime) * 1000);
          const idx = this.currentEventIndex;
          setTimeout(() => this.onNotePlay(idx), d);
        }
        this.nextEventTime += event.duration * quarterInterval;
        this.currentEventIndex = (this.currentEventIndex + 1) % this.pattern.length;
      }
    }
  }

  // --- 再生制御 ---

  play() {
    if (this.pattern.length === 0 || !this.isFull()) return;
    this._initAudio();
    this.isPlaying = true;
    this.currentBeat = 0;
    this.currentEventIndex = 0;
    const now = this.audioContext.currentTime;
    this.nextBeatTime = now;
    this.nextEventTime = now;
    this.timerID = setInterval(() => this._scheduler(), this.lookahead);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  toggleMetronome() {
    this.metronomeEnabled = !this.metronomeEnabled;
    return this.metronomeEnabled;
  }

  _notifyChange() {
    if (this.onPatternChange) this.onPatternChange();
  }
}
