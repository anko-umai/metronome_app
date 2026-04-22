/**
 * StaffRenderer
 * SVG による五線譜レンダリング
 */
class StaffRenderer {
  constructor(svgElement) {
    this.svg = svgElement;
    this.lineSpacing = 12;
    this.staffLines = [45, 57, 69, 81, 93];
    this.noteY = 69;
    this.stemHeight = 34;
    this.noteAreaLeft = 100;
    this.noteAreaRight = 770;
    this.noteAreaWidth = 670;
    this.colors = {
      line: '#555',
      note: '#ddd',
      active: '#ff8c00',
      guide: '#333',
      timeSig: '#999'
    };
  }

  render(pattern, beatsPerMeasure, activeIndex) {
    this._clear();
    this._drawStaffLines();
    this._drawBarLines();
    this._drawTimeSignature(beatsPerMeasure);
    this._drawBeatGuides(beatsPerMeasure);
    if (pattern.length > 0) {
      this._drawPattern(pattern, beatsPerMeasure, activeIndex);
    }
  }

  _clear() {
    this.svg.innerHTML = '';
  }

  _el(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  _drawStaffLines() {
    for (const y of this.staffLines) {
      this.svg.appendChild(this._el('line', {
        x1: 40, y1: y, x2: this.noteAreaRight + 10, y2: y,
        stroke: this.colors.line, 'stroke-width': 1
      }));
    }
  }

  _drawBarLines() {
    const top = this.staffLines[0];
    const bot = this.staffLines[4];
    this.svg.appendChild(this._el('line', {
      x1: 40, y1: top, x2: 40, y2: bot,
      stroke: this.colors.line, 'stroke-width': 2
    }));
    const rx = this.noteAreaRight + 10;
    this.svg.appendChild(this._el('line', {
      x1: rx, y1: top, x2: rx, y2: bot,
      stroke: this.colors.line, 'stroke-width': 1
    }));
    this.svg.appendChild(this._el('line', {
      x1: rx + 4, y1: top, x2: rx + 4, y2: bot,
      stroke: this.colors.line, 'stroke-width': 3
    }));
  }

  _drawTimeSignature(beats) {
    const x = 62;
    const top = this._el('text', {
      x: x, y: this.staffLines[1] + 5,
      'text-anchor': 'middle', 'font-size': '24', 'font-weight': 'bold',
      fill: this.colors.timeSig, 'font-family': 'serif'
    });
    top.textContent = String(beats);
    this.svg.appendChild(top);

    const bot = this._el('text', {
      x: x, y: this.staffLines[3] + 5,
      'text-anchor': 'middle', 'font-size': '24', 'font-weight': 'bold',
      fill: this.colors.timeSig, 'font-family': 'serif'
    });
    bot.textContent = '4';
    this.svg.appendChild(bot);
  }

  _drawBeatGuides(beats) {
    for (let i = 1; i < beats; i++) {
      const x = this.noteAreaLeft + (i / beats) * this.noteAreaWidth;
      this.svg.appendChild(this._el('line', {
        x1: x, y1: this.staffLines[0] - 5, x2: x, y2: this.staffLines[4] + 5,
        stroke: this.colors.guide, 'stroke-width': 1, 'stroke-dasharray': '4,4'
      }));
    }
  }

  // --- 付点判定 ---

  _getNoteInfo(duration) {
    if (Math.abs(duration - 3) < 0.001) return { base: 2, dotted: true };
    if (Math.abs(duration - 1.5) < 0.001) return { base: 1, dotted: true };
    if (Math.abs(duration - 0.75) < 0.001) return { base: 0.5, dotted: true };
    return { base: duration, dotted: false };
  }

  _drawDot(x, y, color) {
    this.svg.appendChild(this._el('circle', {
      cx: x + 14, cy: y - 3, r: 2.5, fill: color
    }));
  }

  // --- パターン描画 ---

  _drawPattern(pattern, beatsPerMeasure, activeIndex) {
    const total = beatsPerMeasure;
    let cumTime = 0;
    const events = pattern.map((ev, i) => {
      const st = cumTime;
      const w = (ev.duration / total) * this.noteAreaWidth;
      const x = this.noteAreaLeft + (st / total) * this.noteAreaWidth + w / 2;
      cumTime += ev.duration;
      return { ...ev, x, width: w, idx: i, startTime: st };
    });

    const beatGroups = [];
    for (let b = 0; b < beatsPerMeasure; b++) {
      beatGroups.push(events.filter(e =>
        e.startTime >= b - 0.001 && e.startTime < b + 1 - 0.001
      ));
    }

    for (const group of beatGroups) {
      const flagged = group.filter(e =>
        e.type === 'note' && this._getNoteInfo(e.duration).base <= 0.5
      );
      if (flagged.length >= 2) {
        this._drawBeamedGroup(flagged, activeIndex);
        for (const e of group) {
          if (e.type === 'rest') this._drawRest(e.x, e.duration, e.idx === activeIndex);
          else if (e.duration > 0.5) this._drawNote(e.x, e.duration, e.idx === activeIndex);
        }
      } else {
        for (const e of group) {
          if (e.type === 'note') this._drawNote(e.x, e.duration, e.idx === activeIndex);
          else this._drawRest(e.x, e.duration, e.idx === activeIndex);
        }
      }
    }
  }

  // --- 単独音符描画 ---

  _drawNote(x, duration, isActive) {
    const color = isActive ? this.colors.active : this.colors.note;
    const y = this.noteY;
    const { base, dotted } = this._getNoteInfo(duration);
    const filled = base <= 1;

    this.svg.appendChild(this._el('ellipse', {
      cx: x, cy: y, rx: 8, ry: 5.5,
      fill: filled ? color : 'none',
      stroke: color, 'stroke-width': 2,
      transform: `rotate(-15,${x},${y})`
    }));

    if (base < 4) {
      const stemX = x + 7;
      const stemTop = y - this.stemHeight;
      this.svg.appendChild(this._el('line', {
        x1: stemX, y1: y - 3, x2: stemX, y2: stemTop,
        stroke: color, 'stroke-width': 2
      }));
      if (base === 0.5) this._drawFlags(stemX, stemTop, 1, color);
      if (base === 0.25) this._drawFlags(stemX, stemTop, 2, color);
    }

    if (dotted) this._drawDot(x, y, color);
  }

  _drawFlags(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const fy = y + i * 8;
      this.svg.appendChild(this._el('path', {
        d: `M${x},${fy} Q${x + 12},${fy + 5} ${x + 6},${fy + 13}`,
        stroke: color, fill: 'none', 'stroke-width': 2.5
      }));
    }
  }

