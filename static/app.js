// ===== STATE =====
let currentUser = null;
let currentPage = 1;
let totalPages = 1;
let currentMovieData = null;

// ===== ELEMENTS =====
const heroSection = document.getElementById('heroSection');
const filtersSection = document.getElementById('filtersSection');
const resultsContainer = document.getElementById('resultsContainer');
const watchlistSection = document.getElementById('watchlistSection');
const findMoviesBtn = document.getElementById('findMoviesBtn');
const backBtn = document.getElementById('backBtn');
const watchlistBackBtn = document.getElementById('watchlistBackBtn');
const showFiltersBtn = document.getElementById('showFiltersBtn');
const form = document.getElementById('filtersForm');
const genresSelect = document.getElementById('genres');
const languagesEl = document.getElementById('languages');
const ratingInput = document.getElementById('rating');
const ratingLabel = document.getElementById('ratingValue');
const resultsEl = document.getElementById('results');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const statusEl = document.getElementById('status');
const resultsTitle = document.getElementById('resultsTitle');

// Auth elements
const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');
const watchlistNavBtn = document.getElementById('watchlistNavBtn');
const authStatus = document.getElementById('authStatus');
const authModal = document.getElementById('authModal');
const authModalClose = document.getElementById('authModalClose');
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

// Movie modal elements
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalRating = document.getElementById('modalRating');
const modalDate = document.getElementById('modalDate');
const modalOverview = document.getElementById('modalOverview');
const modalBackdrop = document.getElementById('modalBackdrop');
const videoContainer = document.getElementById('videoContainer');
const watchlistToggleBtn = document.getElementById('watchlistToggleBtn');

// Watchlist elements
const watchlistResults = document.getElementById('watchlistResults');
const watchlistCount = document.getElementById('watchlistCount');

// ===== AUTH FUNCTIONS =====
async function checkAuth() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();

    if (data.authenticated) {
      currentUser = data;
      authStatus.textContent = `Hi, ${data.email}`;
      authBtn.style.display = 'none';
      logoutBtn.style.display = 'block';
      watchlistNavBtn.style.display = 'block';
    } else {
      currentUser = null;
      authStatus.textContent = '';
      authBtn.style.display = 'block';
      logoutBtn.style.display = 'none';
      watchlistNavBtn.style.display = 'none';
    }
  } catch (err) {
    console.error('Auth check failed:', err);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      closeAuthModal();
      await checkAuth();
      loginForm.reset();
    } else {
      loginError.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    loginError.textContent = 'Connection error. Please try again.';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  signupError.textContent = '';

  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupPasswordConfirm').value;

  if (password !== confirmPassword) {
    signupError.textContent = 'Passwords do not match';
    return;
  }

  try {
    const res = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      // Auto login after signup
      const loginRes = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (loginRes.ok) {
        closeAuthModal();
        await checkAuth();
        signupForm.reset();
      }
    } else {
      signupError.textContent = data.error || 'Signup failed';
    }
  } catch (err) {
    signupError.textContent = 'Connection error. Please try again.';
  }
}

async function handleLogout() {
  try {
    await fetch('/auth/logout', { method: 'POST' });
    await checkAuth();
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

function openAuthModal() {
  authModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  authModal.classList.remove('active');
  document.body.style.overflow = '';
  loginError.textContent = '';
  signupError.textContent = '';
}

function handleGoogleLogin() {
  const width = 500;
  const height = 600;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;

  const popup = window.open(
    '/auth/google',
    'google_login',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  // Listen for OAuth callback
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'oauth_success') {
      await checkAuth();
      closeAuthModal();
    }
  });
}

// ===== WATCHLIST FUNCTIONS =====
async function checkInWatchlist(movieId, movieType) {
  if (!currentUser) return false;

  try {
    const res = await fetch(`/watchlist/check?movieId=${movieId}&movieType=${movieType}`);
    const data = await res.json();
    return data.inWatchlist;
  } catch (err) {
    console.error('Check watchlist failed:', err);
    return false;
  }
}

