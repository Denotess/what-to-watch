import requests
from dotenv import load_dotenv
import os
from os import getenv
from flask import Flask, render_template, request, jsonify
import sqlite3, uuid, re
from flask import session as flaskSession
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth

app = Flask(__name__)

load_dotenv()
authToken = getenv("TMDB_API_KEY")
flaskSecretKey = getenv("FLASK_SECRET_KEY")
dbUrl = getenv("DATABASE_URL")
googleClientId = getenv("GOOGLE_CLIENT_ID")
googleClientSecret = getenv("GOOGLE_CLIENT_SECRET")

app.secret_key = flaskSecretKey

oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=googleClientId,
    client_secret=googleClientSecret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

url = "https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_genres="

if dbUrl.startswith("sqlite:///"):
    dbPath = dbUrl.replace("sqlite:///", "")
else:
    dbPath = dbUrl

def getDb():
    db = sqlite3.connect(dbPath)
    db.row_factory = sqlite3.Row
    return db


def initDb():
    try:
        db = getDb()
        db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            pw_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """)
        db.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            movie_id INTEGER NOT NULL,
            movie_type TEXT NOT NULL,
            title TEXT NOT NULL,
            poster_path TEXT,
            vote_average REAL,
            release_date TEXT,
            added_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, movie_id, movie_type)
        )
        """)
        print("Watchlist table created/verified")

        db.commit()
        db.close()
        print("Database initialization complete!")

    except Exception as e:
        import traceback
        traceback.print_exc()

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {authToken}"
}

def getMovieGenres():
    url = "https://api.themoviedb.org/3/genre/movie/list?language=en"
    response = requests.get(url, headers=headers)
    genres = {g["name"]: g["id"] for g in response.json()["genres"]}
    return genres

def getTvGenres():
    url = "https://api.themoviedb.org/3/genre/tv/list?language=en"
    response = requests.get(url, headers=headers)
    genresDict = {g["name"]: g["id"] for g in response.json()["genres"]}
    return genresDict

def getLanguages():
    url = "https://api.themoviedb.org/3/configuration/languages"
    response = requests.get(url, headers=headers)
    languages = response.json()
    return languages

@app.route("/", methods=["POST", "GET"])
def index():
    if request.method == "POST":
        selectedType = request.form.get("type") or "movie"
        adult = request.form.get("adult") or "False"
        ratingValue = request.form.get("rating") or 7.0
    else:
        selectedType = "movie"
        adult = "False"
        ratingValue = 7.0
    print(ratingValue)
    selectedGenres = request.form.getlist("genres")
    language = request.form.get("language") or "en-US"
    sortBy = request.form.get("sortBy") or "popularity.desc"

    return render_template("index.html",
        selectedType=selectedType,
        selectedGenres=selectedGenres,
        adult=adult,
        ratingValue=float(ratingValue),
        selectedLanguage=language,
        sortBy=sortBy
                       )
@app.get("/genres")
def genresApi():
    t = request.args.get("type","movie")
    data = getMovieGenres() if t == "movie" else getTvGenres()
    return jsonify(data)

@app.get("/languages")
def languagesApi():
    data = getLanguages()
    return jsonify(data)

