import { Eye, Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BasicMobileDock({
  onPreview,
  onUndo,
  onRedo,
  onSave,
  disableUndo,
  disableRedo,
  saveLabel,
}: {
  onPreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  disableUndo?: boolean;
  disableRedo?: boolean;
  saveLabel: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 lg:hidden">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <Button type="button" variant="outline" className="min-h-11 flex-1 gap-2" onClick={onPreview}>
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" onClick={onUndo} disabled={disableUndo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" onClick={onRedo} disabled={disableRedo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button type="button" className="min-h-11 flex-1" onClick={onSave}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
