// 🔄 Fetch and display 3 random cards
async function loadCards() {
  const loader = document.getElementById('card-loading');
  const submitBtn = document.getElementById('submit-ranking');
  const container = document.getElementById('card-container');
  if (loader) loader.style.display = 'block';
  if (submitBtn) submitBtn.disabled = true;
  container.innerHTML = '';

  try {
    const res = await fetch('/api/cards/random');
    const contentType = res.headers.get('content-type');

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error ${res.status}: ${text}`);
    }

    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Expected JSON, got: ${text.slice(0, 100)}...`);
    }

    const cards = await res.json();

    if (!Array.isArray(cards)) {
      console.error('⚠️ Unexpected response:', cards);
      throw new Error(cards?.message || 'Server returned invalid card data');
    }

    if (cards.length < 3) {
      container.innerHTML = '<p style="text-align:center">⚠️ Not enough cards available in the database.</p>';
      return;
    }

    cards.forEach(card => {
      const div = document.createElement('div');
      div.classList.add('card-item');
      div.setAttribute('data-id', card.id);

      const img = document.createElement('img');
      img.src = card.image && card.image.trim() !== ''
        ? card.image
        : 'https://placehold.co/223x310?text=No+Image';
      img.alt = card.name || 'Card image';
      img.onerror = () => {
        console.warn(`⚠️ Failed to load image for ${card.name}`);
        img.src = 'https://placehold.co/223x310?text=Image+Missing';
      };
      img.className = 'card-image';

      const label = document.createElement('p');
      label.className = 'card-name';
      label.textContent = card.name;

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
    console.error('❌ Failed to load cards:', err);
    container.innerHTML = `<p style="text-align:center; color: red;">🚫 Could not load cards: ${err.message}</p>`;
    alert('Could not load cards. Check your server logs or make sure your database has enough cards.');
  } finally {
    if (loader) loader.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ✅ Enable or disable submit button based on card count
function validateRanking() {
  const rankedCards = [...document.querySelectorAll('.card-item')];
  const submitBtn = document.getElementById('submit-ranking');
  submitBtn.disabled = rankedCards.length !== 3;
}

// 🏆 Load leaderboard with card names from server response
async function loadLeaderboard() {
  const loader = document.getElementById('leaderboard-loading');
  if (loader) loader.style.display = 'block';

  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();

    const list = document.getElementById('leaderboard');
    list.innerHTML = '';

    data.forEach((entry, index) => {
      const li = document.createElement('li');
      li.textContent = `#${index + 1}: ${entry.cardName} — ${entry.points} pts`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error('❌ Failed to load leaderboard:', err);
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

// 🚀 Submit current card ranking
document.getElementById('submit-ranking').addEventListener('click', async () => {
  const rankedCards = [...document.querySelectorAll('.card-item')].map(el => el.dataset.id);

  if (rankedCards.length !== 3) {
    alert('Please rank exactly 3 cards before submitting.');
    return;
  }

  try {
    const res = await fetch('/api/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranking: rankedCards })
    });

    const result = await res.json();
    alert(result.message || 'Ranking submitted!');
    await loadLeaderboard();
    await loadCards();
  } catch (err) {
    console.error('🚨 Failed to submit ranking:', err);
    alert('Oops! Something went wrong submitting your ranking.');
  }
});

// 🧠 Kick it off
(async () => {
  await loadCards();
  await loadLeaderboard();
})();








