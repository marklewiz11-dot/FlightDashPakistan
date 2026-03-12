# Pakistan Flight Dashboard

A Vercel friendly browser dashboard for Pakistan flight activity covering:
- Islamabad (OPIS)
- Lahore (OPLA)
- Karachi (OPKC)

## Important limitation
This version is designed around OpenSky. OpenSky airport arrivals and departures are historical rather than true live airport board feeds, so this is best for recent and previous day tracking rather than minute by minute operational monitoring.

## What you need
1. A free OpenSky account
2. OAuth2 client credentials from OpenSky
3. Vercel account for hosting

## Environment variables in Vercel
- `OPENSKY_CLIENT_ID`
- `OPENSKY_CLIENT_SECRET`

## Local run
```bash
npm install -g vercel
vercel dev
```

## Deploy
1. Upload this folder to GitHub or import it straight into Vercel
2. Add the environment variables above in your Vercel project settings
3. Deploy

## Notes
- The API route is `/api/flights`
- The front end is a single `index.html`
- If OpenSky rate limits or changes fields, adjust `api/flights.js`
