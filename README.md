# 🎬 WhatToWatch — Movie Discovery App

🎬 [WhatToWatch](https://what-to-watch-gh3v.onrender.com/)

**Discover your next favorite movie.**  
A full-stack Flask web application that helps users find, filter, and save movies or TV shows based on their preferences — powered by the **TMDB API**.

---

## 🚀 Features

✅ **Movie & TV Show Discovery**  
- Browse popular, top-rated, and trending titles  
- Filter by genre, language, adult content, minimum rating, and sort order  

✅ **User Authentication**  
- Email/password sign-up and login  
- Google OAuth integration  
- Session-based authentication with Flask  

✅ **Personal Watchlist**  
- Add or remove movies/TV shows from your personal list  
- View all saved items in a dedicated “My Watchlist” section  

✅ **Interactive UI**  
- Clean, responsive interface built with HTML, CSS, and vanilla JavaScript  
- Dynamic filtering and movie modals with trailers (YouTube embedded)  

✅ **Persistent Data**  
- SQLite database (via Flask + direct queries)  
- Secure password storage with Werkzeug’s hashing utilities  

---

## 🧠 Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Python, Flask |
| **Database** | SQLite |
| **Auth** | Flask Sessions, Google OAuth (Authlib) |
| **API** | The Movie Database (TMDB) API |
| **Environment** | dotenv for secret management |

---

## ⚙️ Project Structure

```
.
├── app.py              # Flask app entry point (API + routes)
├── app.db              # SQLite database (local data storage)
├── .env                # Environment variables (API keys, secrets)
├── static/
│   ├── app.js          # Frontend logic & API calls
│   └── style.css       # Custom styling
├── templates/
│   └── index.html      # Main HTML template
├── requirements.txt    # Python dependencies
└── .gitignore
```

---

## 🧩 Environment Variables

Create a `.env` file in the project root with the following variables:

```
TMDB_API_KEY=your_tmdb_api_key
DATABASE_URL=sqlite:///app.db
FLASK_SECRET_KEY=your_flask_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:5000/auth/google/callback
```

> 🔐 These keys are essential for API calls and OAuth.  
> Never commit `.env` to version control — it’s already ignored via `.gitignore`.

---

## 💻 Local Setup

**1. Clone the repo**
```bash
git clone https://github.com/your-username/what-to-watch.git
cd what-to-watch
```

**2. Create a virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

**3. Install dependencies**
```bash
pip install -r requirements.txt
```

**4. Set up the database**
```bash
python app.py
```
The app will automatically create `app.db` if it doesn’t exist.

**5. Run the app**
```bash
flask run
```
or:
```bash
python app.py
```

Then open your browser and visit:  
👉 **http://127.0.0.1:5000**

---

## 🌐 API Integration

All movie and TV show data is fetched from the **[TMDB API](https://www.themoviedb.org/documentation/api)** using your API key.

Endpoints used:
- `/discover/movie`
- `/discover/tv`
- `/genre/movie/list`
- `/configuration/languages`
- `/movie/{id}/videos`

---

## 🔒 Authentication Flow

### Email + Password
- Handled entirely by Flask (secure password hashing)
- Session stored in Flask session cookie

### Google OAuth
- Implemented using `authlib`
- On success, the app creates or logs in a user seamlessly

---

## 🗂 Watchlist

Each authenticated user can:
- Add movies to their watchlist  
- Remove movies from it  
- See all saved movies in a dedicated section  

Stored in the `watchlist` table of the SQLite database:
```sql
CREATE TABLE watchlist (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    movie_id INTEGER NOT NULL,
    movie_type TEXT NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    vote_average REAL,
    release_date TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 🎨 UI Showcase

| Page | Description |
|------|--------------|
| **Home Page** | Hero section with CTA to start searching |
| **Filters** | Dynamic filters for genres, language, and rating |
| **Results Grid** | Movie cards with ratings and posters |
| **Modal** | Displays movie details and trailer |
| **Watchlist** | Personalized movie collection for logged-in users |

---

## 🧱 Future Improvements

- Migrate database to PostgreSQL  
- Add “Liked” and “Watched” lists  
- Dark/light theme toggle  
- Advanced recommendation engine using TMDB or ML  

---

## 👨‍💻 Author

**Tian Istenič**  
💼 Data Engineer & Developer  
📧 [tian.istenic34@gmail.com]  
🌐 [https://github.com/Denotess](#)  
🔗 [LinkedIn](https://www.linkedin.com/in/tian-isteni%C4%8D-764a97238/) • [GitHub](https://github.com/Denotess)

---

## 🪪 License

This project is licensed under the **MIT License**.  
It uses the **TMDB API**, but is **not endorsed or certified by TMDB**.
