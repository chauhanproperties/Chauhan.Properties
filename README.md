# Chauhan Properties customer website

Mobile-first customer site for browsing public property listings and sending enquiries. It uses the existing public API and does not access the database directly.

## Run locally

From the project folder, start the API on port 5000:

```powershell
cd .\server
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 5000
```

In another PowerShell window, from the project folder serve the customer site on port 8001:

```powershell
cd .\user
python -m http.server 8001 --bind 127.0.0.1
```

Open <http://localhost:8001>. Local API requests use `http://localhost:5000`. The server's `DEBUG=true` local configuration includes both port 8001 origins in its default CORS list. If `ALLOWED_ORIGINS` is set explicitly, include `http://localhost:8001`.

## Before deployment

Replace `PRODUCTION_API_URL` in `js/config.js` with the deployed API URL and add this site's deployed origin to the server's `ALLOWED_ORIGINS`. Sold listings follow the server's `PUBLIC_SOLD_PROPERTIES` setting. If area filters are used, the site fetches all matching API pages because the current public API does not provide area filters.
