import { NextRequest, NextResponse } from 'next/server';

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
  type: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ locations: [] });
    }

    // Use Nominatim (OpenStreetMap) for location search - FREE and no API key needed
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=15&featuretype=city`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Codura-App/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.statusText);
      return NextResponse.json(
        { error: 'Failed to search locations' },
        { status: 500 }
      );
    }

    const results: NominatimResult[] = await response.json();

    // Transform Nominatim results to our location format
    const locations = results
      .filter((result) => {
        // Only include cities, towns, villages (not streets, buildings, etc.)
        return ['city', 'town', 'village', 'administrative'].includes(result.type);
      })
      .map((result) => {
        const city = result.address.city || result.address.town || result.address.village || '';
        const state = result.address.state || '';
        const country = result.address.country || '';

        return {
          id: result.place_id.toString(),
          city,
          state,
          country,
          formatted_address: result.display_name,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        };
      })
      .filter((loc) => loc.city && loc.country); // Only return locations with city and country

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error in location search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

