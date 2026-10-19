const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const safeText = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

// Hanapin ang image sa main folder ng repository.
function fixImagePath(path) {
  if (!path) return "";

  const filename = String(path).split("/").pop();

  return filename;
}

// Ipakita ang image kahit hindi mahanap ang original.
function setImageFallbacks(root = document) {
  $$("img", root).forEach((img) => {
    img.onerror = function () {
      if (this.dataset.fallbackDone === "1") return;

      this.dataset.fallbackDone = "1";

      const filename = this.getAttribute("src")
        ?.split("/")
        .pop();

      if (filename && filename !== this.src) {
        this.src = filename;
      } else {
        this.style.display = "none";
      }
    };

    const current = img.getAttribute("src");

    if (current) {
      img.src = fixImagePath(current);
    }
  });
}

// Theme
function initTheme() {
  const saved = localStorage.getItem("museumAlmostsTheme");

  if (saved === "light") {
    document.body.classList.remove("dark");
  } else {
    document.body.classList.add("dark");
  }

  const button = $("#themeToggle");

  if (!button) return;

  button.textContent =
    document.body.classList.contains("dark") ? "☾" : "☼";

  button.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const dark = document.body.classList.contains("dark");

    localStorage.setItem(
      "museumAlmostsTheme",
      dark ? "dark" : "light"
    );

    button.textContent = dark ? "☾" : "☼";
  });
}

// Mobile navigation
function initNav() {
  $("#menuToggle")?.addEventListener("click", () => {
    $("#mainNav")?.classList.toggle("open");
  });

  $$("#mainNav a").forEach((link) => {
    link.addEventListener("click", () => {
      $("#mainNav")?.classList.remove("open");
    });
  });
}

// Likes
function likes() {
  try {
    return JSON.parse(
      localStorage.getItem("museumAlmostsLikes") || "[]"
    );
  } catch {
    return [];
  }
}

function toggleLike(id) {
  let items = likes();

  items = items.includes(id)
    ? items.filter((number) => number !== id)
    : [...items, id];

  localStorage.setItem(
    "museumAlmostsLikes",
    JSON.stringify(items)
  );
}

// Story card
function renderCard(story, feature = false) {
  const cover = fixImagePath(story.cover);

  if (feature) {
    return `
      <article class="feature-card">
        <a class="feature-cover" href="story.html?id=${story.id}">
          <img
            src="${safeText(cover)}"
            alt="${safeText(story.title)}"
            loading="lazy"
          >
          <span class="cover-title">
            ${safeText(story.title)}
          </span>
        </a>

        <h3>${safeText(story.title)}</h3>
        <p>${safeText(story.genre)} · by ${safeText(story.author)}</p>
      </article>
    `;
  }

  const isLiked = likes().includes(story.id);

  return `
    <article class="book-card">
      <a
        class="cover-link"
        href="story.html?id=${story.id}"
        aria-label="Read ${safeText(story.title)}"
      >
        <img
          src="${safeText(cover)}"
          alt="${safeText(story.title)}"
          loading="lazy"
        >
        <span class="read-overlay">READ STORY ↗</span>
      </a>

      <div class="card-top">
        <span class="genre-tag">
          ${safeText(story.genre)}
        </span>

        <button
          class="like-button ${isLiked ? "liked" : ""}"
          data-like="${story.id}"
          aria-label="Like ${safeText(story.title)}"
        >
          ${isLiked ? "♥" : "♡"}
        </button>
      </div>

      <h3 class="book-title">${safeText(story.title)}</h3>

      <p class="book-author">
        by ${safeText(story.author)} · 1 chapter
      </p>

      <p class="book-synopsis">
        ${safeText(story.synopsis)}
      </p>
    </article>
  `;
}

// Story listing and search
function renderBooks() {
  if (typeof stories === "undefined") {
    console.error(
      "Hindi mahanap ang stories array. Tingnan ang stories.js."
    );
    return;
  }

  const grid = $("#bookGrid");
  const featured = $("#featuredGrid");

  if (featured) {
    featured.innerHTML = stories
      .slice(0, 5)
      .map((story) => renderCard(story, true))
      .join("");

    setImageFallbacks(featured);
  }

  if (!grid) return;

  const params = new URLSearchParams(location.search);
  let genre = params.get("genre") || "All";

  const search = $("#searchInput");

  if (search && params.get("q")) {
    search.value = params.get("q");
  }

  function paint() {
    const term = (search?.value || "").trim().toLowerCase();

    const list = stories.filter((story) => {
      const matchesGenre =
        genre === "All" || story.genre === genre;

      const searchableText = [
        story.title,
        story.author,
        story.genre,
        story.synopsis
      ].join(" ").toLowerCase();

      return matchesGenre && searchableText.includes(term);
    });

    const resultsCount = $("#resultsCount");

    if (resultsCount) {
      resultsCount.textContent =
        `${list.length} ${list.length === 1 ? "story" : "stories"}`;
    }

    grid.innerHTML = list.length
      ? list.map((story) => renderCard(story)).join("")
      : `
        <div class="empty-state">
          <h3>No stories found</h3>
          <p>Try a different title or genre.</p>
        </div>
      `;

    setImageFallbacks(grid);

    $$("[data-like]", grid).forEach((button) => {
      button.addEventListener("click", () => {
        toggleLike(Number(button.dataset.like));
        paint();
      });
    });
  }

  function setGenre(value) {
    genre = value;

    $$("[data-genre]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.genre === value
      );
    });

    paint();

    if (grid) {
      $("#library")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  $$("[data-genre]").forEach((button) => {
    button.addEventListener("click", () => {
      setGenre(button.dataset.genre);
    });
  });

  $$(".genre-chip").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.genre === genre
    );
  });

  $("#clearFilters")?.addEventListener("click", () => {
    if (search) search.value = "";
    setGenre("All");
  });

  search?.addEventListener("input", paint);

  if (search && !grid) {
    search.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && search.value.trim()) {
        location.href =
          "stories.html?q=" +
          encodeURIComponent(search.value.trim());
      }
    });
  }

  paint();
}

