import requests
from dotenv import load_dotenv
from os import getenv
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

load_dotenv()
authToken = getenv("TMDB_API_KEY")
url = "https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&sort_by=popularity.desc&with_genres="

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {authToken}"
}

#response = requests.get(url, headers=headers)
#print(response.json())

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