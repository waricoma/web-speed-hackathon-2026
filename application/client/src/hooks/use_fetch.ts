import { useEffect, useRef, useState } from "react";

interface ReturnValues<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function useFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T>,
): ReturnValues<T> {
  const g = typeof window !== "undefined" ? window : globalThis;
  const ssrData = (g as any).__SSR_DATA__?.[apiPath] as T | undefined;

  const [result, setResult] = useState<ReturnValues<T>>({
    data: ssrData ?? null,
    error: null,
    isLoading: ssrData === undefined,
  });

  const ssrConsumedRef = useRef(ssrData !== undefined);

  useEffect(() => {
    if (ssrConsumedRef.current) {
      ssrConsumedRef.current = false;
      if ((g as any).__SSR_DATA__?.[apiPath]) {
        delete (g as any).__SSR_DATA__[apiPath];
      }
      return;
    }
    setResult(() => ({
      data: null,
      error: null,
      isLoading: true,
    }));

    void fetcher(apiPath).then(
      (data) => {
        setResult((cur) => ({
          ...cur,
          data,
          isLoading: false,
        }));
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
      },
    );
  }, [apiPath, fetcher]);

  return result;
}
