const fallbackImage = "https://placehold.co/223x310?text=No+Image";

console.log("✅ leaderboard.js loaded!");

document.addEventListener("DOMContentLoaded", () => {
  const leaderboard = document.getElementById("leaderboard");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const jumpBtn = document.getElementById("jump-btn");
  const jumpInput = document.getElementById("jump-page");
  const pageDisplay = document.getElementById("page-number");

  const nameInput = document.getElementById("filter-name");
  const colorSelect = document.getElementById("filter-color");
  const typeSelect = document.getElementById("filter-type");
  const sortSelect = document.getElementById("filter-sort");
  const filterForm = document.getElementById("filter-form");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const resultCount = document.getElementById("result-count");

  let currentPage = 0;
  let totalPages = 1;
  let totalItems = 0;
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

      const { total, cards } = result;

      if (!Array.isArray(cards)) {
        leaderboard.innerHTML = "<li>Invalid leaderboard response format.</li>";
        return;
      }

      if (cards.length === 0) {
        leaderboard.innerHTML = "<li>No cards found. Try clearing filters or reseeding.</li>";
        if (resultCount) resultCount.textContent = "Showing 0 results";
        return;
      }

      if (resultCount) {
        resultCount.textContent = `Showing ${total.toLocaleString()} result${total !== 1 ? "s" : ""}`;
      }

      totalItems = total;
      totalPages = Math.ceil(total / limit);

      if (pageDisplay) {
        pageDisplay.textContent = `Page ${currentPage + 1} of ${totalPages}`;
      }

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
        img.className = "card";
        img.dataset.front = card.cardImage || fallbackImage;
        if (card.cardImageBack) {
          img.dataset.back = card.cardImageBack;
        }
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

        // ✅ Flip Button
        if (card.cardImageBack) {
          const flipButton = document.createElement("button");
          flipButton.textContent = "Flip Card";
          flipButton.style.marginTop = "0.3rem";
          flipButton.addEventListener("click", (e) => {
            e.preventDefault();
            if (img.src === img.dataset.front) {
              img.src = img.dataset.back;
            } else {
              img.src = img.dataset.front;
            }
          });
          li.appendChild(flipButton);
        }

        li.appendChild(pointsDiv);
        leaderboard.appendChild(li);
      });

      prevBtn.disabled = page <= 0;
      nextBtn.disabled = page >= totalPages - 1;

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
    if (currentPage < totalPages - 1) {
      currentPage++;
      loadLeaderboard(currentPage);
    }
  });

  jumpBtn?.addEventListener("click", () => {
    const pageNum = parseInt(jumpInput.value, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      alert(`Please enter a page number between 1 and ${totalPages}`);
      return;
    }
    currentPage = pageNum - 1;
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













