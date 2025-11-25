// app/api/schools/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length < 1) {
      return NextResponse.json([]) // Return empty array for short queries
    }

    // For very short queries, return empty results
    if (query.trim().length < 2) {
      return NextResponse.json([])
    }

    console.log('Searching for:', query)

    // Use College Scorecard API (same as original) but server-side
    const apiKey = process.env.COLLEGE_SCORECARD_API_KEY || "Q3vFYKsHWLdcmu0Z8tWWH6Rd2DuTMRoYkJfWv2lX"
    const baseUrl = "https://api.data.gov/ed/collegescorecard/v1/schools"

    console.log('Using College Scorecard API with key length:', apiKey?.length)

    // Check if query is purely numeric - treat as school code and pad to 6 digits
    // Otherwise search by name
    const isNumeric = /^\d+$/.test(query.trim())
    const searchParam = isNumeric
      ? `id=${query.trim().padStart(6, '0')}`
      : `school.name=${encodeURIComponent(query)}`

    const apiUrl = `${baseUrl}.json?api_key=${apiKey}&${searchParam}&_fields=id,school.name,school.city,school.state&_per_page=12&school.operating=1`

    console.log('API URL (without key):', apiUrl.replace(apiKey, '[HIDDEN]'), 'isNumeric:', isNumeric, 'paddedCode:', isNumeric ? query.trim().padStart(6, '0') : 'N/A')

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Codura-App/1.0'
      },
      // Add timeout
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })

    if (!response.ok) {
      console.error('College Scorecard API failed:', response.status, response.statusText)
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Error response:', errorText)
      throw new Error(`College Scorecard API failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Raw College Scorecard API response:', data)

    if (!data || !data.results || !Array.isArray(data.results)) {
      console.error('Unexpected API response format:', data)
      return NextResponse.json([])
    }

    // Transform the API response to match our School type (same as original)
    const schools = data.results
      .map((school: any) => ({
        code: String(school.id || '').padStart(6, '0'), // Federal school code
        name: school["school.name"] || "Unknown School",
        city: school["school.city"] || null,
        state: school["school.state"] || null,
      }))
      .filter((school: { name: string; }) => school.name !== "Unknown School")

    console.log('Transformed schools:', schools)
    console.log('Returning schools array with length:', schools.length)

    return NextResponse.json(schools)

  } catch (error) {
    console.error('Schools API Error:', error)
    
    // Provide more specific error messages but return empty array to avoid breaking UI
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('Request timeout')
        return NextResponse.json([]) // Return empty array instead of error
      }
      if (error.message.includes('fetch')) {
        console.log('Network error')
        return NextResponse.json([]) // Return empty array instead of error
      }
    }
    
    return NextResponse.json([]) // Return empty array instead of error
  }
}