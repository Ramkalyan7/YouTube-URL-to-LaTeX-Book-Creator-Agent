from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import re
import yt_dlp



def extract_video_id(url: str) -> str | None:
    """Extract the YouTube video ID from various URL formats."""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_video_duration_seconds(url):
    ydl_opts = {"quiet": True}
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return info.get("duration", 0)



MAX_DURATION_SECONDS = 15 * 60  # 15 minutes


def get_transcript(url: str) -> dict:
    """
    Tool: Fetch the transcript of a YouTube video.

    Returns a dict with:
      - success (bool)
      - transcript (str)  — joined plain text, only on success
      - error (str)       — human-readable reason, only on failure
    """
    # 1. extract ID
    video_id = extract_video_id(url)
    if not video_id:
        return {"success": False, "error": "Invalid YouTube URL. Could not extract video ID."}

    # 2. Check duration BEFORE fetching transcript
    print(url)
    try:
        duration = get_video_duration_seconds(url)
    except Exception as e:
        return {"success": False, "error": f"Could not fetch video metadata: {e}"}

    if duration > MAX_DURATION_SECONDS:
        minutes = duration // 60
        return {
            "success": False,
            "error": (
                f"Video is {minutes} minutes long. "
                f"Only videos up to 15 minutes are supported."
            ),
        }

    # 3. Fetch transcript
    try:
        transcript = YouTubeTranscriptApi().fetch(video_id)
        transcript_text = " ".join(snippet.text for snippet in transcript.snippets)
        return {"success": True, "transcript": transcript_text}

    except TranscriptsDisabled:
        return {"success": False, "error": "Transcripts are disabled for this video."}
    except NoTranscriptFound:
        return {"success": False, "error": "No transcript found for this video."}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error fetching transcript: {e}"}