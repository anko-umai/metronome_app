/**
 * MetronomeUI
 * DOM 操作・イベントハンドリング
 */
class MetronomeUI {
  constructor() {
    this.elements = {};
  }

  init() {
    this.elements = {
      tempoDisplay:   document.getElementById('tempo-display'),
      tempoSlider:    document.getElementById('tempo-slider'),
      tempoDown:      document.getElementById('tempo-down'),
      tempoUp:        document.getElementById('tempo-up'),
      beatButtons:    document.querySelectorAll('.beat-btn'),
      beatIndicators: document.getElementById('beat-indicators'),
      noteButtons:    document.querySelectorAll('.note-btn'),
      playButton:     document.getElementById('play-btn')
    };
  }

  // テンポ表示更新
  updateTempoDisplay(bpm) {
    this.elements.tempoDisplay.textContent = bpm;
    this.elements.tempoSlider.value = bpm;
  }

  // ビートインジケーター再描画
  updateBeatIndicators(beats) {
    const container = this.elements.beatIndicators;
    container.innerHTML = '';
    for (let i = 0; i < beats; i++) {
      const dot = document.createElement('div');
      dot.className = 'beat-dot';
      if (i === 0) {
        dot.classList.add('accent');
      }
      container.appendChild(dot);
    }
  }

  // 現在の拍をハイライト
  highlightBeat(beatInfo) {
    const dots = this.elements.beatIndicators.querySelectorAll('.beat-dot');
    dots.forEach(dot => dot.classList.remove('active'));
    if (beatInfo.beat < dots.length) {
      dots[beatInfo.beat].classList.add('active');
    }
  }

  // ハイライト全解除
  clearBeatHighlight() {
    const dots = this.elements.beatIndicators.querySelectorAll('.beat-dot');
    dots.forEach(dot => dot.classList.remove('active'));
  }

  // ボタングループの選択状態切替
  updateActiveButton(groupClass, value) {
    const buttons = document.querySelectorAll('.' + groupClass);
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === String(value));
    });
  }

  // 再生/停止ボタン切替
  togglePlayButton(isPlaying) {
    const btn = this.elements.playButton;
    if (isPlaying) {
      btn.innerHTML = '&#9632; STOP';
      btn.classList.add('playing');
    } else {
      btn.innerHTML = '&#9654; START';
      btn.classList.remove('playing');
    }
  }
}
