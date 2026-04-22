/**
 * リズムエディターページの初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  const editor = new RhythmEditor();
  const staffSvg = document.getElementById('staff');
  const renderer = new StaffRenderer(staffSvg);

  const els = {
    tempoDisplay: document.getElementById('tempo-display'),
    tempoSlider: document.getElementById('tempo-slider'),
    tempoDown: document.getElementById('tempo-down'),
    tempoUp: document.getElementById('tempo-up'),
    beatButtons: document.querySelectorAll('.beat-btn'),
    noteButtons: document.querySelectorAll('.note-add-btn'),
    restButtons: document.querySelectorAll('.rest-add-btn'),
    deleteBtn: document.getElementById('delete-btn'),
    clearBtn: document.getElementById('clear-btn'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    playBtn: document.getElementById('play-btn'),
    metronomeBtn: document.getElementById('metronome-toggle'),
    remaining: document.getElementById('remaining-display')
  };

  function updateDisplay() {
    renderer.render(editor.pattern, editor.beatsPerMeasure, -1);
    const rem = editor.getRemainingDuration();
    els.remaining.textContent = rem > 0
      ? `残り: ${rem} 拍`
      : '小節が完成しました';
    els.remaining.classList.toggle('complete', rem < 0.01);
    updateButtonStates();
  }

  function updateButtonStates() {
    const rem = editor.getRemainingDuration();
    els.noteButtons.forEach(btn => {
      const dur = parseFloat(btn.dataset.duration);
      btn.disabled = !editor.canAdd(dur);
    });
    els.restButtons.forEach(btn => {
      const dur = parseFloat(btn.dataset.duration);
      btn.disabled = !editor.canAdd(dur);
    });
    els.deleteBtn.disabled = editor.pattern.length === 0;
    els.playBtn.disabled = !editor.isFull();
  }

  function updateTempoDisplay() {
    els.tempoDisplay.textContent = editor.tempo;
    els.tempoSlider.value = editor.tempo;
  }

  // --- コールバック ---

  editor.onPatternChange = updateDisplay;

  editor.onNotePlay = (idx) => {
    renderer.render(editor.pattern, editor.beatsPerMeasure, idx);
  };

  // --- テンポ ---

  els.tempoSlider.addEventListener('input', (e) => {
    editor.setTempo(parseInt(e.target.value, 10));
    updateTempoDisplay();
  });

  els.tempoDown.addEventListener('click', () => {
    editor.setTempo(editor.tempo - 1);
    updateTempoDisplay();
  });

  els.tempoUp.addEventListener('click', () => {
    editor.setTempo(editor.tempo + 1);
    updateTempoDisplay();
  });

  // --- 拍子 ---

  els.beatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const beats = parseInt(btn.dataset.value, 10);
      editor.setBeats(beats);
      els.beatButtons.forEach(b =>
        b.classList.toggle('active', b.dataset.value === String(beats))
      );
    });
  });

  // --- 音符追加 ---

  els.noteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = parseFloat(btn.dataset.duration);
      editor.addEvent('note', dur);
    });
  });

  // --- 休符追加 ---

  els.restButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = parseFloat(btn.dataset.duration);
      editor.addEvent('rest', dur);
    });
  });

  // --- 削除・クリア ---

  els.deleteBtn.addEventListener('click', () => {
    if (editor.isPlaying) { editor.stop(); togglePlayUI(false); }
    editor.removeLastEvent();
  });

  els.clearBtn.addEventListener('click', () => {
    if (editor.isPlaying) { editor.stop(); togglePlayUI(false); }
    editor.clearPattern();
  });

  // --- プリセット ---

  els.presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (editor.isPlaying) { editor.stop(); togglePlayUI(false); }
      editor.loadPreset(btn.dataset.preset);
      els.beatButtons.forEach(b =>
        b.classList.toggle('active', b.dataset.value === '4')
      );
    });
  });

  // --- 再生/停止 ---

  function togglePlayUI(playing) {
    if (playing) {
      els.playBtn.innerHTML = '&#9632; STOP';
      els.playBtn.classList.add('playing');
    } else {
      els.playBtn.innerHTML = '&#9654; 再生';
      els.playBtn.classList.remove('playing');
      renderer.render(editor.pattern, editor.beatsPerMeasure, -1);
    }
  }

  els.playBtn.addEventListener('click', () => {
    if (editor.isPlaying) {
      editor.stop();
      togglePlayUI(false);
    } else {
      editor.play();
      togglePlayUI(true);
    }
  });

  // --- メトロノーム ON/OFF ---

  els.metronomeBtn.addEventListener('click', () => {
    const on = editor.toggleMetronome();
    els.metronomeBtn.textContent = on ? 'メトロノーム ON' : 'メトロノーム OFF';
    els.metronomeBtn.classList.toggle('active', on);
  });

  // --- 初期表示 ---

  updateTempoDisplay();
  updateDisplay();
});
