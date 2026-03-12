const AIRPORTS = {
  OPIS: { city: 'Islamabad', iata: 'ISB', icao: 'OPIS' },
  OPLA: { city: 'Lahore', iata: 'LHE', icao: 'OPLA' },
  OPKC: { city: 'Karachi', iata: 'KHI', icao: 'OPKC' }
};

function getUnixRange() {
  const now = new Date();
  const end = Math.floor(now.getTime() / 1000);
  const start = end - (48 * 60 * 60);
  return { start, end };
}

async function getToken() {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing OpenSky credentials. Set OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET in Vercel.');
  }

  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenSky token request failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function fetchAirportFlights(token, airportIcao, begin, end) {
  const base = 'https://opensky-network.org/api';
  const [arrivalsRes, departuresRes] = await Promise.all([
    fetch(`${base}/flights/arrival?airport=${airportIcao}&begin=${begin}&end=${end}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${base}/flights/departure?airport=${airportIcao}&begin=${begin}&end=${end}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ]);

  if (!arrivalsRes.ok || !departuresRes.ok) {
    const arrivalText = await arrivalsRes.text().catch(() => '');
    const departureText = await departuresRes.text().catch(() => '');
    throw new Error(`OpenSky flight request failed for ${airportIcao}. Arrival ${arrivalsRes.status}: ${arrivalText}. Departure ${departuresRes.status}: ${departureText}`);
  }

  const arrivals = await arrivalsRes.json();
  const departures = await departuresRes.json();

  return {
    arrivals: arrivals.map(f => normalizeFlight(f, airportIcao, 'Arrival')),
    departures: departures.map(f => normalizeFlight(f, airportIcao, 'Departure'))
  };
}

function normalizeFlight(flight, airportIcao, direction) {
  const airport = AIRPORTS[airportIcao];
  const firstSeen = flight.firstSeen ? new Date(flight.firstSeen * 1000).toISOString() : null;
  const lastSeen = flight.lastSeen ? new Date(flight.lastSeen * 1000).toISOString() : null;
  const origin = flight.estDepartureAirport || '';
  const destination = flight.estArrivalAirport || '';

  return {
    callsign: (flight.callsign || '').trim(),
    icao24: flight.icao24 || '',
    city: airport.city,
    airportIata: airport.iata,
    airportIcao: airport.icao,
    direction,
    origin,
    destination,
    scheduledLikeTime: direction === 'Departure' ? firstSeen : lastSeen,
    firstSeen,
    lastSeen,
    route: `${origin || 'Unknown'} to ${destination || 'Unknown'}`
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  try {
    const { start, end } = getUnixRange();
    const token = await getToken();

    const airportResults = await Promise.all(
      Object.keys(AIRPORTS).map(async airportIcao => {
        const data = await fetchAirportFlights(token, airportIcao, start, end);
        return {
          airport: AIRPORTS[airportIcao],
          arrivals: data.arrivals,
          departures: data.departures
        };
      })
    );

    const summary = airportResults.map(r => ({
      city: r.airport.city,
      iata: r.airport.iata,
      icao: r.airport.icao,
      arrivals: r.arrivals.length,
      departures: r.departures.length,
      total: r.arrivals.length + r.departures.length
    }));

    const flights = airportResults.flatMap(r => [...r.arrivals, ...r.departures])
      .sort((a, b) => new Date(b.scheduledLikeTime || 0) - new Date(a.scheduledLikeTime || 0));

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      windowHours: 48,
      summary,
      flights
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Unknown server error'
    });
  }
};
