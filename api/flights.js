module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json');

  const now = Date.now();

  const flights = [
    {
      airport: 'Islamabad',
      airportIata: 'ISB',
      airportIcao: 'OPIS',
      direction: 'Departure',
      callsign: 'PIA302',
      airline: 'Pakistan International Airlines',
      origin: 'OPIS',
      destination: 'OPKC',
      route: 'ISB → KHI',
      status: 'Boarding',
      scheduledLikeTime: new Date(now + 20 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Islamabad',
      airportIata: 'ISB',
      airportIcao: 'OPIS',
      direction: 'Arrival',
      callsign: 'QTR633',
      airline: 'Qatar Airways',
      origin: 'OTHH',
      destination: 'OPIS',
      route: 'DOH → ISB',
      status: 'Landed',
      scheduledLikeTime: new Date(now - 15 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Islamabad',
      airportIata: 'ISB',
      airportIcao: 'OPIS',
      direction: 'Departure',
      callsign: 'SER100',
      airline: 'SereneAir',
      origin: 'OPIS',
      destination: 'OPLA',
      route: 'ISB → LHE',
      status: 'Scheduled',
      scheduledLikeTime: new Date(now + 75 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Lahore',
      airportIata: 'LHE',
      airportIcao: 'OPLA',
      direction: 'Departure',
      callsign: 'AIC143',
      airline: 'Air India',
      origin: 'OPLA',
      destination: 'VIDP',
      route: 'LHE → DEL',
      status: 'Scheduled',
      scheduledLikeTime: new Date(now + 45 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Lahore',
      airportIata: 'LHE',
      airportIcao: 'OPLA',
      direction: 'Arrival',
      callsign: 'UAE623',
      airline: 'Emirates',
      origin: 'OMDB',
      destination: 'OPLA',
      route: 'DXB → LHE',
      status: 'Approaching',
      scheduledLikeTime: new Date(now + 10 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Lahore',
      airportIata: 'LHE',
      airportIcao: 'OPLA',
      direction: 'Departure',
      callsign: 'PIA204',
      airline: 'Pakistan International Airlines',
      origin: 'OPLA',
      destination: 'OPIS',
      route: 'LHE → ISB',
      status: 'Delayed',
      scheduledLikeTime: new Date(now + 95 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Karachi',
      airportIata: 'KHI',
      airportIcao: 'OPKC',
      direction: 'Departure',
      callsign: 'ETD221',
      airline: 'Etihad Airways',
      origin: 'OPKC',
      destination: 'OMAA',
      route: 'KHI → AUH',
      status: 'Boarding',
      scheduledLikeTime: new Date(now + 30 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Karachi',
      airportIata: 'KHI',
      airportIcao: 'OPKC',
      direction: 'Arrival',
      callsign: 'FLY542',
      airline: 'flydubai',
      origin: 'OMDB',
      destination: 'OPKC',
      route: 'DXB → KHI',
      status: 'Landed',
      scheduledLikeTime: new Date(now - 25 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    },
    {
      airport: 'Karachi',
      airportIata: 'KHI',
      airportIcao: 'OPKC',
      direction: 'Arrival',
      callsign: 'THY708',
      airline: 'Turkish Airlines',
      origin: 'LTFM',
      destination: 'OPKC',
      route: 'IST → KHI',
      status: 'Scheduled',
      scheduledLikeTime: new Date(now + 120 * 60000).toISOString(),
      firstSeenText: '',
      lastSeenText: ''
    }
  ];

  const summary = [
    {
      city: 'Islamabad',
      iata: 'ISB',
      icao: 'OPIS',
      arrivals: flights.filter(f => f.airportIata === 'ISB' && f.direction === 'Arrival').length,
      departures: flights.filter(f => f.airportIata === 'ISB' && f.direction === 'Departure').length,
      total: flights.filter(f => f.airportIata === 'ISB').length
    },
    {
      city: 'Lahore',
      iata: 'LHE',
      icao: 'OPLA',
      arrivals: flights.filter(f => f.airportIata === 'LHE' && f.direction === 'Arrival').length,
      departures: flights.filter(f => f.airportIata === 'LHE' && f.direction === 'Departure').length,
      total: flights.filter(f => f.airportIata === 'LHE').length
    },
    {
      city: 'Karachi',
      iata: 'KHI',
      icao: 'OPKC',
      arrivals: flights.filter(f => f.airportIata === 'KHI' && f.direction === 'Arrival').length,
      departures: flights.filter(f => f.airportIata === 'KHI' && f.direction === 'Departure').length,
      total: flights.filter(f => f.airportIata === 'KHI').length
    }
  ];

  res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    summary,
    flights
  });
};
