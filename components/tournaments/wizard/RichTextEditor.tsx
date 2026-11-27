"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered } from "lucide-react";

import { cn } from "@/lib/utils";

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor selection/focus while clicking the toolbar
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center border border-transparent text-on-surface/60 transition-colors hover:border-outline-variant/40 hover:text-on-surface",
        active && "border-primary bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}

function setLink(editor: Editor) {
  const previousUrl = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("URL", previousUrl ?? "");
  if (url === null) return;
  if (url === "") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

// Minimal WYSIWYG editor for the tournament description — bold/italic/lists/link.
// Controlled: `value`/`onChange` carry HTML. `editable` locks the editor and
// hides the toolbar — a `<fieldset disabled>` around this has no effect since
// Tiptap renders a contentEditable div, not a native form control.
export function RichTextEditor({
  value,
  onChange,
  editable = true,
  headings = false,
  minHeight = 160,
}: {
  value: string;
  onChange: (html: string) => void;
  editable?: boolean;
  // Adds section / sub heading buttons (the legal pages).
  headings?: boolean;
  minHeight?: number;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true })],
    content: value,
    editable,
    editorProps: {
      attributes: {
        class:
          "prose-editor px-3 py-2 text-sm text-on-surface focus:outline-none [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:text-primary [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:uppercase " +
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline " +
          "[&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync if `value` is reset externally (e.g. form.reset()).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div className="border border-outline-variant/40 bg-surface-container-lowest">
      {editable ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant/25 p-1.5">
          {headings ? (
            <>
              <ToolbarButton label="Section heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton label="Sub heading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <Heading3 className="h-4 w-4" />
              </ToolbarButton>
            </>
          ) : null}
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Link" active={editor.isActive("link")} onClick={() => setLink(editor)}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>
      ) : null}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
