export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      prompt,
      style,
      mood,
      duration
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({
        error: "Music prompt is required."
      });
    }

    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "MINIMAX_API_KEY is not configured in Vercel."
      });
    }

    const musicPrompt = [
      prompt,
      `Style: ${style || "Pop"}`,
      `Mood: ${mood || "Happy"}`,
      `Target duration: ${duration || 60} seconds`
    ].join(". ");

    const response = await fetch(
      "https://api.minimax.io/v1/music_generation",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "music-2.6-free",
          prompt: musicPrompt,
          lyrics_optimizer: true,
          is_instrumental: false,
          output_format: "url",
          audio_setting: {
            sample_rate: 44100,
            bitrate: 256000,
            format: "mp3"
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("MiniMax API error:", result);

      return res.status(response.status).json({
        error:
          result?.base_resp?.status_msg ||
          result?.message ||
          "MiniMax music generation failed."
      });
    }

    if (result?.base_resp?.status_code !== 0) {
      return res.status(500).json({
        error:
          result?.base_resp?.status_msg ||
          "Music generation failed."
      });
    }

    const audioUrl = result?.data?.audio;

    if (!audioUrl) {
      return res.status(500).json({
        error: "MiniMax did not return an audio URL."
      });
    }

    return res.status(200).json({
      success: true,
      audioUrl,
      duration: result?.extra_info?.music_duration || null
    });

  } catch (error) {
    console.error("Music server error:", error);

    return res.status(500).json({
      error: error.message || "Server error."
    });
  }
}
