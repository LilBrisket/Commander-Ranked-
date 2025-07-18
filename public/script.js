// ✅ Utility fallback image
const fallbackImage = "https://placehold.co/223x310?text=No+Image";

async function loadCards() {
  const loader = document.getElementById("card-loading");
  const submitBtn = document.getElementById("submit-ranking");
  const container = document.getElementById("card-container");
  const main = document.querySelector("main.container");

  if (loader) loader.style.display = "block";
  if (submitBtn) submitBtn.disabled = true;
  container.innerHTML = "";

  try {
    const res = await fetch("/api/cards/random");
    const contentType = res.headers.get("content-type");

    if (!res.ok) throw new Error(`Server error ${res.status}: ${await res.text()}`);
    if (!contentType?.includes("application/json")) throw new Error("Expected JSON response");

    const cards = await res.json();
    if (!Array.isArray(cards)) throw new Error(cards?.message || "Invalid response format");

    if (cards.length < 4) {
      container.innerHTML = `<p style="text-align:center">⚠️ Not enough cards available in the database.</p>`;
      return;
    }

    cards.forEach(card => {
      const div = document.createElement("div");
      div.classList.add("card-item");
      div.dataset.id = card.id;

      const img = document.createElement("img");
      img.src = card.image?.trim() || fallbackImage;
      img.alt = card.name || "Card image";
      img.className = "card-image";
      img.onerror = () => {
        console.warn(`⚠️ Failed to load image for ${card.name}`);
        img.src = "https://placehold.co/223x310?text=Image+Missing";
      };

      const label = document.createElement("p");
      label.className = "card-name";

      const link = document.createElement("a");
      link.href = card.scryfall_url || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = card.name || "Unnamed";
      link.addEventListener("mousedown", e => e.stopPropagation());
      link.addEventListener("click", e => e.stopPropagation());

      label.appendChild(link);
      div.appendChild(img);
      div.appendChild(label);
      container.appendChild(div);
    });

    new Sortable(container, {
      animation: 150,
      onEnd: validateRanking
    });

    validateRanking();
  } catch (err) {
    console.error("❌ Failed to load cards:", err);
    container.innerHTML = `<p style="text-align:center; color: red;">🚫 Could not load cards: ${err.message}</p>`;
    alert("Could not load cards. Check your server logs or database.");
  } finally {
    if (loader) loader.style.display = "none";
    if (submitBtn) submitBtn.disabled = false;
  }
}

function validateRanking() {
  const rankedCards = document.querySelectorAll(".card-item");
  const submitBtn = document.getElementById("submit-ranking");
  submitBtn.disabled = rankedCards.length !== 4;
}

async function loadLeaderboard() {
  const loader = document.getElementById("leaderboard-loading");
  const list = document.getElementById("leaderboard");
  if (loader) loader.style.display = "block";
  list.innerHTML = "";

  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();

    if (!Array.isArray(data)) {
      list.innerHTML = `<li>Error loading leaderboard</li>`;
      return;
    }

    data.forEach((entry, index) => {
      const li = document.createElement("li");
      li.textContent = `#${index + 1}: ${entry.cardName} — ${entry.points} pts`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("❌ Failed to load leaderboard:", err);
    list.innerHTML = `<li>Error loading leaderboard</li>`;
  } finally {
    if (loader) loader.style.display = "none";
  }
}

// 🎯 Submit ranked cards
document.getElementById("submit-ranking").addEventListener("click", async () => {
  const rankedCards = [...document.querySelectorAll(".card-item")].map(el => el.dataset.id);

  if (rankedCards.length !== 4) {
    alert("Please rank exactly 4 cards before submitting.");
    return;
  }

  try {
    const res = await fetch("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranking: rankedCards })
    });

    const result = await res.json();
    alert(result.message || "Ranking submitted!");
    await loadLeaderboard();
    await loadCards();
  } catch (err) {
    console.error("🚨 Failed to submit ranking:", err);
    alert("Oops! Something went wrong submitting your ranking.");
  }
});

// 🚀 Initialize
(async () => {
  await loadCards();
  await loadLeaderboard();
})();









