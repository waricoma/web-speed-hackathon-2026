export function getImagePath(imageId: string): string {
  return `/images/${imageId}.jpg`;
}

export function getMoviePath(movieId: string): string {
  return `/movies/${movieId}.mp4`;
}

export function getMoviePosterPath(movieId: string): string {
  return `/movies/${movieId}.poster.webp`;
}

export function getSoundPath(soundId: string): string {
  return `/sounds/${soundId}`;
}

export function getProfileImagePath(profileImageId: string): string {
  return `/images/profiles/${profileImageId}.jpg`;
}
