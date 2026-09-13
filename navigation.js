(() => {
  "use strict";

  function initializeNavigation() {
    const viewNames = new Set(["home", "schedule", "announcements"]);
    const panels = Array.from(document.querySelectorAll("[data-view-panel]"));
    const links = Array.from(document.querySelectorAll("[data-view-link]"));

    function viewFromHash() {
      const hash = window.location.hash.slice(1);
      if (hash === "trip-panel") return "schedule";
      return viewNames.has(hash) ? hash : "home";
    }

    function showView(viewName, isUserNavigation = false) {
      document.body.dataset.view = viewName;
      let visiblePanel;

      for (const panel of panels) {
        const isVisible = panel.dataset.viewPanel === viewName;
        panel.hidden = !isVisible;
        if (isVisible) visiblePanel = panel;
      }

      for (const link of links) {
        if (link.dataset.viewLink === viewName) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      }

      if (isUserNavigation) {
        visiblePanel?.querySelector("[data-view-heading]")?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    }

    for (const link of links) {
      link.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        const viewName = link.dataset.viewLink;
        if (!viewNames.has(viewName)) return;

        event.preventDefault();
        const nextHash = `#${viewName}`;

        if (window.location.hash === nextHash) {
          showView(viewName, true);
        } else {
          window.location.hash = nextHash;
        }
      });
    }

    window.addEventListener("hashchange", () => {
      showView(viewFromHash(), true);
    });

    showView(viewFromHash());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeNavigation, { once: true });
  } else {
    initializeNavigation();
  }
})();
