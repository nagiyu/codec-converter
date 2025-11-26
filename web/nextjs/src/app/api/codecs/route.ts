import { NextResponse } from "next/server";

/**
 * GET /api/codecs
 * Returns a list of supported target codecs.
 *
 * Response:
 *   - Array of { code: string, name: string }
 */
export async function GET(): Promise<NextResponse> {
  // Stub: Return list of supported codecs
  const codecs = [
    { code: "h264", name: "H.264 / AVC" },
    { code: "hevc", name: "H.265 / HEVC" },
    { code: "vp9", name: "VP9" },
    { code: "av1", name: "AV1" },
  ];

  return NextResponse.json(codecs, { status: 200 });
}
