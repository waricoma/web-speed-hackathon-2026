import { useLocation } from "react-router";
import { useMemo } from "react";

export function useSearchParams(): [URLSearchParams] {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  return [searchParams];
}
