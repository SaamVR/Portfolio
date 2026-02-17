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
    <div className={cn("transition-opacity duration-300 ease-out", show ? "opacity-100" : "opacity-0")}>
      {children}
    </div>
  );
};

export default PageTransition;
