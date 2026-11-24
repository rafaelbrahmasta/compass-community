import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
} from 'lucide-react'
import { useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-gold underline hover:text-gold-light',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-h-96 mx-auto my-4',
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[160px] p-4 focus:outline-none text-white/90 text-sm leading-relaxed',
        placeholder: placeholder || 'Tulis konten berita di sini...',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sinkronisasi jika value berubah dari luar (misal saat edit berita dibuka)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Masukkan URL:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="border border-white/20 rounded-xl overflow-hidden bg-[#060a08] focus-within:border-gold transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-white/5 border-b border-white/10 text-white/70">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('bold') ? 'text-gold bg-white/10' : ''
          }`}
          title="Tebal (Ctrl+B)"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('italic') ? 'text-gold bg-white/10' : ''
          }`}
          title="Miring (Ctrl+I)"
        >
          <Italic size={15} />
        </button>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'text-gold bg-white/10' : ''
          }`}
          title="Heading 2"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'text-gold bg-white/10' : ''
          }`}
          title="Heading 3"
        >
          <Heading3 size={15} />
        </button>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('bulletList') ? 'text-gold bg-white/10' : ''
          }`}
          title="Daftar Poin"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('orderedList') ? 'text-gold bg-white/10' : ''
          }`}
          title="Daftar Angka"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('blockquote') ? 'text-gold bg-white/10' : ''
          }`}
          title="Kutipan"
        >
          <Quote size={15} />
        </button>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          type="button"
          onClick={setLink}
          className={`p-1.5 rounded hover:bg-white/10 transition-colors ${
            editor.isActive('link') ? 'text-gold bg-white/10' : ''
          }`}
          title="Tautan Link"
        >
          <LinkIcon size={15} />
        </button>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30"
          title="Urungkan (Ctrl+Z)"
        >
          <Undo size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-30"
          title="Ulangi (Ctrl+Y)"
        >
          <Redo size={15} />
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  )
}
