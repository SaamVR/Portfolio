"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { parseLegacyStringToDoc } from "@/lib/cms/rich-text-adapter";
import type { RichTextDoc } from "@/lib/cms/schema";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Undo, Redo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function TiptapRichTextEditor({
  value,
  onChange,
}: {
  value: RichTextDoc | string | undefined;
  onChange: (doc: RichTextDoc) => void;
}) {
  const initialContent = typeof value === "string" ? parseLegacyStringToDoc(value) : value || { type: "doc", content: [] };

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as RichTextDoc;
      onChange(json);
    },
  });

  useEffect(() => {
    if (editor && value) {
      const currentJson = editor.getJSON();
      const nextJson = typeof value === "string" ? parseLegacyStringToDoc(value) : value;
      if (JSON.stringify(currentJson) !== JSON.stringify(nextJson)) {
        editor.commands.setContent(nextJson);
      }
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="h-32 border border-input rounded-md bg-muted/20 animate-pulse" />;
  }

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-1.5 text-muted-foreground">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-accent text-accent-foreground" : ""}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-accent text-accent-foreground" : ""}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "bg-accent text-accent-foreground" : ""}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "bg-accent text-accent-foreground" : ""}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-accent text-accent-foreground" : ""}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "bg-accent text-accent-foreground" : ""}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-3 min-h-[120px] prose prose-sm max-w-none focus:outline-none text-foreground">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
