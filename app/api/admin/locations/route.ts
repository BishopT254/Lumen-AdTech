import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Mock locations data
const mockLocations = [
  { id: "loc1", name: "Nairobi CBD", type: "urban" },
  { id: "loc2", name: "Westlands", type: "urban" },
  { id: "loc3", name: "Kilimani", type: "urban" },
  { id: "loc4", name: "Mombasa", type: "coastal" },
  { id: "loc5", name: "Kisumu", type: "lakeside" },
  { id: "loc6", name: "Nakuru", type: "urban" },
  { id: "loc7", name: "Eldoret", type: "highland" },
  { id: "loc8", name: "Thika", type: "industrial" },
  { id: "loc9", name: "Machakos", type: "rural" },
  { id: "loc10", name: "Malindi", type: "coastal" },
  { id: "loc11", name: "Lamu", type: "coastal" },
  { id: "loc12", name: "Nyeri", type: "highland" },
  { id: "loc13", name: "Kakamega", type: "western" },
  { id: "loc14", name: "Garissa", type: "northern" },
  { id: "loc15", name: "Kitale", type: "highland" },
  { id: "loc16", name: "Kericho", type: "highland" },
  { id: "loc17", name: "Naivasha", type: "lakeside" },
  { id: "loc18", name: "Athi River", type: "industrial" },
  { id: "loc19", name: "Voi", type: "eastern" },
  { id: "loc20", name: "Bungoma", type: "western" },
]

// GET handler for searching locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || ""

    // Filter locations based on search term and type
    let filteredLocations = [...mockLocations]

    if (search) {
      filteredLocations = filteredLocations.filter((loc) => loc.name.toLowerCase().includes(search.toLowerCase()))
    }

    if (type) {
      filteredLocations = filteredLocations.filter((loc) => loc.type === type)
    }

    // Limit results to 20
    filteredLocations = filteredLocations.slice(0, 20)

    return NextResponse.json(filteredLocations)
  } catch (error) {
    console.error("Error searching locations:", error)
    return NextResponse.json({ error: "Failed to search locations" }, { status: 500 })
  }
}
