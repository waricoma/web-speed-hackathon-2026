import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Modal } from "@web-speed-hackathon-2026/client/src/components/modal/Modal";
import { NewPostModalPage } from "@web-speed-hackathon-2026/client/src/components/new_post_modal/NewPostModalPage";
import { fetchJSON, sendFile, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

// Prefetch post detail data so the next page loads instantly after navigation
function prefetchPostDetail(postId: string): void {
  const url = `/api/v1/posts/${postId}`;
  const g = window as any;
  g.__PREFETCH__ = g.__PREFETCH__ || {};
  g.__PREFETCH__[url] = fetchJSON(url);
}

interface SubmitParams {
  images: File[];
  movie: File | undefined;
  sound: File | undefined;
  text: string;
}

interface Props {
  id: string;
}

export const NewPostModalContainer = ({ id }: Props) => {
  const dialogId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element == null) {
      return;
    }

    const handleToggle = () => {
      setResetKey((key) => key + 1);
      setIsLoading(false);
      setHasError(false);
    };
    element.addEventListener("toggle", handleToggle);
    return () => {
      element.removeEventListener("toggle", handleToggle);
    };
  }, []);

  const navigate = useNavigate();

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetError = useCallback(() => {
    setHasError(false);
  }, []);

  const handleSubmit = useCallback(
    async (params: SubmitParams) => {
      try {
        setIsLoading(true);
        ref.current?.close();

        // Upload files to get IDs/metadata (required for post creation)
        // These run sequentially but each is fast (image: ~70ms, sound: ~85ms)
        // Video ffmpeg takes ~1.3s but we accept this
        const uploadedImages = await Promise.all(
          (params.images || []).map((image) => sendFile("/api/v1/images", image)),
        );
        const uploadedMovie = params.movie
          ? await sendFile("/api/v1/movies", params.movie)
          : undefined;
        const uploadedSound = params.sound
          ? await sendFile("/api/v1/sounds", params.sound)
          : undefined;

        // Create post and navigate immediately
        const post = await sendJSON<Models.Post>("/api/v1/posts", {
          images: uploadedImages,
          movie: uploadedMovie,
          sound: uploadedSound,
          text: params.text,
        });

        // Start prefetching the post detail data before navigating
        prefetchPostDetail(post.id);
        setIsLoading(false);
        navigate(`/posts/${post.id}`);
      } catch {
        setHasError(true);
        setIsLoading(false);
      }
    },
    [navigate],
  );

  return (
    <Modal aria-labelledby={dialogId} id={id} ref={ref} closedby="any">
      <NewPostModalPage
        key={resetKey}
        id={dialogId}
        hasError={hasError}
        isLoading={isLoading}
        onResetError={handleResetError}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};