async function addToWatchlist(movieData) {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  try {
    const res = await fetch('/watchlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movieData)
    });

    const data = await res.json();

    if (res.ok) {
      updateWatchlistButton(true);
      alert('Added to watchlist!');
    } else if (res.status === 409) {
      alert('Already in watchlist');
    } else {
      alert(data.error || 'Failed to add to watchlist');
    }
  } catch (err) {
    alert('Connection error. Please try again.');
  }
}

async function removeFromWatchlist(movieId, movieType) {
  if (!currentUser) return;

  try {
    const res = await fetch('/watchlist/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId, movieType })
    });

    if (res.ok) {
      updateWatchlistButton(false);
      alert('Removed from watchlist');
    }
  } catch (err) {
    alert('Connection error. Please try again.');
  }
}

async function loadWatchlist() {
  if (!currentUser) {
    openAuthModal();
    return;
  }

  try {
    const res = await fetch('/watchlist');
    const data = await res.json();

    if (res.ok) {
      renderWatchlist(data.watchlist);
      watchlistCount.textContent = `${data.watchlist.length} items saved`;

      // Show watchlist section
      heroSection.style.display = 'none';
      filtersSection.classList.remove('active');
      watchlistSection.style.display = 'block';
    } else {
      alert(data.error || 'Failed to load watchlist');
    }
  } catch (err) {
    alert('Connection error. Please try again.');
  }
}

function renderWatchlist(items) {
  watchlistResults.innerHTML = '';

  if (items.length === 0) {
    watchlistResults.innerHTML = '<div class="status">Your watchlist is empty. Start adding movies!</div>';
    return;
  }

  const frag = document.createDocumentFragment();

  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'card';

    const posterWrap = document.createElement('div');
    posterWrap.className = 'poster-wrap';

    if (item.poster_path) {
      const img = document.createElement('img');
      img.className = 'poster';
      img.loading = 'lazy';
      img.alt = item.title;
      img.src = `https://image.tmdb.org/t/p/w342${item.poster_path}`;
      posterWrap.appendChild(img);
    } else {
      posterWrap.style.display = 'flex';
      posterWrap.style.alignItems = 'center';
      posterWrap.style.justifyContent = 'center';
      posterWrap.style.color = 'rgba(255, 255, 255, 0.3)';
      posterWrap.textContent = 'No Image';
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = item.title;

    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.innerHTML = `⭐ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}`;

    body.appendChild(title);
    body.appendChild(sub);
    card.appendChild(posterWrap);
    card.appendChild(body);

    // Click to view details
    card.addEventListener('click', async () => {
      const movieItem = {
        id: item.movie_id,
        title: item.title,
        name: item.title,
        vote_average: item.vote_average,
        release_date: item.release_date,
        first_air_date: item.release_date,
        poster_path: item.poster_path,
        backdrop_path: item.poster_path,
        overview: 'Click to see full details'
      };
      await openModal(movieItem, item.movie_type);
    });

    frag.appendChild(card);
  }

  watchlistResults.appendChild(frag);
}

function updateWatchlistButton(inWatchlist) {
  if (inWatchlist) {
    watchlistToggleBtn.classList.add('in-watchlist');
    document.getElementById('watchlistBtnText').textContent = '✓ In Watchlist';
  } else {
    watchlistToggleBtn.classList.remove('in-watchlist');
    document.getElementById('watchlistBtnText').textContent = 'Add to Watchlist';
  }
}

// ===== NAVIGATION =====
findMoviesBtn.addEventListener('click', () => {
  heroSection.style.display = 'none';
  filtersSection.classList.add('active');
  watchlistSection.style.display = 'none';
});

backBtn.addEventListener('click', () => {
  heroSection.style.display = 'flex';
  filtersSection.classList.remove('active');
  resultsContainer.style.display = 'none';
  watchlistSection.style.display = 'none';
});

watchlistBackBtn.addEventListener('click', () => {
  heroSection.style.display = 'none';
  filtersSection.classList.add('active');
  watchlistSection.style.display = 'none';
});

