// src/components/report/RichTextEditor.tsx
import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Heading from "@tiptap/extension-heading";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";

type Props = {
  initialContent?: string;
  onChange?: (html: string) => void;
};

export default function RichTextEditor({ initialContent = "", onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Heading.configure({ levels: [2, 3] }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange && onChange(editor.getHTML());
    },
  });

  // listen for template insert events
  useEffect(() => {
    const handler = (e: any) => {
      const html = e?.detail?.html;
      if (html && editor) {
        editor.chain().focus().insertContent(html).run();
      }
    };
    window.addEventListener("insert-template-html", handler);
    return () => window.removeEventListener("insert-template-html", handler);
  }, [editor]);

  return (
    <div className="border rounded bg-white min-h-[420px] p-3">
      {/* minimal toolbar */}
      <div className="flex gap-2 mb-2">
        <button onClick={() => editor?.chain().focus().toggleBold().run()} className="px-2 py-1 border rounded">B</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="px-2 py-1 border rounded">I</button>
        <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className="px-2 py-1 border rounded">U</button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="px-2 py-1 border rounded">•</button>
        <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="px-2 py-1 border rounded">1.</button>
        <button onClick={() => editor?.chain().focus().undo().run()} className="px-2 py-1 border rounded">Undo</button>
        <button onClick={() => editor?.chain().focus().redo().run()} className="px-2 py-1 border rounded">Redo</button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

