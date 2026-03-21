(function() {
  var markdownListBlocks = document.querySelectorAll(
    '.hero-summary, [data-markdown-list]'
  );
  var carousels = document.querySelectorAll('[data-media-carousel]');

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
    var hasMarkdownList = bulletLines.length > 0;
    var baseIndent = hasMarkdownList
      ? bulletLines.reduce(function(minIndent, bulletLine) {
          return Math.min(minIndent, bulletLine.indent);
        }, bulletLines[0].indent)
      : 0;
    var replacement;
    var paragraphLines = [];
    var listStack = [];

    function flushParagraph() {
      var paragraph;

      if (!paragraphLines.length) {
        return;
      }

      paragraph = document.createElement('p');
      paragraph.textContent = paragraphLines.join(' ');
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

    if (!hasMarkdownList) {
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
      var trimmedLine = line.trim();
      var listEntry;
      var listItem;
      var relativeIndent;

      if (!trimmedLine) {
        flushParagraph();
        resetListState();
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
        listItem.textContent = lineMatch[2].trim();
        listEntry.list.appendChild(listItem);
        listEntry.lastItem = listItem;
        return;
      }

      resetListState();
      paragraphLines.push(trimmedLine);
    });

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