showFiltersBtn.addEventListener('click', () => {
  resultsContainer.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

watchlistNavBtn.addEventListener('click', loadWatchlist);

// ===== AUTH EVENT LISTENERS =====
authBtn.addEventListener('click', openAuthModal);
logoutBtn.addEventListener('click', handleLogout);
authModalClose.addEventListener('click', closeAuthModal);

authModal.addEventListener('click', (e) => {
  if (e.target === authModal) closeAuthModal();
});

loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  loginForm.style.display = 'block';
  signupForm.style.display = 'none';
  loginError.textContent = '';
});

signupTab.addEventListener('click', () => {
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  signupForm.style.display = 'block';
  loginForm.style.display = 'none';
  signupError.textContent = '';
});

loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignup);

document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleLogin);


// ===== MOVIE FUNCTIONS =====
async function loadGenres(type, preselectIds) {
  const res = await fetch(`/genres?type=${encodeURIComponent(type)}`);
  const data = await res.json();
  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));

  genresSelect.innerHTML = '';
  for (const [name, id] of entries) {
    const opt = document.createElement('option');
    opt.value = String(id);
    opt.textContent = name;
    if (preselectIds && preselectIds.includes(String(id))) opt.selected = true;
    genresSelect.appendChild(opt);
  }
}

async function loadLanguages(preselectCode = 'en') {
  const res = await fetch('/languages');
  const data = await res.json();
  data.sort((a, b) => a.english_name.localeCompare(b.english_name));

  languagesEl.innerHTML = '';
  for (const lang of data) {
    const opt = document.createElement('option');
    opt.value = lang.iso_639_1;
    opt.textContent = lang.english_name;
    if (lang.iso_639_1 === preselectCode) opt.selected = true;
    languagesEl.appendChild(opt);
  }
}

function getFilters() {
  const type = document.querySelector('input[name="type"]:checked')?.value || 'movie';
  const genres = Array.from(genresSelect.selectedOptions).map(o => o.value).join(',');
  const language = languagesEl.value || 'en';
  const adult = document.querySelector('input[name="adult"]:checked')?.value || 'False';
  const rating = ratingInput.value || '5';
  const sortBy = document.getElementById('sortBy').value || 'popularity.desc';
  return { type, genres, language, adult, rating, sortBy };
}

function setStatus(msg) {
  statusEl.textContent = msg || '';
}

function toggleLoadMore(show) {
  loadMoreBtn.style.display = show ? 'inline-block' : 'none';
  loadMoreBtn.disabled = !show;
}

async function fetchTrailer(id, type) {
  try {
    const res = await fetch(`/videos?id=${id}&type=${type}`);
    const data = await res.json();
    return data.trailer || null;
  } catch (err) {
    console.error('Failed to fetch trailer:', err);
    return null;
  }
}

async function openModal(item, type) {
  currentMovieData = { item, type };

  modalTitle.textContent = item.title || item.name || 'Untitled';
  modalRating.textContent = typeof item.vote_average === 'number' ? item.vote_average.toFixed(1) : 'N/A';
  modalOverview.textContent = item.overview || 'No description available.';

  const dateField = type === 'movie' ? item.release_date : item.first_air_date;
  if (dateField) {
    modalDate.textContent = `📅 ${new Date(dateField).getFullYear()}`;
  } else {
    modalDate.textContent = '';
  }

  if (item.backdrop_path) {
    modalBackdrop.src = `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;
  } else if (item.poster_path) {
    modalBackdrop.src = `https://image.tmdb.org/t/p/w1280${item.poster_path}`;
  } else {
    modalBackdrop.src = '';
  }

  // Check if in watchlist and show button
  if (currentUser) {
    watchlistToggleBtn.style.display = 'inline-block';
    const inWatchlist = await checkInWatchlist(item.id, type);
    updateWatchlistButton(inWatchlist);
  } else {
    watchlistToggleBtn.style.display = 'inline-block';
    watchlistToggleBtn.classList.remove('in-watchlist');
    document.getElementById('watchlistBtnText').textContent = 'Add to Watchlist';
  }

  videoContainer.innerHTML = '<div class="no-video">Loading trailer...</div>';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  const trailer = await fetchTrailer(item.id, type);
  if (trailer && trailer.key) {
    videoContainer.innerHTML = `
      <div class="video-container">
        <iframe src="https://www.youtube.com/embed/${trailer.key}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>`;
  } else {
    videoContainer.innerHTML = '<div class="no-video">No trailer available</div>';
  }
}

