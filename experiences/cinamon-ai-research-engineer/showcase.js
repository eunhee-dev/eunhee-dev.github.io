(function() {
  var markdownListBlocks = document.querySelectorAll(
    '.hero-summary, [data-markdown-list]'
  );
  var carousels = document.querySelectorAll('[data-media-carousel]');
  var fencePattern = /^(`{2,})(.*)$/;
  var inlineCodePattern = /`([^`]+)`/g;

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

  markdownListBlocks.forEach(function(block) {
    var lines = block.textContent.split(/\r?\n/);
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
    var hasInlineCode = inlineCodePattern.test(block.textContent);
    var hasInlineHighlight = lines.some(function(line) {
      return Boolean(findHighlightRange(line));
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

    function flushParagraph() {
      var paragraph;

      if (!paragraphLines.length) {
        return;
      }

      paragraph = document.createElement('p');
      appendInlineContent(paragraph, paragraphLines.join(' '));
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

    if (!hasMarkdownList && !hasCodeFence && !hasInlineCode && !hasInlineHighlight) {
      return;
    }

    replacement = document.createElement('div');
    replacement.className = (block.className ? block.className + ' ' : '') +
      'markdown-list-rich';

    if (block.classList.contains('hero-summary')) {
      replacement.classList.add('hero-summary-rich');
    }

    lines.forEach(function(line) {
      var lineMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      var fenceMatch = line.trim().match(fencePattern);
      var trimmedLine = line.trim();
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
        flushParagraph();
        resetListState();
        return;
      }

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
        appendInlineContent(listItem, lineMatch[2].trim());
        listEntry.list.appendChild(listItem);
        listEntry.lastItem = listItem;
        return;
      }

      resetListState();
      paragraphLines.push(trimmedLine);
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
