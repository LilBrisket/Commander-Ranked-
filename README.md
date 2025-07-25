Commander Ranked
🎴 A community-driven web app to rank Magic: The Gathering Commander cards and compare decks.
Built with Node.js, Express, SQLite, and Scryfall data.

🌟 Features
✅ Rank Commander-legal cards (strongest → weakest)
✅ Global leaderboard of card rankings
✅ Filter leaderboard by name, color, type, or score
✅ Flip double-faced cards
✅ Responsive, mobile-friendly design
✅ Admin scripts for maintaining the database

🚀 Getting Started
1️⃣ Clone the project
bash
Copy
Edit
git clone https://your-repo-url.git
cd commander-ranked
2️⃣ Install dependencies
bash
Copy
Edit
npm install
3️⃣ Download Scryfall bulk data
This fetches the latest card data and saves it locally.

bash
Copy
Edit
node download-cards.js
4️⃣ Import cards into the database
This parses scryfall-cards.json and populates the database.

bash
Copy
Edit
node import-cards.js
5️⃣ Run the server
bash
Copy
Edit
node server.js
Visit http://localhost:3000

🗃 Database
The app uses SQLite.
By default, it stores cards.db in:

RENDER_PERSISTENT_DIR/cards.db (if on Render)

otherwise: ./DatabaseDisk/cards.db

You can override the path with:

bash
Copy
Edit
export DATABASE_PATH=/path/to/cards.db
🛠 Admin & Maintenance Scripts
Script	Purpose
download-cards.js	Download latest bulk data from Scryfall
import-cards.js	Import cards (full reset if DB empty)
import-new-cards.js	Import only new cards
reset-db.js	Wipe & reseed cards from scratch
patch-image-back.js	Update back-face images
add-image-back-column.js	Add image_back column (migration)
check-column.js	Inspect some rows from cards
check-db.js	Count cards with images
check-images.js	Sample some card image URLs
queryMeta.js	Inspect the meta table
test-db.js	Sanity-check that DB is connected

📂 Project Structure
php
Copy
Edit
public/               # Frontend HTML, CSS, JS
db.js                 # Database connection & setup
dbSchema.js           # Central DB schema
server.js             # Express backend & API
scryfall-cards.json   # Raw card data from Scryfall
DatabaseDisk/         # SQLite DB file (if local)
🌐 Deployment
On Render:

DB will persist under RENDER_PERSISTENT_DIR

Make sure to run download-cards.js + import-cards.js on deploy.

✨ To Do / Ideas
Improve accessibility (aria-live, color contrast)

Add tests for API endpoints

Combine admin scripts into a single CLI

Add user authentication for deck submissions

📜 Credits
Card data & images: Scryfall

Magic: The Gathering and its trademarks are © Wizards of the Coast. This site is unaffiliated.

📧 Contact
Have suggestions or feedback?
📬 Email: CommanderRanked@gmail.com