function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  videoContainer.innerHTML = '';
  currentMovieData = null;
}

function renderResults(items, append = false) {
  if (!append) resultsEl.innerHTML = "";

  const frag = document.createDocumentFragment();
  const currentType = document.querySelector('input[name="type"]:checked')?.value || 'movie';

  for (const it of items) {
    const title = it.title || it.name || 'Untitled';
    const rating = typeof it.vote_average === 'number' ? it.vote_average.toFixed(1) : 'N/A';
    const posterUrl = it.poster_path ? `https://image.tmdb.org/t/p/w342${it.poster_path}` : null;

    const card = document.createElement('div');
    card.className = 'card';
    card.addEventListener('click', () => openModal(it, currentType));

    const posterWrap = document.createElement('div');
    posterWrap.className = 'poster-wrap';

    if (posterUrl) {
      const img = document.createElement('img');
      img.className = 'poster';
      img.loading = 'lazy';
      img.alt = title;
      img.src = posterUrl;
      posterWrap.appendChild(img);
    } else {
      posterWrap.style.display = 'flex';
      posterWrap.style.alignItems = 'center';
      posterWrap.style.justifyContent = 'center';
      posterWrap.style.color = 'rgba(255, 255, 255, 0.3)';
      posterWrap.textContent = 'No Image';
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const t = document.createElement('div');
    t.className = 'title';
    t.textContent = title;

    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.innerHTML = `⭐ ${rating}`;

    body.appendChild(t);
    body.appendChild(sub);
    card.appendChild(posterWrap);
    card.appendChild(body);
    frag.appendChild(card);
  }

  resultsEl.appendChild(frag);
}

async function fetchPage(page = 1, append = false) {
  const filters = getFilters();
  const params = new URLSearchParams({ ...filters, page });
  const url = `/discover?${params.toString()}`;

  setStatus('Loading...');
  toggleLoadMore(false);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    currentPage = Number(data.page || page);
    totalPages = Number(data.totalPages || 1);

    renderResults(data.results || [], append);

    const resultCount = data.results?.length || 0;
    setStatus(
      resultCount === 0 && currentPage === 1
        ? 'No matches found. Try adjusting your filters.'
        : `Showing page ${currentPage} of ${totalPages} (${resultCount} results)`
    );

    toggleLoadMore(currentPage < totalPages);

    const typeLabel = filters.type === 'movie' ? 'Movies' : 'TV Shows';
    resultsTitle.textContent = `Recommended ${typeLabel} (${resultCount} found)`;
  } catch (err) {
    console.error(err);
    setStatus('Failed to load results. Please check your connection and try again.');
    toggleLoadMore(false);
  }
}

// ===== EVENT LISTENERS =====
ratingInput.addEventListener('input', () => {
  ratingLabel.textContent = parseFloat(ratingInput.value).toFixed(1);
});

document.querySelectorAll('input[name="type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const currentSelection = Array.from(genresSelect.selectedOptions).map(o => o.value);
    loadGenres(radio.value, currentSelection);
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  currentPage = 1;
  resultsContainer.style.display = 'block';
  window.scrollTo({ top: document.getElementById('resultsContainer').offsetTop - 20, behavior: 'smooth' });
  fetchPage(1, false);
});

loadMoreBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    fetchPage(currentPage + 1, true);
  }
});

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

watchlistToggleBtn.addEventListener('click', async () => {
  if (!currentMovieData) return;

  const { item, type } = currentMovieData;
  const inWatchlist = await checkInWatchlist(item.id, type);

  if (inWatchlist) {
    await removeFromWatchlist(item.id, type);
  } else {
    const movieData = {
      movieId: item.id,
      movieType: type,
      title: item.title || item.name,
      posterPath: item.poster_path,
      voteAverage: item.vote_average,
      releaseDate: type === 'movie' ? item.release_date : item.first_air_date
    };
    await addToWatchlist(movieData);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  loadLanguages('en');
  loadGenres('movie', []);
});