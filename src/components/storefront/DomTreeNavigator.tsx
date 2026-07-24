import { StorePage, StorePageBlock } from "@/lib/cms/schema";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DomTreeNavigator({
  page,
  selectedBlockId,
  onSelectBlock,
  onMoveBlock,
  onToggleVisibility,
  onRemoveBlock,
}: {
  page: StorePage;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 1 | -1) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onRemoveBlock: (id: string) => void;
}) {
  const sortedBlocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="pointer-events-none fixed left-2 top-1/2 z-50 flex -translate-y-1/2 sm:left-4 hidden lg:flex">
      <div className="pointer-events-auto flex w-64 flex-col rounded-[1.5rem] border border-border bg-background/95 p-3 shadow-lg backdrop-blur h-[min(600px,calc(100vh-2rem))]">
        <div className="mb-4 px-2">
          <p className="text-sm font-semibold">Navigator</p>
          <p className="text-xs text-muted-foreground">{page.slug === "home" ? "Homepage" : page.slug}</p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sortedBlocks.map((block, index) => (
            <div
              key={block.id}
              className={cn(
                "group flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                selectedBlockId === block.id ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground",
                !block.isVisible && "opacity-50"
              )}
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left truncate"
                onClick={() => onSelectBlock(block.id)}
              >
                <span className="truncate">{block.type}</span>
              </button>
              <div className="flex items-center gap-0.5 opacity-0 focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={() => onMoveBlock(block.id, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={() => onMoveBlock(block.id, 1)}
                  disabled={index === sortedBlocks.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md"
                  onClick={() => onToggleVisibility(block.id, !block.isVisible)}
                >
                  {block.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveBlock(block.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