  // --- 連桁（ビーム）描画 ---

  _drawBeamedGroup(notes, activeIndex) {
    const y = this.noteY;
    const stemTop = y - this.stemHeight;

    for (const n of notes) {
      const color = n.idx === activeIndex ? this.colors.active : this.colors.note;
      this.svg.appendChild(this._el('ellipse', {
        cx: n.x, cy: y, rx: 8, ry: 5.5,
        fill: color, stroke: color, 'stroke-width': 1.5,
        transform: `rotate(-15,${n.x},${y})`
      }));
      this.svg.appendChild(this._el('line', {
        x1: n.x + 7, y1: y - 3, x2: n.x + 7, y2: stemTop,
        stroke: color, 'stroke-width': 2
      }));
      if (this._getNoteInfo(n.duration).dotted) this._drawDot(n.x, y, color);
    }

    const x1 = notes[0].x + 7;
    const x2 = notes[notes.length - 1].x + 7;
    this.svg.appendChild(this._el('rect', {
      x: x1, y: stemTop - 1.5, width: x2 - x1, height: 3.5,
      fill: this.colors.note
    }));

    let i = 0;
    while (i < notes.length) {
      if (this._getNoteInfo(notes[i].duration).base <= 0.25) {
        const start = i;
        while (i < notes.length && this._getNoteInfo(notes[i].duration).base <= 0.25) i++;
        const end = i - 1;
        const sx = notes[start].x + 7;
        const ex = notes[end].x + 7;
        if (start === end) {
          const dir = start > 0 ? -1 : 1;
          this.svg.appendChild(this._el('rect', {
            x: dir === -1 ? sx - 10 : sx, y: stemTop + 5,
            width: 10, height: 3.5, fill: this.colors.note
          }));
        } else {
          this.svg.appendChild(this._el('rect', {
            x: sx, y: stemTop + 5, width: ex - sx, height: 3.5,
            fill: this.colors.note
          }));
        }
      } else {
        i++;
      }
    }
  }

  // --- 休符描画 ---

  _drawRest(x, duration, isActive) {
    const color = isActive ? this.colors.active : this.colors.note;
    const y = this.noteY;
    const { base, dotted } = this._getNoteInfo(duration);

    if (base >= 2) {
      this.svg.appendChild(this._el('rect', {
        x: x - 9, y: this.staffLines[1], width: 18, height: 6,
        fill: color
      }));
    } else if (base >= 1) {
      this.svg.appendChild(this._el('path', {
        d: `M${x + 3},${y - 15} L${x - 5},${y - 7} L${x + 5},${y} L${x - 3},${y + 8}` +
           ` Q${x + 5},${y + 4} ${x + 2},${y + 1}`,
        stroke: color, fill: 'none', 'stroke-width': 2.5, 'stroke-linecap': 'round'
      }));
    } else if (base >= 0.5) {
      this.svg.appendChild(this._el('circle', {
        cx: x + 3, cy: y + 2, r: 2.5, fill: color
      }));
      this.svg.appendChild(this._el('path', {
        d: `M${x},${y - 12} Q${x + 10},${y - 4} ${x + 3},${y}`,
        stroke: color, fill: 'none', 'stroke-width': 2.5
      }));
    } else {
      this.svg.appendChild(this._el('circle', {
        cx: x + 3, cy: y + 2, r: 2.5, fill: color
      }));
      this.svg.appendChild(this._el('circle', {
        cx: x + 5, cy: y - 6, r: 2.5, fill: color
      }));
      this.svg.appendChild(this._el('path', {
        d: `M${x - 1},${y - 16} Q${x + 8},${y - 10} ${x + 5},${y - 5}` +
           ` Q${x + 10},${y - 1} ${x + 3},${y + 3}`,
        stroke: color, fill: 'none', 'stroke-width': 2.5
      }));
    }

    if (dotted) this._drawDot(x, y, color);
  }
}
