import { NextResponse, NextRequest } from 'next/server'

// Redirect all requests to the main API endpoint at /api/data/download
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'This endpoint is deprecated. Please use /api/data/download instead.' },
    { status: 308, headers: { 'Location': '/api/data/download' } }
  )
}

export async function POST(request: NextRequest) {
  // Forward the request to the main API endpoint
  try {
    // Clone the request to forward it
    const requestBody = await request.json()
    
    // Create a new request to the correct endpoint
    const forwardResponse = await fetch(`${request.nextUrl.origin}/api/data/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization headers
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify(requestBody)
    })
    
    // Get the response content
    const responseData = await forwardResponse.arrayBuffer()
    const contentType = forwardResponse.headers.get('Content-Type') || 'application/json'
    
    // Return the forwarded response
    return new NextResponse(responseData, {
      status: forwardResponse.status,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': forwardResponse.headers.get('Content-Disposition') || ''
      }
    })
  } catch (error) {
    console.error('Error forwarding to data download endpoint:', error)
    return NextResponse.json(
      { error: 'This endpoint is deprecated. Please use /api/data/download instead.',
        details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 308, headers: { 'Location': '/api/data/download' } }
    )
  }
} 