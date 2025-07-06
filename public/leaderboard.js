const fallbackImage = "https://placehold.co/223x310?text=No+Image";

console.log("✅ leaderboard.js loaded!");

document.addEventListener("DOMContentLoaded", () => {
  const leaderboard = document.getElementById("leaderboard");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  const nameInput = document.getElementById("filter-name");
  const colorSelect = document.getElementById("filter-color");
  const typeSelect = document.getElementById("filter-type");
  const sortSelect = document.getElementById("filter-sort");
  const filterForm = document.getElementById("filter-form");
  const clearFiltersBtn = document.getElementById("clear-filters");

  let currentPage = 0;
  const limit = 20;

  function getFilters() {
    return {
      name: nameInput?.value.trim() || "",
      color: colorSelect?.value || "",
      type: typeSelect?.value || "",
      sort: sortSelect?.value || "desc"
    };
  }

  async function loadLeaderboard(page = 0) {
    leaderboard.replaceChildren();
    const offset = page * limit;
    const { name, color, type, sort } = getFilters();

    const params = new URLSearchParams({
      limit,
      offset,
      ...(name && { name }),
      ...(color && { color }),
      ...(type && { type }),
      ...(sort && { sort })
    });

    console.log(`📡 Fetching /api/leaderboard?${params}`);

    try {
      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const result = await res.json();
      console.log("📊 Leaderboard response:", result);

      let { total, cards } = result;

      if (!Array.isArray(cards)) {
        leaderboard.innerHTML = "<li>Invalid leaderboard response format.</li>";
        return;
      }

      if (cards.length === 0) {
        leaderboard.innerHTML = "<li>No cards found. Try clearing filters or reseeding.</li>";
        return;
      }

      // Sort cards by points if not already sorted
      cards.sort((a, b) => {
        if (sort === "asc") return a.points - b.points;
        return b.points - a.points;
      });

      // Tie-aware rank assignment
      let lastPoints = null;
      let lastRank = 0;
      let skip = 0;

      cards.forEach((card, i) => {
        if (card.points === lastPoints) {
          card.rank = lastRank;
          skip++;
        } else {
          card.rank = i + 1;
          lastRank = card.rank;
          lastPoints = card.points;
          if (skip > 0) lastRank += skip;
          skip = 0;
        }
      });

      cards.forEach(card => {
        const li = document.createElement("li");
        li.className = "card-entry";

        const rankDiv = document.createElement("div");
        rankDiv.className = "card-rank";
        rankDiv.textContent = `#${card.rank}`;

        const cardLink = document.createElement("a");
        cardLink.href = `https://scryfall.com/search?q=${encodeURIComponent(card.cardName || "")}`;
        cardLink.target = "_blank";
        cardLink.rel = "noopener noreferrer";
        cardLink.className = "card-link";

        const img = document.createElement("img");
        img.src = card.cardImage || fallbackImage;
        img.alt = card.cardName || "Magic card";
        img.onerror = function () {
          if (this.src !== fallbackImage) {
            this.src = fallbackImage;
          }
        };

        const nameDiv = document.createElement("div");
        nameDiv.className = "card-name";
        nameDiv.textContent = card.cardName || "Unknown";

        const pointsDiv = document.createElement("div");
        pointsDiv.className = "card-points";
        pointsDiv.textContent = `${card.points} pts`;

        li.appendChild(rankDiv);
        cardLink.appendChild(img);
        cardLink.appendChild(nameDiv);
        li.appendChild(cardLink);
        li.appendChild(pointsDiv);
        leaderboard.appendChild(li);
      });

      prevBtn.disabled = page === 0;
      nextBtn.disabled = cards.length < limit;
    } catch (err) {
      console.error("❌ Error fetching leaderboard:", err);
      leaderboard.innerHTML = "<li>Error loading leaderboard</li>";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  prevBtn?.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      loadLeaderboard(currentPage);
    }
  });

  nextBtn?.addEventListener("click", () => {
    currentPage++;
    loadLeaderboard(currentPage);
  });

  filterForm?.addEventListener("submit", e => {
    e.preventDefault();
    currentPage = 0;
    loadLeaderboard(currentPage);
  });

  clearFiltersBtn?.addEventListener("click", () => {
    nameInput.value = "";
    colorSelect.value = "";
    typeSelect.value = "";
    sortSelect.value = "desc";
    currentPage = 0;
    loadLeaderboard(currentPage);
  });

  loadLeaderboard(currentPage);
});



