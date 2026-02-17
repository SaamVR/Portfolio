import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

type AnimationVariant = "fade" | "blur" | "slide-left" | "slide-right";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: AnimationVariant;
}

const variantStyles: Record<AnimationVariant, { hidden: string; visible: string }> = {
  fade: {
    hidden: "opacity-0 translate-y-8",
    visible: "opacity-100 translate-y-0",
  },
  blur: {
    hidden: "opacity-0 blur-sm translate-y-4 scale-[0.98]",
    visible: "opacity-100 blur-0 translate-y-0 scale-100",
  },
  "slide-left": {
    hidden: "opacity-0 -translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
  "slide-right": {
    hidden: "opacity-0 translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
};

const AnimatedSection = ({ children, className, delay = 0, animation = "fade" }: AnimatedSectionProps) => {
  const { ref, isVisible } = useScrollReveal();
  const variant = variantStyles[animation];

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isVisible ? variant.visible : variant.hidden,
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
