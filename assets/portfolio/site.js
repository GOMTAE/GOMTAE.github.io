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
      const loopPreview = shell.querySelector("[data-loop-shell]");
      loopPreview?.dispatchEvent(new Event("preview:pause"));
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
          if (loopPreview) loopPreview.hidden = true;
          else shell.querySelector("picture").hidden = true;
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
          if (loopPreview) loopPreview.hidden = false;
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

// Authentic inline demos. Load only visible loops, and preserve user pauses.
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection;
const loopControllers = [];
document.querySelectorAll("[data-loop-shell]").forEach((shell) => {
  const video = shell.querySelector("[data-loop-src]");
  const button = shell.querySelector("[data-loop-toggle]");
  const state = {
    inView: false,
    userPaused: false,
    explicit: false,
    starting: false,
    failed: false,
  };
  if (button) button.hidden = false;
  const updateButton = () => {
    if (!button) return;
    const action = video.paused ? "Play" : "Pause";
    button.setAttribute(
      "aria-label",
      `${action} animation: ${button.dataset.label}`,
    );
    button.replaceChildren(document.createTextNode(`${action} `));
    const symbol = document.createElement("span");
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = video.paused ? "▶" : "Ⅱ";
    button.append(symbol);
  };
  const canPlay = () =>
    state.inView &&
    !document.hidden &&
    !state.userPaused &&
    !state.failed &&
    (state.explicit || (!motionPreference.matches && !connection?.saveData));
  const sync = () => {
    if (!canPlay()) {
      video.pause();
      updateButton();
      return;
    }
    if (state.starting || !video.paused) return;
    if (!video.getAttribute("src")) {
      video.muted = true;
      video.src = video.dataset.loopSrc;
    }
    state.starting = true;
    video
      .play()
      .then(() => {
        if (!canPlay()) video.pause();
        updateButton();
      })
      .catch((error) => {
        // Scrolling or hiding a tab can intentionally interrupt a pending play.
        // Only an actual playback refusal should require an explicit retry.
        if (error.name !== "AbortError" && canPlay()) state.userPaused = true;
        updateButton();
      })
      .finally(() => {
        state.starting = false;
        if (canPlay() && video.paused) sync();
      });
  };
  video.addEventListener("loadeddata", () =>
    shell.classList.add("motion-ready"),
  );
  video.addEventListener("play", updateButton);
  video.addEventListener("pause", updateButton);
  video.addEventListener("error", () => {
    state.failed = true;
    shell.classList.remove("motion-ready");
    if (button) button.hidden = true;
  });
  button?.addEventListener("click", () => {
    if (!video.paused || state.starting) {
      state.userPaused = true;
      state.explicit = false;
    } else {
      state.userPaused = false;
      state.explicit = true;
    }
    sync();
  });
  shell.addEventListener("preview:pause", () => {
    state.userPaused = true;
    state.explicit = false;
    sync();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        state.inView = entries[0].isIntersecting;
        sync();
      },
      { threshold: 0.1 },
    ).observe(shell);
  } else {
    // Older browsers retain an explicit play button instead of loading every loop.
    state.inView = true;
    state.userPaused = true;
  }
  loopControllers.push({
    sync,
    resetPolicy: () => {
      state.explicit = false;
      sync();
    },
  });
});
document.addEventListener("visibilitychange", () =>
  loopControllers.forEach((controller) => controller.sync()),
);
motionPreference.addEventListener("change", () =>
  loopControllers.forEach((controller) => controller.resetPolicy()),
);
connection?.addEventListener("change", () =>
  loopControllers.forEach((controller) => controller.resetPolicy()),
);

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
