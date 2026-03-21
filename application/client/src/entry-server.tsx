import "./index.css";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { Suspense } from "react";

import { AppPage } from "@web-speed-hackathon-2026/client/src/components/application/AppPage";
import { AuthModalContainer } from "@web-speed-hackathon-2026/client/src/containers/AuthModalContainer";
import { CrokContainer } from "@web-speed-hackathon-2026/client/src/containers/CrokContainer";
import { DirectMessageContainer } from "@web-speed-hackathon-2026/client/src/containers/DirectMessageContainer";
import { DirectMessageListContainer } from "@web-speed-hackathon-2026/client/src/containers/DirectMessageListContainer";

import { NotFoundContainer } from "@web-speed-hackathon-2026/client/src/containers/NotFoundContainer";
import { PostContainer } from "@web-speed-hackathon-2026/client/src/containers/PostContainer";
import { SearchContainer } from "@web-speed-hackathon-2026/client/src/containers/SearchContainer";
import { TermContainer } from "@web-speed-hackathon-2026/client/src/containers/TermContainer";
import { TimelineContainer } from "@web-speed-hackathon-2026/client/src/containers/TimelineContainer";
import { UserProfileContainer } from "@web-speed-hackathon-2026/client/src/containers/UserProfileContainer";

import { Route, Routes } from "react-router";

const SuspenseFallback = () => (
  <div className="px-4 py-4">
    <div className="h-32 w-full rounded-lg bg-cax-surface-subtle mb-2" />
    <div className="h-32 w-full rounded-lg bg-cax-surface-subtle mb-2" />
    <div className="h-32 w-full rounded-lg bg-cax-surface-subtle" />
  </div>
);

function SSRApp({ url }: { url: string }) {
  return (
    <StaticRouter location={url}>
      <AppPage
        activeUser={null}
        authModalId="auth-modal"
        newPostModalId="new-post-modal"
        onLogout={() => {}}
      >
        <Routes>
          <Route element={<TimelineContainer />} path="/" />
          <Route
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <DirectMessageListContainer activeUser={null} authModalId="auth-modal" />
              </Suspense>
            }
            path="/dm"
          />
          <Route
            element={
              <Suspense fallback={<SuspenseFallback />}>
                <DirectMessageContainer activeUser={null} authModalId="auth-modal" />
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
                <CrokContainer activeUser={null} authModalId="auth-modal" />
              </Suspense>
            }
            path="/crok"
          />
          <Route element={<Suspense fallback={null}><NotFoundContainer /></Suspense>} path="*" />
        </Routes>
      </AppPage>

      <AuthModalContainer id="auth-modal" onUpdateActiveUser={() => {}} />
    </StaticRouter>
  );
}

export function render(url: string, ssrData: Record<string, unknown>) {
  (globalThis as any).__SSR_DATA__ = ssrData;

  try {
    const html = renderToString(<SSRApp url={url} />);
    return { html };
  } finally {
    delete (globalThis as any).__SSR_DATA__;
  }
}
