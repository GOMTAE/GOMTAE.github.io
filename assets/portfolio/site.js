/* Progressive enhancements. Every destination and all content work without JS. */
const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
if (header && toggle) {
  header.classList.add("nav-enhanced");
  toggle.hidden = false;
  const closeMenu = () => {
    header.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.querySelector("span").textContent = "+";
  };
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector("span").textContent = open ? "−" : "+";
  });
  header.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      toggle.focus();
    }
  });
  document
    .querySelectorAll("#primary-nav a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  matchMedia("(min-width: 601px)").addEventListener("change", closeMenu);
}

document.querySelectorAll("[data-video]").forEach((link) => {
  link.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      const shell = link.closest("[data-video-shell]");
      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.muted = true;
      video.setAttribute(
        "aria-label",
        "Silent SSP comparison: Image Model, KD-SSP, NetWarp, and TCB-OCR. See the figure caption for context.",
      );
      video.src = link.dataset.video;
      // Retain the static image as a fallback until a frame can be decoded.
      video.addEventListener(
        "loadeddata",
        () => {
          shell.querySelector("picture").hidden = true;
          link.hidden = true;
          video.focus();
        },
        { once: true },
      );
      video.addEventListener(
        "error",
        () => {
          video.remove();
          link.hidden = false;
          link.textContent = "Open the original comparison video ↗";
          link.removeAttribute("data-video");
          shell.querySelector("picture").hidden = false;
        },
        { once: true },
      );
      shell.append(video);
      video.play().catch(() => {
        /* Native controls remain available. */
      });
    },
    { once: true },
  );
});

const filters = document.querySelector("[data-filters]");
if (filters) {
  filters.hidden = false;
  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    let visible = 0;
    document.querySelectorAll("[data-publication]").forEach((publication) => {
      publication.hidden =
        button.dataset.filter !== "all" &&
        button.dataset.filter !== publication.dataset.type;
      if (!publication.hidden) visible++;
    });
    filters
      .querySelectorAll("button")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    document.querySelector("[data-filter-status]").textContent =
      `${visible} publication${visible === 1 ? "" : "s"} shown.`;
  });
}

document.querySelectorAll("[data-open-citation]").forEach((link) => {
  link.addEventListener("click", () => {
    document.getElementById(link.dataset.openCitation).open = true;
  });
});
if (navigator.clipboard?.writeText) {
  document.querySelectorAll("[data-copy-citation]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", async () => {
      const citation = button.closest(".citation");
      const status = citation.querySelector(".copy-status");
      try {
        await navigator.clipboard.writeText(
          citation.querySelector("code").textContent,
        );
        status.textContent = "Citation copied.";
      } catch {
        status.textContent = "Select the citation text above to copy it.";
      }
    });
  });
}
