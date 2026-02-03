import { NextRequest, NextResponse } from "next/server";

const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || "japaneast";

export async function POST(request: NextRequest) {
  try {
    const { text, rate = 1.0 } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!speechKey) {
      return NextResponse.json(
        { error: "Speech key not configured" },
        { status: 500 }
      );
    }

    // Convert rate to percentage format for SSML
    // 1.0 = default, 0.5 = -50%, 1.5 = +50%
    const ratePercent = Math.round((rate - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    // Build SSML for controlling speech rate
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="en-US-AvaMultilingualNeural"><prosody rate="${rateStr}">${escapeXml(text)}</prosody></voice></speak>`;

    // Call Azure TTS REST API
    // Use higher quality format with less encoding latency
    const endpoint = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
        "Content-Type": "application/ssml+xml",
        // Use 24kHz for better quality and reduced initial silence
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TTS API error:", response.status, errorText);
      return NextResponse.json(
        { error: `TTS API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