// Individual story page
function renderStory() {
  const root = $("#storyDetail");

  if (!root || typeof stories === "undefined") return;

  const params = new URLSearchParams(location.search);
  const id = Number(params.get("id") || 1);

  const story =
    stories.find((item) => item.id === id) || stories[0];

  if (!story) {
    root.innerHTML = "<p>Walang story na makita.</p>";
    return;
  }

  document.title =
    `${story.title} — A Museum of Almosts`;

  const cover = fixImagePath(story.cover);
  const scene = fixImagePath(story.scene);

  const paragraphs = String(story.content || "")
    .split(/\n\s*\n/)
    .filter(Boolean);

  root.innerHTML = `
    <div class="story-detail">
      <aside>
        <img
          class="story-poster"
          src="${safeText(cover)}"
          alt="Cover of ${safeText(story.title)}"
        >
      </aside>

      <div class="story-info">
        <p class="eyebrow">
          A MUSEUM OF ALMOSTS ORIGINAL ·
          STORY ${String(story.id).padStart(2, "0")}
        </p>

        <h1>${safeText(story.title)}</h1>

        <p class="story-meta">
          By <strong>${safeText(story.author)}</strong>
          · ${safeText(story.genre)} · One chapter
        </p>

        <p class="story-synopsis">
          ${safeText(story.synopsis)}
        </p>

        <div class="story-actions">
          <button class="button primary" id="startReading">
            Start reading ↓
          </button>

          <button class="secondary-button" id="likeReader">
            ${likes().includes(story.id)
              ? "♥ Saved to likes"
              : "♡ Save to likes"}
          </button>

          <button class="secondary-button" id="synopsisToggle">
            Hide synopsis
          </button>
        </div>

        <div class="synopsis-panel" id="synopsisPanel">
          <p class="eyebrow">THE STORY BEHIND THE COVER</p>
          <p class="story-synopsis">
            ${safeText(story.synopsis)}
          </p>
        </div>
      </div>
    </div>

    <img
      class="scene-image"
      src="${safeText(scene)}"
      alt="Scene for ${safeText(story.title)}"
    >

    <article class="chapter-box" id="chapter">
      <p class="chapter-kicker">
        CHAPTER 01 · SINGLE CHAPTER
      </p>

      <h2>${safeText(story.chapter)}</h2>

      <div class="reading-progress">
        <span id="progressBar"></span>
      </div>

      <div class="progress-label" id="progressLabel">
        Reading progress: 0%
      </div>

      <div class="story-copy">
        ${paragraphs.map((paragraph) =>
          `<p>${safeText(paragraph)}</p>`
        ).join("")}
      </div>

      <div class="end-note">
        ♡ &nbsp; You reached the end of this one-chapter story.
        Thank you for reading.
      </div>

      <div class="reader-bottom">
        <a class="secondary-button" href="stories.html">
          ← More stories
        </a>

        <button class="button primary" id="nextStory">
          Read another story →
        </button>
      </div>
    </article>
  `;

  setImageFallbacks(root);

  $("#startReading")?.addEventListener("click", () => {
    $("#chapter")?.scrollIntoView({
      behavior: "smooth"
    });
  });

  $("#synopsisToggle")?.addEventListener("click", () => {
    const panel = $("#synopsisPanel");

    if (!panel) return;

    panel.hidden = !panel.hidden;

    $("#synopsisToggle").textContent =
      panel.hidden ? "Show synopsis" : "Hide synopsis";
  });

  $("#likeReader")?.addEventListener("click", () => {
    toggleLike(story.id);

    $("#likeReader").textContent =
      likes().includes(story.id)
        ? "♥ Saved to likes"
        : "♡ Save to likes";
  });

  $("#nextStory")?.addEventListener("click", () => {
    const nextId = story.id % stories.length + 1;
    location.href = `story.html?id=${nextId}`;
  });

  function updateProgress() {
    const chapter = $("#chapter");
    const bar = $("#progressBar");
    const label = $("#progressLabel");

    if (!chapter || !bar || !label) return;

    const rect = chapter.getBoundingClientRect();
    const total = chapter.offsetHeight;

    const progress = total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((window.innerHeight - rect.top) / total) * 100
            )
          )
        )
      : 0;

    bar.style.width = `${progress}%`;
    label.textContent = `Reading progress: ${progress}%`;
  }

  window.addEventListener("scroll", updateProgress, {
    passive: true
  });

  updateProgress();
}

// Start website
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNav();
  renderBooks();
  renderStory();
});
