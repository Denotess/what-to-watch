# 🎬 MovieFinder – Discover Your Next Favorite Movie

A Flask web application that integrates with **The Movie Database (TMDB) API** to let users explore movies and TV shows by genre, language, rating, and popularity.  
MovieFinder provides a smooth UI for filtering and browsing recommendations, complete with YouTube trailers.

---

## 🧭 Overview

MovieFinder is built with **Flask (Python)** for the backend and a responsive **HTML + JS frontend**.  
It queries TMDB’s API for movie and TV data and dynamically renders results with filtering and trailer support.

---

## ⚙️ Features

- Fetches movies or TV shows from TMDB API
- Filters by genre, language, rating, and adult content
- Pagination with “Load More” functionality
- View details and watch trailers via YouTube embeds
- Fast and responsive UI built with vanilla JavaScript
- Secure API key loading via `.env`

---

## 🗂️ Project Structure

```bash
MovieFinder/
│
├── app.py                # Flask backend API
├── templates/
│   └── index.html        # Frontend UI template
├── .env                  # Environment variables (not committed)
├── requirements.txt       # Python dependencies
└── .gitignore            # Files excluded from version control
