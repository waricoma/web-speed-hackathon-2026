import { lazy, startTransition, Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";

import { AppPage } from "@web-speed-hackathon-2026/client/src/components/application/AppPage";
import { fetchJSON, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

const lazyNamed = <T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T,
) => lazy(() => factory().then((m) => ({ default: m[name] })));

const TimelineContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/TimelineContainer"), "TimelineContainer");
const CrokContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/CrokContainer"), "CrokContainer");
const DirectMessageContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/DirectMessageContainer"), "DirectMessageContainer");
const DirectMessageListContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/DirectMessageListContainer"), "DirectMessageListContainer");
const NotFoundContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/NotFoundContainer"), "NotFoundContainer");
const PostContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/PostContainer"), "PostContainer");
const SearchContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/SearchContainer"), "SearchContainer");
const TermContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/TermContainer"), "TermContainer");
const UserProfileContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/UserProfileContainer"), "UserProfileContainer");
import { AuthModalContainer } from "@web-speed-hackathon-2026/client/src/containers/AuthModalContainer";
const NewPostModalContainer = lazyNamed(() => import("@web-speed-hackathon-2026/client/src/containers/NewPostModalContainer"), "NewPostModalContainer");

const SuspenseFallback = () => (
  <div className="px-4 py-4">
    <div className="h-32 w-full rounded-lg bg-cax-surface-subtle mb-2" />
    <div className="h-32 w-full rounded-lg bg-cax-surface-subtle mb-2" />
    <div className="h-32 w-full rounded-lg bg-cax-surface-subtle" />
  </div>
);

export const AppContainer = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Restore user from sessionStorage for instant render (no network roundtrip)
  const [activeUser, setActiveUser] = useState<Models.User | null>(() => {
    try {
      const cached = sessionStorage.getItem("activeUser");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const loadUser = () => {
      void fetchJSON<Models.User>("/api/v1/me")
        .then((user) => {
          try { sessionStorage.setItem("activeUser", JSON.stringify(user)); } catch {}
          startTransition(() => setActiveUser(user));
        })
        .catch(() => {
          sessionStorage.removeItem("activeUser");
        });
    };

    // Defer auth check on pages that don't require auth to reduce TBT
    const nonAuthPaths = ["/", "/search", "/terms"];
    if (nonAuthPaths.includes(pathname)) {
      const idleCallback = typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 1500);
      idleCallback(loadUser);
    } else {
      loadUser();
    }
  }, []);
  const handleLogout = useCallback(async () => {
    await sendJSON("/api/v1/signout", {});
    sessionStorage.removeItem("activeUser");
    startTransition(() => setActiveUser(null));
    navigate("/");
  }, [navigate]);

  const authModalId = "auth-modal";
  const newPostModalId = "new-post-modal";

  return (
    <>
      <AppPage
        activeUser={activeUser}
        authModalId={authModalId}
        newPostModalId={newPostModalId}
        onLogout={handleLogout}
      >
        <Routes>
          <Route element={<Suspense fallback={<SuspenseFallback />}><TimelineContainer /></Suspense>} path="/" />
          <Route
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <DirectMessageListContainer activeUser={activeUser} authModalId={authModalId} />
              </Suspense>
            }
            path="/dm"
          />
          <Route
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <DirectMessageContainer activeUser={activeUser} authModalId={authModalId} />
              </Suspense>
            }
            path="/dm/:conversationId"
          />
          <Route element={<Suspense fallback={<SuspenseFallback />}><SearchContainer /></Suspense>} path="/search" />
          <Route element={<Suspense fallback={<SuspenseFallback />}><UserProfileContainer /></Suspense>} path="/users/:username" />
          <Route element={<Suspense fallback={<SuspenseFallback />}><PostContainer /></Suspense>} path="/posts/:postId" />
          <Route element={<Suspense fallback={<SuspenseFallback />}><TermContainer /></Suspense>} path="/terms" />
          <Route
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <CrokContainer activeUser={activeUser} authModalId={authModalId} />
              </Suspense>
            }
            path="/crok"
          />
          <Route element={<Suspense fallback={null}><NotFoundContainer /></Suspense>} path="*" />
        </Routes>
      </AppPage>

      <AuthModalContainer id={authModalId} onUpdateActiveUser={setActiveUser} />
      <Suspense fallback={null}>
        <NewPostModalContainer id={newPostModalId} />
      </Suspense>
    </>
  );
};
