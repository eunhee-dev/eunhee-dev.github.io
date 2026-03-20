(function() {
  var heroSummaries = document.querySelectorAll('.hero-summary');
  var carousels = document.querySelectorAll('[data-media-carousel]');

  heroSummaries.forEach(function(summary) {
    var lines = summary.textContent.split(/\r?\n/);
    var hasMarkdownList = lines.some(function(line) {
      return /^[-*+]\s+/.test(line.trim());
    });
    var replacement;
    var paragraphLines = [];
    var currentList = null;

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

    if (!hasMarkdownList) {
      return;
    }

    replacement = document.createElement('div');
    replacement.className = summary.className + ' hero-summary-rich';

    lines.forEach(function(line) {
      var trimmedLine = line.trim();
      var listItem;

      if (!trimmedLine) {
        flushParagraph();
        currentList = null;
        return;
      }

      if (/^[-*+]\s+/.test(trimmedLine)) {
        flushParagraph();

        if (!currentList) {
          currentList = document.createElement('ul');
          replacement.appendChild(currentList);
        }

        listItem = document.createElement('li');
        listItem.textContent = trimmedLine.replace(/^[-*+]\s+/, '');
        currentList.appendChild(listItem);
        return;
      }

      currentList = null;
      paragraphLines.push(trimmedLine);
    });

    flushParagraph();
    summary.replaceWith(replacement);
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
