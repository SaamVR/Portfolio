import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    const t = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(t);
  }, [location.pathname]);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        show
          ? "opacity-100 blur-0 scale-100"
          : "opacity-0 blur-[2px] scale-[0.995]"
      )}
    >
      {children}
    </div>
  );
};

export default PageTransition;
