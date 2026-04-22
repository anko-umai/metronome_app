/**
 * リズムエディターページの初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  const editor = new RhythmEditor();
  const staffSvg = document.getElementById('staff');
  const renderer = new StaffRenderer(staffSvg);

  let dottedMode = false;

  const DOTTED_MAP = { 2: 3, 1: 1.5, 0.5: 0.75 };
  const DOTTED_LABELS = {
    '2': '2分.', '1': '4分.', '0.5': '8分.',
    '2-rest': '2分休.', '1-rest': '4分休.', '0.5-rest': '8分休.'
  };
  const NORMAL_LABELS = {
    '2': '2分', '1': '4分', '0.5': '8分', '0.25': '16分',
    '2-rest': '2分休', '1-rest': '4分休', '0.5-rest': '8分休', '0.25-rest': '16分休'
  };

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
    dottedToggle: document.getElementById('dotted-toggle'),
    remaining: document.getElementById('remaining-display')
  };

  function getEffectiveDuration(baseDuration) {
    if (!dottedMode) return baseDuration;
    const d = DOTTED_MAP[baseDuration];
    return d !== undefined ? d : baseDuration;
  }

  function updateButtonLabels() {
    els.noteButtons.forEach(btn => {
      const base = btn.dataset.duration;
      if (dottedMode && DOTTED_LABELS[base]) {
        btn.textContent = DOTTED_LABELS[base];
      } else {
        btn.textContent = NORMAL_LABELS[base] || base;
      }
    });
    els.restButtons.forEach(btn => {
      const base = btn.dataset.duration;
      const key = base + '-rest';
      if (dottedMode && DOTTED_LABELS[key]) {
        btn.textContent = DOTTED_LABELS[key];
      } else {
        btn.textContent = NORMAL_LABELS[key] || base;
      }
    });
  }

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
    els.noteButtons.forEach(btn => {
      const dur = getEffectiveDuration(parseFloat(btn.dataset.duration));
      btn.disabled = !editor.canAdd(dur);
    });
    els.restButtons.forEach(btn => {
      const dur = getEffectiveDuration(parseFloat(btn.dataset.duration));
      btn.disabled = !editor.canAdd(dur);
    });
    // 付点ON時、16分ボタンは無効（付点16分は非対応）
    if (dottedMode) {
      els.noteButtons.forEach(btn => {
        if (parseFloat(btn.dataset.duration) === 0.25) btn.disabled = true;
      });
      els.restButtons.forEach(btn => {
        if (parseFloat(btn.dataset.duration) === 0.25) btn.disabled = true;
      });
    }
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

  // --- 付点トグル ---

  els.dottedToggle.addEventListener('click', () => {
    dottedMode = !dottedMode;
    els.dottedToggle.classList.toggle('active', dottedMode);
    els.dottedToggle.textContent = dottedMode ? '付点 ON' : '付点';
    updateButtonLabels();
    updateButtonStates();
  });

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
      const dur = getEffectiveDuration(parseFloat(btn.dataset.duration));
      editor.addEvent('note', dur);
    });
  });

  // --- 休符追加 ---

  els.restButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = getEffectiveDuration(parseFloat(btn.dataset.duration));
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
