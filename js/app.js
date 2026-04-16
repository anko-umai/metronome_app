/**
 * アプリ初期化
 * MetronomeEngine と MetronomeUI を接続する
 */
document.addEventListener('DOMContentLoaded', () => {
  const engine = new MetronomeEngine();
  const ui = new MetronomeUI();
  ui.init();

  // --- 初期表示 ---
  ui.updateTempoDisplay(engine.tempo);
  ui.updateBeatIndicators(engine.beatsPerMeasure);
  ui.updateActiveButton('beat-btn', engine.beatsPerMeasure);
  ui.updateActiveButton('note-btn', engine.noteMode);

  // --- エンジン → UI コールバック ---
  engine.onBeat = (beatInfo) => {
    ui.highlightBeat(beatInfo);
  };

  // --- テンポスライダー ---
  ui.elements.tempoSlider.addEventListener('input', (e) => {
    const bpm = parseInt(e.target.value, 10);
    engine.setTempo(bpm);
    ui.updateTempoDisplay(engine.tempo);
  });

  // --- テンポ +/- ボタン ---
  ui.elements.tempoDown.addEventListener('click', () => {
    engine.setTempo(engine.tempo - 1);
    ui.updateTempoDisplay(engine.tempo);
  });

  ui.elements.tempoUp.addEventListener('click', () => {
    engine.setTempo(engine.tempo + 1);
    ui.updateTempoDisplay(engine.tempo);
  });

  // --- 拍子ボタン ---
  ui.elements.beatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const beats = parseInt(btn.dataset.value, 10);
      engine.setBeats(beats);
      ui.updateBeatIndicators(beats);
      ui.updateActiveButton('beat-btn', beats);
    });
  });

  // --- 音符モードボタン ---
  ui.elements.noteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.value;
      engine.setNoteMode(mode);
      ui.updateActiveButton('note-btn', mode);
    });
  });

  // --- 再生/停止ボタン ---
  ui.elements.playButton.addEventListener('click', () => {
    if (engine.isPlaying) {
      engine.stop();
      ui.togglePlayButton(false);
      ui.clearBeatHighlight();
    } else {
      engine.start();
      ui.togglePlayButton(true);
    }
  });
});
