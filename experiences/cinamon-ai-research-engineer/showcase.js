(function() {
  var markdownListBlocks = document.querySelectorAll(
    '.hero-summary, [data-markdown-list]'
  );
  var carousels = document.querySelectorAll('[data-media-carousel]');
  var fencePattern = /^(`{2,})(.*)$/;
  var inlineCodePattern = /`([^`]+)`/g;
  var TEXT_NODE = 3;
  var ELEMENT_NODE = 1;
  var INLINE_TAGS = {
    A: true,
    ABBR: true,
    B: true,
    BDI: true,
    BDO: true,
    CITE: true,
    CODE: true,
    DATA: true,
    DFN: true,
    EM: true,
    I: true,
    KBD: true,
    LABEL: true,
    MARK: true,
    Q: true,
    RP: true,
    RT: true,
    RUBY: true,
    S: true,
    SAMP: true,
    SMALL: true,
    SPAN: true,
    STRONG: true,
    SUB: true,
    SUP: true,
    TIME: true,
    U: true,
    VAR: true,
    WBR: true
  };

  function appendTextNode(parent, text) {
    if (!text) {
      return;
    }

    parent.appendChild(document.createTextNode(text));
  }

  function findHighlightRange(text, startIndex) {
    var highlightStart = text.indexOf('==', startIndex || 0);
    var highlightEnd;

    while (highlightStart >= 0) {
      highlightEnd = text.indexOf('==', highlightStart + 2);

      if (highlightEnd < 0) {
        return null;
      }

      if (highlightEnd > highlightStart + 2) {
        return {
          start: highlightStart,
          end: highlightEnd
        };
      }

      highlightStart = text.indexOf('==', highlightStart + 2);
    }

    return null;
  }

  function appendHighlightedText(parent, text) {
    var cursor = 0;
    var highlightRange;
    var mark;

    while (cursor < text.length) {
      highlightRange = findHighlightRange(text, cursor);

      if (!highlightRange) {
        appendTextNode(parent, text.slice(cursor));
        return;
      }

      appendTextNode(parent, text.slice(cursor, highlightRange.start));
      mark = document.createElement('mark');
      mark.className = 'showcase-highlight';
      mark.textContent = text.slice(highlightRange.start + 2, highlightRange.end);
      parent.appendChild(mark);
      cursor = highlightRange.end + 2;
    }
  }

  function appendInlineContent(parent, text) {
    var fragment =
      typeof document.createDocumentFragment === 'function'
        ? document.createDocumentFragment()
        : null;
    var target = fragment || parent;
    var match;
    var lastIndex = 0;

    inlineCodePattern.lastIndex = 0;

    while ((match = inlineCodePattern.exec(text))) {
      var codeNode;

      if (match.index > lastIndex) {
        appendHighlightedText(target, text.slice(lastIndex, match.index));
      }

      codeNode = document.createElement('code');
      codeNode.textContent = match[1];
      target.appendChild(codeNode);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      appendHighlightedText(target, text.slice(lastIndex));
    }

    if (fragment) {
      parent.appendChild(fragment);
    }
  }

  function normalizeCodeBlock(lines) {
    var contentLines = lines.map(function(line) {
      return line.replace(/\t/g, '  ');
    });
    var indents = contentLines
      .filter(function(line) {
        return line.trim().length > 0;
      })
      .map(function(line) {
        return line.match(/^ */)[0].length;
      });
    var minIndent = indents.length
      ? indents.reduce(function(minValue, indent) {
          return Math.min(minValue, indent);
        }, indents[0])
      : 0;

    return contentLines
      .map(function(line) {
        return line.trim().length ? line.slice(minIndent) : '';
      })
      .join('\n');
  }

  function appendCodeBlock(parent, lines, language) {
    var pre = document.createElement('pre');
    var code = document.createElement('code');

    if (language) {
      code.className = 'language-' + language;
      code.setAttribute('data-language', language);
    }

    code.textContent = normalizeCodeBlock(lines);
    pre.appendChild(code);
    parent.appendChild(pre);
  }

  function isInlineElement(node) {
    return node.nodeType === ELEMENT_NODE && Boolean(INLINE_TAGS[node.tagName]);
  }

  function cloneSegments(segments) {
    return segments.map(function(segment) {
      if (segment.type === 'text') {
        return {
          type: 'text',
          text: segment.text
        };
      }

      return {
        type: 'node',
        node: segment.node.cloneNode(true)
      };
    });
  }

  function trimLineSegments(segments) {
    var trimmed = cloneSegments(segments);

    while (trimmed.length && trimmed[0].type === 'text' && !trimmed[0].text.trim()) {
      trimmed.shift();
    }

    while (
      trimmed.length &&
      trimmed[trimmed.length - 1].type === 'text' &&
      !trimmed[trimmed.length - 1].text.trim()
    ) {
      trimmed.pop();
    }

    if (trimmed.length && trimmed[0].type === 'text') {
      trimmed[0].text = trimmed[0].text.replace(/^\s+/, '');
    }

    if (trimmed.length && trimmed[trimmed.length - 1].type === 'text') {
      trimmed[trimmed.length - 1].text = trimmed[trimmed.length - 1].text.replace(/\s+$/, '');

      if (!trimmed[trimmed.length - 1].text.length) {
        trimmed.pop();
      }
    }

    return trimmed.filter(function(segment) {
      return segment.type !== 'text' || segment.text.length > 0;
    });
  }

  function lineSegmentsToText(segments) {
    return segments
      .map(function(segment) {
        if (segment.type === 'text') {
          return segment.text;
        }

        return segment.node.textContent || '';
      })
      .join('');
  }

  function appendSegments(parent, segments) {
    segments.forEach(function(segment) {
      if (segment.type === 'text') {
        appendInlineContent(parent, segment.text);
        return;
      }

      parent.appendChild(segment.node);
    });
  }

  function stripListMarker(segments) {
    var stripped = cloneSegments(segments);

    if (!stripped.length || stripped[0].type !== 'text') {
      return trimLineSegments(stripped);
    }

    stripped[0].text = stripped[0].text.replace(/^(\s*)[-*+]\s+/, '');

    if (!stripped[0].text.length) {
      stripped.shift();
    }

    return trimLineSegments(stripped);
  }

  function lineHasMeaningfulContent(line) {
    return line.segments.some(function(segment) {
      return segment.type === 'node' || Boolean(segment.text.trim());
    });
  }

  function collectContentItems(block) {
    var items = [
      {
        type: 'line',
        segments: []
      }
    ];
    var currentLine = items[0];

    function startNewLine() {
      currentLine = {
        type: 'line',
        segments: []
      };
      items.push(currentLine);
    }

    Array.prototype.slice.call(block.childNodes).forEach(function(node) {
      if (node.nodeType === TEXT_NODE) {
        node.textContent.split(/\r?\n/).forEach(function(part, index, parts) {
          if (part.length) {
            currentLine.segments.push({
              type: 'text',
              text: part
            });
          }

          if (index < parts.length - 1) {
            startNewLine();
          }
        });
        return;
      }

      if (node.nodeType === ELEMENT_NODE && node.tagName === 'BR') {
        startNewLine();
        return;
      }

      if (isInlineElement(node)) {
        currentLine.segments.push({
          type: 'node',
          node: node.cloneNode(true)
        });
        return;
      }

      if (node.nodeType === ELEMENT_NODE) {
        if (!lineHasMeaningfulContent(currentLine)) {
          items.pop();
        }

        items.push({
          type: 'block',
          node: node.cloneNode(true)
        });
        startNewLine();
      }
    });

    return items;
  }

  markdownListBlocks.forEach(function(block) {
    var contentItems = collectContentItems(block);
    var lines = contentItems
      .filter(function(item) {
        return item.type === 'line';
      })
      .map(function(item) {
        return lineSegmentsToText(item.segments);
      });
    var sourceText = lines.join('\n');
    var bulletLines = lines
      .map(function(line) {
        var match = line.match(/^(\s*)[-*+]\s+(.*)$/);

        if (!match) {
          return null;
        }

        return {
          indent: match[1].replace(/\t/g, '  ').length
        };
      })
      .filter(Boolean);
    var hasCodeFence = lines.some(function(line) {
      return fencePattern.test(line.trim());
    });
    inlineCodePattern.lastIndex = 0;
    var hasInlineCode = inlineCodePattern.test(sourceText);
    var hasInlineHighlight = lines.some(function(line) {
      return Boolean(findHighlightRange(line));
    });
    var hasEmbeddedBlocks = contentItems.some(function(item) {
      return item.type === 'block';
    });
    var hasMarkdownList = bulletLines.length > 0;
    var baseIndent = hasMarkdownList
      ? bulletLines.reduce(function(minIndent, bulletLine) {
          return Math.min(minIndent, bulletLine.indent);
        }, bulletLines[0].indent)
      : 0;
    var replacement;
    var paragraphLines = [];
    var listStack = [];
    var codeBlockState = null;
    var preserveListContext = false;

    function flushParagraph() {
      var paragraph;

      if (!paragraphLines.length) {
        return;
      }

      paragraph = document.createElement('p');
      paragraphLines.forEach(function(lineSegments, index) {
        if (index > 0) {
          appendTextNode(paragraph, ' ');
        }

        appendSegments(paragraph, lineSegments);
      });
      replacement.appendChild(paragraph);
      paragraphLines = [];
    }

    function resetListState() {
      listStack = [];
    }

    function appendList(parent) {
      var list = document.createElement('ul');

      parent.appendChild(list);
      return list;
    }

    function getCurrentContainer() {
      var currentEntry;

      if (!listStack.length) {
        return replacement;
      }

      currentEntry = listStack[listStack.length - 1];

      return currentEntry.lastItem || replacement;
    }

    function getCurrentListItem() {
      if (!listStack.length) {
        return null;
      }

      return listStack[listStack.length - 1].lastItem;
    }

    function getListEntry(relativeIndent) {
      var currentEntry;
      var nestedList;

      if (!listStack.length) {
        currentEntry = {
          indent: relativeIndent,
          list: appendList(replacement),
          lastItem: null
        };
        listStack.push(currentEntry);
        return currentEntry;
      }

      currentEntry = listStack[listStack.length - 1];

      if (relativeIndent > currentEntry.indent) {
        if (!currentEntry.lastItem) {
          return currentEntry;
        }

        nestedList = appendList(currentEntry.lastItem);
        currentEntry = {
          indent: relativeIndent,
          list: nestedList,
          lastItem: null
        };
        listStack.push(currentEntry);
        return currentEntry;
      }

      while (listStack.length > 1 && relativeIndent < currentEntry.indent) {
        listStack.pop();
        currentEntry = listStack[listStack.length - 1];
      }

      if (relativeIndent < currentEntry.indent) {
        currentEntry = {
          indent: relativeIndent,
          list: appendList(replacement),
          lastItem: null
        };
        listStack = [currentEntry];
      }

      return currentEntry;
    }

    function flushCodeBlock() {
      if (!codeBlockState) {
        return;
      }

      appendCodeBlock(
        codeBlockState.parent,
        codeBlockState.lines,
        codeBlockState.language
      );
      codeBlockState = null;
    }

    function processLine(lineSegments) {
      var line = lineSegmentsToText(lineSegments);
      var lineMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      var fenceMatch = line.trim().match(fencePattern);
      var trimmedLine = line.trim();
      var trimmedSegments = trimLineSegments(lineSegments);
      var currentListItem;
      var listEntry;
      var listItem;
      var relativeIndent;

      if (codeBlockState) {
        if (trimmedLine === codeBlockState.delimiter) {
          flushCodeBlock();
          return;
        }

        codeBlockState.lines.push(line);
        return;
      }

      if (!trimmedLine) {
        if (preserveListContext && listStack.length) {
          preserveListContext = false;
          return;
        }

        flushParagraph();
        resetListState();
        return;
      }

      preserveListContext = false;

      if (fenceMatch) {
        flushParagraph();
        codeBlockState = {
          delimiter: fenceMatch[1],
          language: fenceMatch[2].trim(),
          lines: [],
          parent: getCurrentContainer()
        };
        return;
      }

      if (lineMatch) {
        flushParagraph();
        relativeIndent = Math.max(
          0,
          lineMatch[1].replace(/\t/g, '  ').length - baseIndent
        );
        listEntry = getListEntry(relativeIndent);

        listItem = document.createElement('li');
        appendSegments(listItem, stripListMarker(lineSegments));
        listEntry.list.appendChild(listItem);
        listEntry.lastItem = listItem;
        return;
      }

      currentListItem = getCurrentListItem();

      if (currentListItem) {
        appendTextNode(currentListItem, ' ');
        appendSegments(currentListItem, trimmedSegments);
        return;
      }

      resetListState();
      paragraphLines.push(trimmedSegments);
    }

    if (!hasMarkdownList && !hasCodeFence && !hasInlineCode && !hasInlineHighlight && !hasEmbeddedBlocks) {
      return;
    }

    replacement = document.createElement('div');
    replacement.className = (block.className ? block.className + ' ' : '') +
      'markdown-list-rich';

    if (block.classList.contains('hero-summary')) {
      replacement.classList.add('hero-summary-rich');
    }

    contentItems.forEach(function(item) {
      if (item.type === 'block') {
        flushCodeBlock();
        flushParagraph();
        getCurrentContainer().appendChild(item.node);
        preserveListContext = Boolean(listStack.length);
        return;
      }

      processLine(item.segments);
    });

    flushCodeBlock();
    flushParagraph();
    block.replaceWith(replacement);
  });

  carousels.forEach(function(carousel) {
    var slides = Array.prototype.slice.call(
      carousel.querySelectorAll('[data-media-slide]')
    );
    var prevButton = carousel.querySelector('[data-media-prev]');
    var nextButton = carousel.querySelector('[data-media-next]');
    var currentNode = carousel.querySelector('[data-media-current]');
    var totalNode = carousel.querySelector('[data-media-total]');
    var descriptionNode = carousel.parentNode.querySelector(
      '[data-media-description-target], .placeholder-note'
    );
    var defaultDescription = descriptionNode ? descriptionNode.textContent.trim() : '';
    var currentIndex = slides.findIndex(function(slide) {
      return slide.classList.contains('is-active') && !slide.hidden;
    });

    if (!slides.length) {
      if (prevButton) {
        prevButton.hidden = true;
      }

      if (nextButton) {
        nextButton.hidden = true;
      }

      if (currentNode) {
        currentNode.textContent = '0';
      }

      if (totalNode) {
        totalNode.textContent = '0';
      }

      return;
    }

    if (currentIndex < 0) {
      currentIndex = 0;
    }

    function getSlideDescription(slide) {
      var explicitDescription = slide.getAttribute('data-media-description');
      var copyNode;
      var mediaNode;
      var accessibleDescription;

      if (explicitDescription) {
        return explicitDescription;
      }

      copyNode = slide.querySelector('.media-copy');

      if (copyNode && copyNode.textContent.trim()) {
        return copyNode.textContent.trim();
      }

      mediaNode = slide.querySelector('img, video, iframe');

      if (!mediaNode) {
        return defaultDescription;
      }

      accessibleDescription =
        mediaNode.getAttribute('aria-label') ||
        mediaNode.getAttribute('title') ||
        mediaNode.getAttribute('alt');

      return accessibleDescription || defaultDescription;
    }

    function syncSlideVideos(slide, isActive) {
      var videos = slide.querySelectorAll('video');

      videos.forEach(function(video) {
        var playPromise;

        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('autoplay', '');
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.setAttribute('playsinline', '');

        if (isActive) {
          playPromise = video.play();

          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function() {});
          }

          return;
        }

        video.pause();
      });
    }

    function render() {
      slides.forEach(function(slide, index) {
        var isActive = index === currentIndex;

        slide.hidden = !isActive;
        slide.classList.toggle('is-active', isActive);
        syncSlideVideos(slide, isActive);
      });

      if (descriptionNode) {
        descriptionNode.setAttribute('aria-live', 'polite');
        descriptionNode.textContent = getSlideDescription(slides[currentIndex]);
      }

      if (currentNode) {
        currentNode.textContent = String(currentIndex + 1);
      }

      if (totalNode) {
        totalNode.textContent = String(slides.length);
      }

      if (prevButton) {
        prevButton.hidden = slides.length < 2;
        prevButton.disabled = slides.length < 2;
      }

      if (nextButton) {
        nextButton.hidden = slides.length < 2;
        nextButton.disabled = slides.length < 2;
      }
    }

    if (prevButton) {
      prevButton.addEventListener('click', function() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        render();
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function() {
        currentIndex = (currentIndex + 1) % slides.length;
        render();
      });
    }

    render();
  });
})();
