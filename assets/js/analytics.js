(function() {
  // Replace with the production GA4 measurement ID before enabling analytics.
  var MEASUREMENT_ID = 'G-8RZSCYJ6K5';
  var PLACEHOLDER_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  var ANALYTICS_SCRIPT_ID = 'site-ga4-loader';

  if (window.siteAnalytics) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function() {
    window.dataLayer.push(arguments);
  };

  function isAnalyticsEnabled() {
    return Boolean(
      MEASUREMENT_ID && MEASUREMENT_ID !== PLACEHOLDER_MEASUREMENT_ID
    );
  }

  function readPageContext() {
    var body = document.body;

    if (!body || !body.getAttribute) {
      return {
        pageType: 'unknown',
        pageName: 'unknown'
      };
    }

    return {
      pageType: body.getAttribute('data-page-type') || 'unknown',
      pageName: body.getAttribute('data-page-name') || 'unknown'
    };
  }

  function assign(target, source) {
    Object.keys(source).forEach(function(key) {
      if (typeof source[key] !== 'undefined') {
        target[key] = source[key];
      }
    });

    return target;
  }

  function loadAnalyticsScript() {
    var existingScript;
    var script;

    if (!isAnalyticsEnabled()) {
      return;
    }

    existingScript = document.getElementById(ANALYTICS_SCRIPT_ID);

    if (existingScript) {
      return;
    }

    script = document.createElement('script');
    script.id = ANALYTICS_SCRIPT_ID;
    script.async = true;
    script.src =
      'https://www.googletagmanager.com/gtag/js?id=' +
      encodeURIComponent(MEASUREMENT_ID);
    script.onerror = function() {};
    document.head.appendChild(script);
  }

  function initAnalytics() {
    if (!isAnalyticsEnabled()) {
      return;
    }

    loadAnalyticsScript();
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      send_page_view: true,
      page_title: document.title,
      page_path: window.location.pathname,
      page_location: window.location.href
    });
  }

  function toAbsoluteHref(node, fallbackHref) {
    var resolvedNode;

    if (node && typeof node.href === 'string' && node.href) {
      return node.href;
    }

    if (!fallbackHref) {
      return '';
    }

    resolvedNode = document.createElement('a');
    resolvedNode.href = fallbackHref;
    return resolvedNode.href || fallbackHref;
  }

  function toDestinationPath(destination) {
    var resolvedNode;

    if (!destination) {
      return window.location.pathname;
    }

    resolvedNode = document.createElement('a');
    resolvedNode.href = destination;

    return (
      (resolvedNode.pathname || '') +
      (resolvedNode.search || '') +
      (resolvedNode.hash || '')
    );
  }

  function track(eventName, params) {
    var pageContext;
    var eventParams;

    if (!eventName || !isAnalyticsEnabled()) {
      return;
    }

    pageContext = readPageContext();
    eventParams = {
      page_type: pageContext.pageType,
      page_name: pageContext.pageName,
      transport_type: 'beacon'
    };

    if (params) {
      assign(eventParams, params);
    }

    window.gtag('event', eventName, eventParams);
  }

  function getTrackableNode(startNode) {
    var node = startNode;

    while (node && node !== document) {
      if (
        node.nodeType === 1 &&
        node.getAttribute &&
        node.getAttribute('data-analytics-event')
      ) {
        return node;
      }

      node = node.parentNode;
    }

    return null;
  }

  function buildEventParams(node, eventName) {
    var label = node.getAttribute('data-analytics-label') || '';
    var destination =
      node.getAttribute('data-analytics-destination') ||
      node.getAttribute('href') ||
      '';
    var absoluteHref = toAbsoluteHref(node, destination);

    if (eventName === 'profile_cta_click') {
      return {
        cta_name: label,
        link_url: absoluteHref
      };
    }

    if (eventName === 'internal_navigation_click') {
      return {
        nav_label: label,
        destination_path: toDestinationPath(destination || absoluteHref)
      };
    }

    return {};
  }

  function handleDocumentClick(event) {
    var target;
    var eventName;

    if (event.defaultPrevented) {
      return;
    }

    if (typeof event.button === 'number' && event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    target = getTrackableNode(event.target);

    if (!target) {
      return;
    }

    eventName = target.getAttribute('data-analytics-event');

    if (!eventName) {
      return;
    }

    track(eventName, buildEventParams(target, eventName));
  }

  function bindTracking() {
    document.addEventListener('click', handleDocumentClick, true);
  }

  window.siteAnalytics = {
    track: track
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTracking);
  } else {
    bindTracking();
  }

  initAnalytics();
})();
