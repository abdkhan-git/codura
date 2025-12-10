import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ClearbitCompany {
  name: string;
  domain: string;
  logo?: string | null;
}

// GET /api/companies/search?q=search_term
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ companies: [] });
    }

    // Use Clearbit Autocomplete API - FREE and no API key needed
    const clearbitUrl = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`;

    const response = await fetch(clearbitUrl);

    if (!response.ok) {
      console.error('Clearbit API error:', response.statusText);
      return NextResponse.json(
        { error: 'Failed to search companies' },
        { status: 500 }
      );
    }

    const results: ClearbitCompany[] = await response.json();

    // Transform Clearbit results to our company format
    const companies = results.map((company, index) => ({
      id: `${company.domain}-${index}`, // Use domain as unique ID
      name: company.name,
      domain: company.domain,
      logo: company.logo, // Will be null after Sept 2025
    }));

    return NextResponse.json({
      companies,
      count: companies.length
    });
  } catch (error) {
    console.error('Company search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
