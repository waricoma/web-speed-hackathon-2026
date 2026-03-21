import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 5;

interface ReturnValues<T> {
  data: Array<T>;
  error: Error | null;
  isLoading: boolean;
  fetchMore: () => void;
}

export function useInfiniteFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T[]>,
): ReturnValues<T> {
  // Check for SSR-provided initial data
  const g = typeof window !== "undefined" ? window : globalThis;
  const ssrKey = `${apiPath}${apiPath.includes("?") ? "&" : "?"}offset=0&limit=${LIMIT}`;
  const ssrInitial = (g as any).__SSR_DATA__?.[ssrKey] as T[] | undefined;

  const internalRef = useRef({ isLoading: false, offset: ssrInitial ? LIMIT : 0 });

  const [result, setResult] = useState<Omit<ReturnValues<T>, "fetchMore">>({
    data: ssrInitial || [],
    error: null,
    isLoading: !ssrInitial,
  });

  const fetchMore = useCallback(() => {
    const { isLoading, offset } = internalRef.current;
    if (isLoading) {
      return;
    }

    setResult((cur) => ({
      ...cur,
      isLoading: true,
    }));
    internalRef.current = {
      isLoading: true,
      offset,
    };

    const separator = apiPath.includes("?") ? "&" : "?";
    const url = `${apiPath}${separator}offset=${offset}&limit=${LIMIT}`;

    void fetcher(url).then(
      (pageData) => {
        setResult((cur) => ({
          ...cur,
          data: [...cur.data, ...pageData],
          isLoading: false,
        }));
        internalRef.current = {
          isLoading: false,
          offset: offset + LIMIT,
        };
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
        internalRef.current = {
          isLoading: false,
          offset,
        };
      },
    );
  }, [apiPath, fetcher]);

  const ssrConsumedRef = useRef(!!ssrInitial);

  useEffect(() => {
    if (ssrConsumedRef.current) {
      ssrConsumedRef.current = false;
      // Clean up consumed SSR data
      if ((g as any).__SSR_DATA__?.[ssrKey]) {
        delete (g as any).__SSR_DATA__[ssrKey];
      }
      return;
    }
    setResult(() => ({
      data: [],
      error: null,
      isLoading: true,
    }));
    internalRef.current = {
      isLoading: false,
      offset: 0,
    };

    fetchMore();
  }, [fetchMore]);

  return {
    ...result,
    fetchMore,
  };
}