@app.get("/discover")
def discover_api():
    contentType = request.args.get("type", "movie")
    if contentType not in ("movie", "tv"):
        contentType = "movie"

    joinedGenres = request.args.get("genres") or ""
    language = request.args.get("language") or "en"
    adult = request.args.get("adult", "False")
    sortBy = request.args.get("sortBy", "popularity.desc")
    page = int(request.args.get("page", 1))

    try:
        minRating = float(request.args.get("rating", 5))
    except ValueError:
        minRating = 5.0

    baseUrl = f"https://api.themoviedb.org/3/discover/{contentType}"
    params = {
        "include_adult": adult.lower() == "true",
        **({"include_video": False} if contentType == "movie" else {}),
        "language": language,
        "sort_by": sortBy,
        "vote_average.gte": minRating,
        "vote_count.gte": 50,
        "page": page,
    }

    if joinedGenres:
        params["with_genres"] = joinedGenres
    if language:
        params["with_original_language"] = language

    try:
        response = requests.get(baseUrl, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        return jsonify({
            "page": data.get("page", page),
            "totalPages": data.get("total_pages", 1),
            "results": data.get("results", []),
        })
    except requests.RequestException as e:
        return jsonify({"error": "tmdbRequestFailed", "details": str(e)}), 502


@app.get("/videos")
def videos_api():
    content_id = request.args.get("id")
    content_type = request.args.get("type", "movie")

    if not content_id:
        return jsonify({"error": "Missing id parameter"}), 400

    if content_type not in ("movie", "tv"):
        content_type = "movie"

    url = f"https://api.themoviedb.org/3/{content_type}/{content_id}/videos"

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        videos = data.get("results", [])
        trailer = next((v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"), None)
        if not trailer and videos:
            trailer = videos[0]

        return jsonify({"trailer": trailer})
    except requests.RequestException as e:
        return jsonify({"error": "Failed to fetch videos", "details": str(e)}), 502


@app.post("/auth/signup")
def signup():
    print("=== SIGNUP ENDPOINT CALLED ===")
    try:
        data = request.get_json()

        email = data.get("email", "").strip().lower()
        pw = data.get("password", "")

        # Validation
        if not email or not pw:
            return jsonify({"error": "Email and password required"}), 400

        if len(pw) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        # Email regex validation
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return jsonify({"error": "Invalid email format"}), 400

        # Insert user
        db = getDb()

        try:
            db.execute(
                "INSERT INTO users (id, email, pw_hash) VALUES (?, ?, ?)",
                (str(uuid.uuid4()), email, generate_password_hash(pw))
            )
            db.commit()
            return jsonify({"success": True, "message": "Account created successfully"}), 201
        except sqlite3.IntegrityError as e:
            return jsonify({"error": "Email already exists"}), 409
        except Exception as e:
            raise
        finally:
            db.close()

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@app.post("/auth/login")
def login():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        pw = data.get("password", "")

        if not email or not pw:
            return jsonify({"error": "Email and password required"}), 400

        db = getDb()
        try:
            user = db.execute(
                "SELECT id, email, pw_hash FROM users WHERE email = ?",
                (email,)
            ).fetchone()

            if user and check_password_hash(user["pw_hash"], pw):
                flaskSession["user_id"] = user["id"]
                flaskSession["email"] = user["email"]
                return jsonify({"success": True, "message": "Logged in successfully"}), 200
            else:
                return jsonify({"error": "Invalid email or password"}), 401
        finally:
            db.close()

    except Exception as e:
        return jsonify({"error": "Server error"}), 500


@app.post("/auth/logout")
def logout():
    flaskSession.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200


@app.get("/auth/me")
def getCurrentUser():
    if "user_id" in flaskSession:
        return jsonify({
            "authenticated": True,
            "email": flaskSession.get("email")
        }), 200
    return jsonify({"authenticated": False}), 200


@app.post("/watchlist/add")
def addToWatchlist():
    if "user_id" not in flaskSession:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        data = request.get_json()
        movieId = data.get("movieId")
        movieType = data.get("movieType", "movie")
        title = data.get("title", "")
        posterPath = data.get("posterPath")
        voteAverage = data.get("voteAverage")
        releaseDate = data.get("releaseDate")

        if not movieId or not title:
            return jsonify({"error": "Movie ID and title required"}), 400

        db = getDb()
        try:
            db.execute("""
                INSERT INTO watchlist (id, user_id, movie_id, movie_type, title, poster_path, vote_average, release_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4()),
                flaskSession["user_id"],
                movieId,
                movieType,
                title,
                posterPath,
                voteAverage,
                releaseDate
            ))
            db.commit()
            return jsonify({"success": True, "message": "Added to watchlist"}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "Already in watchlist"}), 409
        finally:
            db.close()

    except Exception as e:
        return jsonify({"error": "Server error"}), 500


@app.delete("/watchlist/remove")
def removeFromWatchlist():
    if "user_id" not in flaskSession:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        data = request.get_json()
        movieId = data.get("movieId")
        movieType = data.get("movieType", "movie")

        if not movieId:
            return jsonify({"error": "Movie ID required"}), 400

        db = getDb()
        try:
            db.execute("""
                DELETE FROM watchlist 
                WHERE user_id = ? AND movie_id = ? AND movie_type = ?
            """, (flaskSession["user_id"], movieId, movieType))
            db.commit()
            return jsonify({"success": True, "message": "Removed from watchlist"}), 200
        finally:
            db.close()

    except Exception as e:
        return jsonify({"error": "Server error"}), 500


@app.get("/watchlist")
def getWatchlist():
    if "user_id" not in flaskSession:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        db = getDb()
        try:
            items = db.execute("""
                SELECT movie_id, movie_type, title, poster_path, vote_average, release_date, added_at
                FROM watchlist
                WHERE user_id = ?
                ORDER BY added_at DESC
            """, (flaskSession["user_id"],)).fetchall()

            watchlist = [dict(item) for item in items]
            return jsonify({"watchlist": watchlist}), 200
        finally:
            db.close()

    except Exception as e:
        return jsonify({"error": "Server error"}), 500


@app.get("/watchlist/check")
def checkInWatchlist():
    if "user_id" not in flaskSession:
        return jsonify({"inWatchlist": False}), 200

    movieId = request.args.get("movieId")
    movieType = request.args.get("movieType", "movie")

    if not movieId:
        return jsonify({"error": "Movie ID required"}), 400

    try:
        db = getDb()
        try:
            exists = db.execute("""
                SELECT 1 FROM watchlist 
                WHERE user_id = ? AND movie_id = ? AND movie_type = ?
            """, (flaskSession["user_id"], movieId, movieType)).fetchone()

            return jsonify({"inWatchlist": exists is not None}), 200
        finally:
            db.close()

    except Exception as e:
        return jsonify({"error": "Server error"}), 500


@app.get("/auth/google")
def googleLogin():
    #redirectUri = getenv("GOOGLE_REDIRECT_URI")
    redirectUri = f"http://{request.host}/auth/google/callback"
    return google.authorize_redirect(redirectUri)


@app.get("/auth/google/callback")
def googleCallback():
    try:
        token = google.authorize_access_token()
        userInfo = token.get('userinfo')

        if not userInfo:
            return jsonify({"error": "Failed to get user info"}), 400

        email = userInfo['email']

        # Check if user exists
        db = getDb()
        try:
            user = db.execute(
                "SELECT id, email FROM users WHERE email = ?",
                (email,)
            ).fetchone()

            if not user:
                # Create new user with OAuth
                userId = str(uuid.uuid4())
                db.execute(
                    "INSERT INTO users (id, email, pw_hash) VALUES (?, ?, ?)",
                    (userId, email, "oauth_google")  # No password for OAuth users
                )
                db.commit()
                user = db.execute(
                    "SELECT id, email FROM users WHERE email = ?",
                    (email,)
                ).fetchone()

            # Log user in
            flaskSession["user_id"] = user["id"]
            flaskSession["email"] = user["email"]

            return """
            <script>
                window.opener.postMessage({type: 'oauth_success'}, '*');
                window.close();
            </script>
            """
        finally:
            db.close()

    except Exception as e:
        print(f"OAuth error: {e}")
        return jsonify({"error": "OAuth authentication failed"}), 500

if __name__ == '__main__':
    initDb()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)