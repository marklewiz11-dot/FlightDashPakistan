const AIRPORTS = [
  { city: 'Islamabad', iata: 'ISB', icao: 'OPIS', lat: 33.549, lon: 72.826, radiusKm: 80 },
  { city: 'Lahore', iata: 'LHE', icao: 'OPLA', lat: 31.5216, lon: 74.4036, radiusKm: 80 },
  { city: 'Karachi', iata: 'KHI', icao: 'OPKC', lat: 24.9065, lon: 67.1608, radiusKm: 80 }
];

// Rough Pakistan bounding box
const PAKISTAN_BBOX = {
  lamin: 23.5,
  lamax: 37.2,
  lomin: 60.8,
  lomax: 77.9
};

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatTime(unixSeconds) {
  if (!unixSeconds) return '';
  return new Date(unixSeconds * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function headingToDirection(track) {
  if (track == null) return 'Unknown';
  if (track >= 315 || track < 45) return 'Northbound';
  if (track >= 45 && track < 135) return 'Eastbound';
  if (track >= 135 && track < 225) return 'Southbound';
  return 'Westbound';
}

function classifyAirport(lat, lon) {
  let best = null;

  for (const airport of AIRPORTS) {
    const d = distanceKm(lat, lon, airport.lat, airport.lon);
    if (d <= airport.radiusKm) {
      if (!best || d < best.distanceKm) {
        best = { airport, distanceKm: d };
      }
    }
  }

  return best;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json');

  try {
    const url =
      `https://opensky-network.org/api/states/all` +
      `?lamin=${PAKISTAN_BBOX.lamin}` +
      `&lamax=${PAKISTAN_BBOX.lamax}` +
      `&lomin=${PAKISTAN_BBOX.lomin}` +
      `&lomax=${PAKISTAN_BBOX.lomax}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'pakistan-flight-dashboard/1.0'
      }
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `OpenSky states request failed: ${response.status}`,
        details: text
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        success: false,
        error: 'OpenSky returned non-JSON data',
        details: text
      });
    }

    const states = Array.isArray(data.states) ? data.states : [];

    const flights = [];
    const summaryMap = new Map(
      AIRPORTS.map(a => [
        a.iata,
        {
          city: a.city,
          iata: a.iata,
          icao: a.icao,
          total: 0,
          airborne: 0,
          onGround: 0
        }
      ])
    );

    for (const s of states) {
      const [
        icao24,
        callsign,
        origin_country,
        time_position,
        last_contact,
        longitude,
        latitude,
        baro_altitude,
        on_ground,
        velocity,
        true_track,
        vertical_rate,
        sensors,
        geo_altitude,
        squawk,
        spi,
        position_source,
        category
      ] = s;

      if (latitude == null || longitude == null) continue;

      const hit = classifyAirport(latitude, longitude);
      if (!hit) continue;

      const airport = hit.airport;
      const summary = summaryMap.get(airport.iata);
      summary.total += 1;
      if (on_ground) summary.onGround += 1;
      else summary.airborne += 1;

      flights.push({
        airport: airport.city,
        airportIata: airport.iata,
        airportIcao: airport.icao,
        callsign: (callsign || '').trim(),
        icao24: icao24 || '',
        originCountry: origin_country || '',
        latitude,
        longitude,
        altitudeM: geo_altitude ?? baro_altitude ?? null,
        onGround: !!on_ground,
        velocityMs: velocity ?? null,
        heading: true_track ?? null,
        directionLabel: headingToDirection(true_track),
        lastContact: last_contact ?? null,
        lastContactText: formatTime(last_contact),
        distanceFromAirportKm: Math.round(hit.distanceKm * 10) / 10
      });
    }

    flights.sort((a, b) => {
      if (a.onGround !== b.onGround) return a.onGround ? 1 : -1;
      return a.distanceFromAirportKm - b.distanceFromAirportKm;
    });

    const summary = Array.from(summaryMap.values());

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      openskyTime: data.time || null,
      summary,
      flights
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'fetch failed',
      cause: error?.cause?.message || null
    });
  }
};
