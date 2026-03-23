#!/usr/bin/env python3
import sys, json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video ID provided"})); sys.exit(1)

    video_id = sys.argv[1].strip()

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        print(json.dumps({"error": "Run: pip install youtube-transcript-api"})); sys.exit(1)

    # Handle old (0.6.1) vs new (1.2.x) API versions
    try:
        if hasattr(YouTubeTranscriptApi, 'list_transcripts'):
            api_list = YouTubeTranscriptApi.list_transcripts
            api_fetch = YouTubeTranscriptApi.get_transcript
        else:
            ytt_api = YouTubeTranscriptApi()
            api_list = ytt_api.list
            api_fetch = ytt_api.fetch
    except Exception as e:
        print(json.dumps({"error": "API initialization failed: " + str(e)})); sys.exit(1)

    transcript = None
    last_error = ""

    try:
        tl = api_list(video_id)
        # Iterate over all available transcripts (manual or generated) and fetch the first successful one
        for t in tl:
            try:
                fetched = t.fetch()
                if fetched:
                    transcript = list(fetched)
                    break 
            except Exception:
                continue
    except Exception as e:
        last_error = str(e)

    # Strategy fallback: if listing fails, try old get_transcript
    if not transcript:
        try:
            transcript = list(api_fetch(video_id))
        except Exception as e:
            if not last_error:
                last_error = str(e)

    if not transcript:
        print(json.dumps({"error": "No transcripts found. " + last_error[:200]}))
        sys.exit(1)

    # Extract text - handle both dict and object formats
    texts = []
    for entry in transcript:
        try:
            if isinstance(entry, dict):
                t_str = entry.get('text', '')
            else:
                t_str = str(entry.text) if hasattr(entry, 'text') else str(entry)
            t_str = t_str.replace('\n', ' ').strip()
            if t_str: texts.append(t_str)
        except: pass

    text = ' '.join(' '.join(texts).split())

    if len(text) < 30:
        print(json.dumps({"error": "Transcript too short or empty."})); sys.exit(1)

    print(json.dumps({
        "text"     : text,
        "segments" : len(transcript),
        "wordCount": len(text.split()),
        "language" : "auto"
    }))

if __name__ == '__main__':
    main()