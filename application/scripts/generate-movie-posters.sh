#!/bin/bash
# Generate poster images (first frame as WebP) for all MP4 movie files
MOVIES_DIR="$(dirname "$0")/../public/movies"

for f in "$MOVIES_DIR"/*.mp4; do
  name="${f%.mp4}"
  poster="${name}.poster.webp"
  if [ ! -f "$poster" ]; then
    ffmpeg -i "$f" -vframes 1 -q:v 80 -vf "scale=320:-1" "$poster" -y 2>/dev/null
    echo "Generated: $(basename "$poster")"
  fi
done
echo "Poster generation complete."
