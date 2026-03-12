const AIRPORTS = [
  { code: 'OPIS', city: 'Islamabad', iata: 'ISB' },
  { code: 'OPLA', city: 'Lahore', iata: 'LHE' },
  { code: 'OPKC', city: 'Karachi', iata: 'KHI' }
];

function formatTime(unixSeconds) {
  if (!unixSeconds) return '';
  return new Date(unixSeconds * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function normalizeFlight(flight, airportIcao, direction) {
  const airport = AIRPORTS.find(a => a.code === airportIcao);

  return {
    airport: airport?.city || airportIcao,
    airportIata: airport?.iata || airportIcao,
    airportIcao,
    direction,
    callsign: (flight.callsign || '').trim(),
    icao24: flight.icao24 || '',
    origin: flight.estDepartureAirport || '',
    destination: flight.estArrivalAirport || '',
    firstSeen: flight.firstSeen || null,
    lastSeen: flight.lastSeen || null,
    firstSeenText: formatTime(flight.firstSeen),
    lastSeenText: formatTime(flight.lastSeen),
    scheduledLikeTime:
      direction === 'Departure'
        ? (flight.firstSeen ? new Date(flight.firstSeen * 1000).toISOString() : null)
        : (flight.lastSeen ? new Date(flight.lastSeen * 1000).toISOString() : null),
    route:
      direction === 'Arrival'
        ? `${flight.estDepartureAirport || 'Unknown'} → ${airportIcao}`
        : `${airportIcao} → ${flight.estArrivalAirport || 'Unknown'}`
  };
}

function getPreviousUtcDayRange() {
  const now = new Date();

  const endDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0
  ));

  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  return {
    start: Math.floor(startDate.getTime() / 1000),
    end: Math.floor(endDate.getTime() / 1000)
  };
}

async function getToken() {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing OpenSky credentials. Set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET in Vercel.');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const res = await fetch(
    'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }
  );

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`OpenSky token request failed: ${res.status} ${text}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`OpenSky token response was not valid JSON: ${text}`);
  }

  if (!json.access_token) {
    throw new Error(`OpenSky token response did not contain access_token: ${text}`);
  }

  return json.access_token;
}

async function fetchJsonOrEmpty(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 404) {
    return [];
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`OpenSky request failed: ${res.status} ${text}`);
  }

  if (!text.trim()) {
    return [];
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`OpenSky response was not valid JSON: ${text}`);
  }
}

async function fetchAirportFlights(token, airportIcao, begin, end) {
  const base = 'https://opensky-network.org/api';

  const arrivals = await fetchJsonOrEmpty(
    `${base}/flights/arrival?airport=${airportIcao}&begin=${begin}&end=${end}`,
    token
  );

  const departures = await fetchJsonOrEmpty(
    `${base}/flights/departure?airport=${airportIcao}&begin=${begin}&end=${end}`,
    token
  );

  return {
    arrivals: arrivals.map(f => normalizeFlight(f, airportIcao, 'Arrival')),
    departures: departures.map(f => normalizeFlight(f, airportIcao, 'Departure'))
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  try {
    const { start, end } = getPreviousUtcDayRange();
    const token = await getToken();

    const airportResults = await Promise.all(
      AIRPORTS.map(async airport => {
        const data = await fetchAirportFlights(token, airport.code, start, end);
        return {
          airport,
          arrivals: data.arrivals,
          departures: data.departures
        };
      })
    );

    const summary = airportResults.map(r => ({
      city: r.airport.city,
      iata: r.airport.iata,
      icao: r.airport.code,
      arrivals: r.arrivals.length,
      departures: r.departures.length,
      total: r.arrivals.length + r.departures.length
    }));

    const flights = airportResults
      .flatMap(r => [...r.arrivals, ...r.departures])
      .sort((a, b) => new Date(b.scheduledLikeTime || 0) - new Date(a.scheduledLikeTime || 0));

    res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      window: { begin: start, end },
      summary,
      flights
    });
  } catch (error) {
    console.error('API /api/flights failed:', error);

    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
      cause: error?.cause?.message || null
    });
  }
};
