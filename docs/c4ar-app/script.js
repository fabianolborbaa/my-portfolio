let closeTimer;
let openFrame;
let routeTimer;
const PAGE_SKELETON_MIN_MS = 260;

function nextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function getFrame() {
  return document.querySelector(".phone-frame");
}

function createPageLoader() {
  const frame = getFrame();
  if (!frame || frame.querySelector(".page-loader")) return;

  const loader = document.createElement("div");
  loader.className = "page-loader";
  loader.setAttribute("aria-hidden", "true");
  loader.innerHTML = `
    <div class="loader-content">
      <span class="loader-line short"></span>
      <span class="loader-line title"></span>
      <span class="loader-card"></span>
      <span class="loader-line"></span>
      <span class="loader-line medium"></span>
      <span class="loader-card small"></span>
    </div>
    <div class="loader-actions">
      <span></span>
      <span></span>
    </div>
  `;
  frame.appendChild(loader);
}

function prepareCurrentPage() {
  const frame = getFrame();
  createPageLoader();

  requestAnimationFrame(() => {
    frame?.classList.add("is-ready");
  });
}

function showPageLoader() {
  const frame = getFrame();
  createPageLoader();
  frame?.classList.add("is-leaving");
  frame?.querySelector(".page-loader")?.classList.add("is-visible");
}

function hidePageLoader() {
  const frame = getFrame();
  frame?.classList.remove("is-leaving");
  frame?.querySelector(".page-loader")?.classList.remove("is-visible");
}

function isInternalPageLink(link) {
  if (!link || link.target || link.hasAttribute("download")) return false;
  const href = link.getAttribute("href");
  if (!href || href === "#" || href.startsWith("#")) return false;

  const nextUrl = new URL(href, window.location.href);
  return nextUrl.origin === window.location.origin && nextUrl.pathname !== window.location.pathname;
}

async function swapPage(url, options = {}) {
  const currentFrame = getFrame();
  if (!currentFrame) {
    window.location.href = url;
    return;
  }

  showPageLoader();
  await nextPaint();
  window.clearTimeout(routeTimer);

  try {
    const [response] = await Promise.all([
      fetch(url, { headers: { "X-Requested-With": "mock-spa" } }),
      new Promise((resolve) => {
        routeTimer = window.setTimeout(resolve, PAGE_SKELETON_MIN_MS);
      }),
    ]);

    if (!response.ok) throw new Error(`Navigation failed: ${response.status}`);

    const html = await response.text();
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    const nextFrame = nextDocument.querySelector(".phone-frame");
    const nextTitle = nextDocument.querySelector("title")?.textContent;

    if (!nextFrame) throw new Error("Missing .phone-frame in target page");

    syncFrameShell(currentFrame, nextFrame);
    document.title = nextTitle || document.title;

    if (!options.replace) {
      window.history.pushState({}, "", url);
    }

    hidePageLoader();
    prepareCurrentPage();
  } catch (error) {
    hidePageLoader();
    window.location.href = url;
  }
}

function isPersistentShellNode(node) {
  return (
    node.classList?.contains("status-bar") ||
    node.classList?.contains("top-bar") ||
    node.classList?.contains("home-indicator") ||
    node.classList?.contains("page-loader")
  );
}

function syncFrameShell(currentFrame, nextFrame) {
  const currentHeader = currentFrame.querySelector(".top-bar");
  const nextHeader = nextFrame.querySelector(".top-bar");
  const currentLoader = currentFrame.querySelector(".page-loader");
  const currentHome = currentFrame.querySelector(".home-indicator");

  currentFrame.className = nextFrame.className;
  currentFrame.classList.add("is-ready");
  currentFrame.setAttribute("aria-label", nextFrame.getAttribute("aria-label") || "");

  if (currentHeader && nextHeader) {
    currentHeader.innerHTML = nextHeader.innerHTML;
  }

  [...currentFrame.children].forEach((child) => {
    if (!isPersistentShellNode(child)) {
      child.remove();
    }
  });

  [...nextFrame.children].forEach((child) => {
    if (isPersistentShellNode(child)) return;
    currentFrame.insertBefore(child.cloneNode(true), currentHome || currentLoader);
  });

  if (currentLoader) {
    currentLoader.classList.remove("is-visible");
    currentLoader.setAttribute("aria-hidden", "true");
    currentFrame.appendChild(currentLoader);
  }
}

function closeSheet() {
  const sheetLayer = document.querySelector(".sheet-layer");
  const sheets = document.querySelectorAll(".bottom-sheet");
  if (!sheetLayer) return;

  window.cancelAnimationFrame(openFrame);
  sheetLayer.classList.remove("is-visible");
  sheetLayer.setAttribute("aria-hidden", "true");

  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    sheetLayer.classList.remove("is-open");
    sheets.forEach((sheet) => sheet.classList.remove("is-active"));
  }, 420);
}

function openSheet(sheetName) {
  const sheetLayer = document.querySelector(".sheet-layer");
  const sheets = document.querySelectorAll(".bottom-sheet");
  if (!sheetLayer) return;

  window.clearTimeout(closeTimer);
  window.cancelAnimationFrame(openFrame);
  sheetLayer.classList.remove("is-visible");

  sheets.forEach((sheet) => {
    sheet.classList.toggle("is-active", sheet.dataset.sheet === sheetName);
  });

  sheetLayer.classList.add("is-open");
  sheetLayer.setAttribute("aria-hidden", "false");

  openFrame = window.requestAnimationFrame(() => {
    sheetLayer.classList.add("is-visible");
  });
}

document.addEventListener("click", (event) => {
  const accordionButton = event.target.closest(".refund-row");
  if (accordionButton) {
    const item = accordionButton.closest(".accordion-item");
    const shouldOpen = accordionButton.getAttribute("aria-expanded") !== "true";

    document.querySelectorAll(".accordion-item").forEach((otherItem) => {
      const otherButton = otherItem.querySelector(".refund-row");
      otherItem.classList.remove("is-open");
      otherButton?.setAttribute("aria-expanded", "false");
    });

    if (shouldOpen) {
      item?.classList.add("is-open");
      accordionButton.setAttribute("aria-expanded", "true");
    }
    return;
  }

  const sheetTrigger = event.target.closest("[data-sheet-trigger]");
  if (sheetTrigger) {
    openSheet(sheetTrigger.dataset.sheetTrigger);
    return;
  }

  const sheetCloser = event.target.closest(
    ".sheet-backdrop, .sheet-close, .plain-sheet-close, [data-sheet-close]"
  );
  if (sheetCloser) {
    closeSheet();
    return;
  }

  const link = event.target.closest("a");
  if (isInternalPageLink(link)) {
    event.preventDefault();
    swapPage(link.href);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSheet();
  }
});

window.addEventListener("popstate", () => {
  swapPage(window.location.href, { replace: true });
});

prepareCurrentPage();
