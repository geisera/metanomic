// The iframe script also embeds this function, so keep its dependencies inside it.
export function renderReplyMarkdown(root: HTMLElement, text: string) {
  root.replaceChildren();

  function appendInline(parent: HTMLElement, value: string) {
    const pattern = /(!?\[[^\]\n]+\]\([^\)\n]+\)|\x60[^\x60\n]+\x60|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
    let position = 0;
    for (const match of value.matchAll(pattern)) {
      parent.append(value.slice(position, match.index));
      const token = match[0];
      if (token.startsWith('![')) {
        parent.append(token.slice(2, token.indexOf(']')));
      } else if (token.startsWith('[')) {
        const close = token.indexOf(']');
        const label = token.slice(1, close);
        let safeUrl: URL | undefined;
        try {
          const url = new URL(token.slice(close + 2, -1), location.origin);
          if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) safeUrl = url;
        } catch {
          // An invalid destination still has a readable label.
        }
        if (safeUrl) {
          const link = document.createElement('a');
          link.textContent = label;
          link.href = safeUrl.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          parent.append(link);
        } else {
          parent.append(label);
        }
      } else if (token.charCodeAt(0) === 96) {
        const code = document.createElement('code');
        code.textContent = token.slice(1, -1);
        parent.append(code);
      } else {
        const bold = token.startsWith('**') || token.startsWith('__');
        const emphasis = document.createElement(bold ? 'strong' : 'em');
        emphasis.textContent = token.slice(bold ? 2 : 1, bold ? -2 : -1);
        parent.append(emphasis);
      }
      position = match.index + token.length;
    }
    parent.append(value.slice(position));
  }

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const fence = /^\s*\x60{3}(?:[^\x60]*)$/;
  const bullet = /^\s*[-+*]\s+/;
  const number = /^\s*\d+[.)]\s+/;
  const heading = /^\s*#{1,6}\s+/;
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
    } else if (fence.test(line)) {
      const codeLines: string[] = [];
      while (++index < lines.length && !fence.test(lines[index])) codeLines.push(lines[index]);
      index++;
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = codeLines.join('\n');
      pre.append(code);
      root.append(pre);
    } else if (bullet.test(line) || number.test(line)) {
      const marker = bullet.test(line) ? bullet : number;
      const list = document.createElement(marker === bullet ? 'ul' : 'ol');
      while (index < lines.length && marker.test(lines[index])) {
        const item = document.createElement('li');
        appendInline(item, lines[index++].replace(marker, ''));
        list.append(item);
      }
      root.append(list);
    } else {
      const paragraph = document.createElement('p');
      if (heading.test(line)) {
        paragraph.className = 'markdown-heading';
        appendInline(paragraph, line.replace(heading, ''));
        index++;
      } else {
        const paragraphLines = [line];
        while (++index < lines.length && lines[index].trim() && !bullet.test(lines[index]) &&
          !number.test(lines[index]) && !heading.test(lines[index]) && !fence.test(lines[index])) {
          paragraphLines.push(lines[index]);
        }
        appendInline(paragraph, paragraphLines.map(value => value.replace(/^>\s?/, '')).join(' '));
      }
      root.append(paragraph);
    }
  }
}
