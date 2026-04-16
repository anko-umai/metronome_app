/**
 * MetronomeEngine
 * Web Audio API による高精度メトロノームエンジン
 *
 * 先読み（Look-ahead）スケジューリングを使用し、
 * JS タイマーの精度に依存しない正確なリズム生成を行う。
 */
class MetronomeEngine {
  constructor() {
    this.tempo = 120;
    this.beatsPerMeasure = 4;
    this.noteMode = 'quarter';
    this.isPlaying = false;

    this.audioContext = null;
    this.currentBeat = 0;
    this.currentSubdiv = 0;
    this.nextNoteTime = 0;
    this.timerID = null;

    // スケジューラ設定
    this.scheduleAheadTime = 0.1; // 100ms 先読み
    this.lookahead = 25;          // 25ms ごとにスケジューラ実行

    // UI更新コールバック
    this.onBeat = null;
  }

  // --- 音声初期化 ---

  _initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // --- 音符モード計算 ---

  _getSubdivsPerBeat() {
    switch (this.noteMode) {
      case 'half':      return 1;
      case 'quarter':   return 1;
      case 'eighth':    return 2;
      case 'sixteenth': return 4;
      case 'triplet':   return 3;
      default:          return 1;
    }
  }

  _getInterval() {
    const quarterInterval = 60 / this.tempo;
    switch (this.noteMode) {
      case 'half':      return quarterInterval * 2;
      case 'quarter':   return quarterInterval;
      case 'eighth':    return quarterInterval / 2;
      case 'sixteenth': return quarterInterval / 4;
      case 'triplet':   return quarterInterval / 3;
      default:          return quarterInterval;
    }
  }

  // --- 拍情報 ---

  _getBeatInfo() {
    const isSubdivision = this.currentSubdiv > 0;
    const isAccent = this.currentBeat === 0 && !isSubdivision;
    return {
      beat: this.currentBeat,
      isAccent: isAccent,
      isSubdivision: isSubdivision
    };
  }

  _advance() {
    if (this.noteMode === 'half') {
      // 2分音符: 2拍分進む
      this.currentBeat = (this.currentBeat + 2) % this.beatsPerMeasure;
    } else {
      const subs = this._getSubdivsPerBeat();
      this.currentSubdiv++;
      if (this.currentSubdiv >= subs) {
        this.currentSubdiv = 0;
        this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
      }
    }
  }

  // --- 音声生成 ---

  _playClick(time, beatInfo) {
    let frequency, duration, volume;

    if (beatInfo.isAccent) {
      frequency = 880;
      duration = 0.06;
      volume = 1.0;
    } else if (beatInfo.isSubdivision) {
      frequency = 330;
      duration = 0.04;
      volume = 0.4;
    } else {
      frequency = 440;
      duration = 0.06;
      volume = 0.7;
    }

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.value = frequency;
    osc.type = 'sine';

    // エンベロープ: 急速な減衰で短いクリック音を生成
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // --- スケジューラ ---

  _scheduler() {
    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      const beatInfo = this._getBeatInfo();
      this._playClick(this.nextNoteTime, beatInfo);

      // UI更新を音声再生タイミングに合わせる
      if (this.onBeat) {
        const delay = Math.max(0, (this.nextNoteTime - this.audioContext.currentTime) * 1000);
        const info = { ...beatInfo };
        setTimeout(() => this.onBeat(info), delay);
      }

      this.nextNoteTime += this._getInterval();
      this._advance();
    }
  }

  // --- 公開API ---

  start() {
    this._initAudio();
    this.isPlaying = true;
    this.currentBeat = 0;
    this.currentSubdiv = 0;
    this.nextNoteTime = this.audioContext.currentTime;
    this.timerID = setInterval(() => this._scheduler(), this.lookahead);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
  }

  setTempo(bpm) {
    this.tempo = Math.max(40, Math.min(200, bpm));
  }

  setBeats(n) {
    this.beatsPerMeasure = n;
    this.currentBeat = 0;
    this.currentSubdiv = 0;
  }

  setNoteMode(mode) {
    this.noteMode = mode;
    this.currentBeat = 0;
    this.currentSubdiv = 0;
  }
}
