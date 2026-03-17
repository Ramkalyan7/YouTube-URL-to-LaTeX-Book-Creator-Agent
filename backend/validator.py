import re
import yt_dlp

YOUTUBE_PATTERNS = [
    r"^https?://(www\.)?youtube\.com/watch\?.*v=[0-9A-Za-z_-]{11}",
    r"^https?://youtu\.be/[0-9A-Za-z_-]{11}",
    r"^https?://(www\.)?youtube\.com/embed/[0-9A-Za-z_-]{11}",
]

MAX_DURATION_SECONDS = 15 * 60


class ValidationError(Exception):
    """Clean user-facing validation error."""
    pass


def validate_youtube_url(url: str) -> str:
    """
    Validates URL format, reachability, and duration.
    Returns the clean URL on success.
    Raises ValidationError with a user-friendly message on failure.
    """
    if not url or not url.strip():
        raise ValidationError("URL cannot be empty.")

    url = url.strip()

    # 1. Format check
    if not any(re.match(p, url) for p in YOUTUBE_PATTERNS):
        raise ValidationError(
            "Invalid YouTube URL. Accepted formats:\n"
            "  https://www.youtube.com/watch?v=...\n"
            "  https://youtu.be/...\n"
        )

    # 2. Fetch metadata — catches private/deleted/unavailable videos
    try:
        ydl_opts = {"quiet": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e).lower()
        if "private" in error_msg:
            raise ValidationError("This video is private and cannot be accessed.")
        if "unavailable" in error_msg or "removed" in error_msg:
            raise ValidationError("This video is unavailable or has been removed.")
        if "live" in error_msg:
            raise ValidationError("Live streams are not supported.")
        raise ValidationError(f"Could not access video: {e}")
    except Exception as e:
        raise ValidationError(f"Could not reach YouTube: {e}")

    # 3. Live stream check
    if info.get("is_live"):
        raise ValidationError("Live streams are not supported.")

    # 4. Duration check
    duration = info.get("duration", 0)
    if duration == 0:
        raise ValidationError("Could not determine video duration.")
    if duration > MAX_DURATION_SECONDS:
        minutes = duration // 60
        seconds = duration % 60
        raise ValidationError(
            f"Video is {minutes}m {seconds}s long. "
            f"Maximum allowed duration is 15 minutes."
        )

    return url