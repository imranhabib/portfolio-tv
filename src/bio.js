// Bio: the typewriter text on the DVD channel. It owns typing progress and both layouts:
// words on wide screens, single letters wrapped around the top-right corner on small screens.
// All points and rects it returns are relative to `frame` (the TV screen).
const msPerLetter = 35;

export function createBio(element, frame, mobileScreen) {
  const words = [...element.querySelectorAll('.bio-word')];
  const wordText = words.map((word) => word.textContent);
  const textLength = wordText.reduce((length, word) => length + word.length, 0);
  let startedAt;
  let typed = 0;
  let borderWordWidths;

  words.forEach((word) => { word.textContent = ''; });

  function fill(word, text) {
    word.textContent = text;
    if (!mobileScreen.matches) return;
    word.replaceChildren(...[...text].map((letter) => {
      const span = document.createElement('span');
      span.className = 'bio-letter';
      span.textContent = letter;
      return span;
    }));
  }

  function layoutBorder() {
    if (!mobileScreen.matches) return;
    if (!borderWordWidths) {
      const measure = document.createElement('span');
      measure.className = 'bio-letter';
      measure.style.visibility = 'hidden';
      element.appendChild(measure);
      const widths = new Map();
      for (const letter of new Set(wordText.join(''))) {
        measure.textContent = letter;
        widths.set(letter, measure.offsetWidth);
      }
      borderWordWidths = wordText.map((word) => [...word].reduce((width, letter) => width + widths.get(letter), 0));
      measure.remove();
    }
    const space = 4;
    const totalWidth = borderWordWidths.reduce((sum, width) => sum + width + space, 0);
    const radius = 44;
    const cornerStart = element.clientWidth - radius;
    const arcLength = Math.PI * radius / 2;
    const curveSpacing = 2;
    const sideRoom = element.clientHeight - radius + arcLength;
    // The text starts at the left end of the top edge, bends round the corner and runs down the
    // side. Scale it so it fills that whole path (never above its CSS size).
    const scale = Math.min(1, (cornerStart + sideRoom) / (totalWidth - space));
    let distance = 0;
    for (const word of words) {
      if (!word.textContent.length) continue;
      for (const letter of word.querySelectorAll('.bio-letter')) {
        const width = letter.offsetWidth * scale;
        const center = distance + width / 2;
        let x = center;
        let y = 0;
        let angle = 0;
        if (center > cornerStart + arcLength) {
          x = element.clientWidth;
          y = radius + center - cornerStart - arcLength;
          angle = 90;
        } else if (center > cornerStart) {
          const radians = (center - cornerStart) / radius;
          x = cornerStart + Math.sin(radians) * radius;
          y = radius - Math.cos(radians) * radius;
          angle = radians * 180 / Math.PI;
        }
        letter.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg) scale(${scale}) translateX(${-letter.offsetWidth / 2}px)`;
        distance += width;
        if (angle > 0 && angle < 90) distance += curveSpacing * scale;
      }
      distance += space * scale;
    }
  }

  function relayout() {
    borderWordWidths = undefined;
    words.forEach((word) => fill(word, word.textContent));
    layoutBorder();
  }

  return {
    // Types letters for the elapsed time. Returns the centre of the newest letter when
    // the text changed, otherwise null.
    advance(time) {
      if (startedAt === undefined) startedAt = time;
      const visible = Math.min(textLength, Math.floor((time - startedAt) / msPerLetter));
      if (visible === typed) return null;
      typed = visible;
      let remaining = visible;
      words.forEach((word, index) => {
        fill(word, wordText[index].slice(0, Math.max(0, remaining)));
        remaining -= wordText[index].length;
      });
      layoutBorder();

      const activeWord = words.findLast((word) => word.textContent.length > 0);
      if (!activeWord) return null;
      const range = document.createRange();
      const textNode = mobileScreen.matches ? activeWord.lastChild.firstChild : activeWord.firstChild;
      range.setStart(textNode, textNode.length - 1);
      range.setEnd(textNode, textNode.length);
      const letter = range.getBoundingClientRect();
      const origin = frame.getBoundingClientRect();
      return { x: letter.left - origin.left + letter.width / 2, y: letter.top - origin.top + letter.height / 2 };
    },
    // Clear the text and its colour, so typing starts again from the first letter.
    restart() {
      typed = 0;
      startedAt = undefined;
      words.forEach((word) => { word.textContent = ''; });
      element.style.color = '';
      relayout();
    },
    // Continue typing from where it stopped (after time spent on another channel).
    resume(now) {
      startedAt = now - typed * msPerLetter;
      relayout();
    },
    relayout,
    // Rects of the typed text, used as obstacles for the bouncing icons.
    rects() {
      const origin = frame.getBoundingClientRect();
      const targets = mobileScreen.matches ? [...element.querySelectorAll('.bio-letter')] : words;
      return targets.filter((target) => target.textContent.length > 0).flatMap((target) =>
        [...target.getClientRects()].map((rect) => ({
          x: rect.left - origin.left,
          y: rect.top - origin.top,
          width: rect.width,
          height: rect.height,
        })),
      );
    },
    setColor(color) {
      element.style.color = color;
    },
  };
}
