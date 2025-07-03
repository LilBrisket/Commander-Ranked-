const fallbackImage = "https://placehold.co/223x310?text=No+Image";

// Confirm the script is loaded
console.log("✅ leaderboard.js loaded!");

document.addEventListener("DOMContentLoaded", () => {
  const leaderboard = document.getElementById("leaderboard");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  const nameInput = document.getElementById("filter-name");
  const colorSelect = document.getElementById("filter-color");
  const typeSelect = document.getElementById("filter-type");
  const filterForm = document.getElementById("filter-form");

  let currentPage = 0;
  const limit = 20;

  function getFilters() {
    return {
      name: nameInput?.value.trim() || "",
      color: colorSelect?.value || "",
      type: typeSelect?.value || ""
    };
  }

  async function loadLeaderboard(page = 0) {
    leaderboard.innerHTML = "";
    const offset = page * limit;
    const { name, color, type } = getFilters();

    const params = new URLSearchParams({
      limit,
      offset,
      ...(name && { name }),
      ...(color && { color }),
      ...(type && { type })
    });

    console.log(`📡 Fetching /api/leaderboard?${params}`);

    try {
      const res = await fetch(`/api/leaderboard?${params}`);
      const data = await res.json();
      console.log("📊 Leaderboard data:", data);

      if (!Array.isArray(data)) {
        leaderboard.innerHTML = "<li>Invalid leaderboard response format.</li>";
        return;
      }

      if (data.length === 0) {
        leaderboard.innerHTML = "<li>No cards found. Try clearing filters or reseeding.</li>";
      } else {
        data.forEach(card => {
          const li = document.createElement("li");
          li.className = "card-entry";

          const cardLink = document.createElement("a");
          cardLink.href = `https://scryfall.com/search?q=${encodeURIComponent(card.cardName)}`;
          cardLink.target = "_blank";
          cardLink.rel = "noopener noreferrer";
          cardLink.style.textDecoration = "none";
          cardLink.style.color = "inherit";

          const img = document.createElement("img");
          img.src = card.cardImage || fallbackImage;
          img.alt = card.cardName;

          const nameDiv = document.createElement("div");
          nameDiv.className = "card-name";
          nameDiv.textContent = card.cardName;

          const pointsDiv = document.createElement("div");
          pointsDiv.className = "card-points";
          pointsDiv.textContent = `${card.points} pts`;

          cardLink.appendChild(img);
          cardLink.appendChild(nameDiv);
          li.appendChild(cardLink);
          li.appendChild(pointsDiv);
          leaderboard.appendChild(li);
        });
      }

      prevBtn.disabled = page === 0;
      nextBtn.disabled = data.length < limit;
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

  loadLeaderboard(currentPage);
});