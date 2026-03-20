import { ReactNode, useLayoutEffect, useRef, useState } from "react";

interface Props {
  aspectHeight: number;
  aspectWidth: number;
  children: ReactNode;
}

export const AspectRatioBox = ({ aspectHeight, aspectWidth, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [clientHeight, setClientHeight] = useState(0);

  useLayoutEffect(() => {
    function calcStyle() {
      const clientWidth = ref.current?.clientWidth ?? 0;
      setClientHeight((clientWidth / aspectWidth) * aspectHeight);
    }
    calcStyle();

    const observer = new ResizeObserver(() => calcStyle());
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [aspectHeight, aspectWidth]);

  return (
    <div ref={ref} className="relative h-1 w-full" style={{ height: clientHeight }}>
      {clientHeight !== 0 ? <div className="absolute inset-0">{children}</div> : null}
    </div>
  );
};
