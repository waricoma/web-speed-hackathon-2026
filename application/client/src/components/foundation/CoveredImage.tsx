import { MouseEvent, useCallback, useId, useState } from "react";

import { Button } from "@web-speed-hackathon-2026/client/src/components/foundation/Button";
import { Modal } from "@web-speed-hackathon-2026/client/src/components/modal/Modal";

interface Props {
  src: string;
  alt?: string;
  priority?: boolean;
}

export const CoveredImage = ({ src, alt = "", priority = false }: Props) => {
  const dialogId = useId();
  const [showModal, setShowModal] = useState(false);

  const handleDialogClick = useCallback((ev: MouseEvent<HTMLDialogElement>) => {
    ev.stopPropagation();
  }, []);

  const handleShowModal = useCallback(() => {
    setShowModal(true);
    // Wait for next frame so the dialog element is in DOM before calling showModal
    requestAnimationFrame(() => {
      (document.getElementById(dialogId) as HTMLDialogElement | null)?.showModal();
    });
  }, [dialogId]);

  const handleClose = useCallback(() => {
    (document.getElementById(dialogId) as HTMLDialogElement | null)?.close();
  }, [dialogId]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        alt={alt}
        className="absolute left-1/2 top-1/2 h-full w-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        src={`${src}?w=640`}
      />

      <button
        className="border-cax-border bg-cax-surface-raised/90 text-cax-text-muted hover:bg-cax-surface absolute right-1 bottom-1 rounded-full border px-2 py-1 text-center text-xs"
        type="button"
        onClick={handleShowModal}
      >
        ALT を表示する
      </button>

      {showModal && (
        <Modal id={dialogId} closedby="any" onClick={handleDialogClick}>
          <div className="grid gap-y-6">
            <h1 className="text-center text-2xl font-bold">画像の説明</h1>

            <p className="text-sm">{alt}</p>

            <Button variant="secondary" onClick={handleClose}>
              閉じる
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
