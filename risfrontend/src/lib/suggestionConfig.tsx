
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { CommandList } from '../components/report/CommandList'
import { FileText, Type, CheckSquare, Heading1, Heading2 } from 'lucide-react'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'

// Hardcoded for Phase 1 - In Phase 2 this will fetch from API
const COMMANDS = [
    {
        title: 'Heading 1',
        subtitle: 'Big section header',
        icon: <Heading1 className="w-3 h-3 text-slate-600" />,
        modality: null,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
        },
    },
    {
        title: 'Heading 2',
        subtitle: 'Medium section header',
        icon: <Heading2 className="w-3 h-3 text-slate-600" />,
        modality: null,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
        },
    },
    {
        title: 'Normal Chest X-Ray',
        subtitle: 'Standard normal template',
        icon: <FileText className="w-3 h-3 text-blue-600" />,
        modality: 'XR',
        command: ({ editor, range }: any) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent('<h2>Findings</h2><p>Lungs are clear. Heart size is normal. No pleural effusion or pneumothorax.</p><h2>Impression</h2><p>Normal Chest X-Ray.</p>')
                .run()
        },
    },
    {
        title: 'Normal Brain CT',
        subtitle: 'Standard normal template',
        icon: <FileText className="w-3 h-3 text-violet-600" />,
        modality: 'CT',
        command: ({ editor, range }: any) => {
            editor
                .chain()
                .focus()
                .deleteRange(range)
                .insertContent('<h2>Findings</h2><p>Normal gray-white matter differentiation. No hemorrhage or mass effect.</p><h2>Impression</h2><p>Normal Brain CT.</p>')
                .run()
        },
    },
    {
        title: 'Bullet List',
        subtitle: 'Create a simple list',
        icon: <Type className="w-3 h-3 text-slate-600" />,
        modality: null,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run()
        },
    },
    {
        title: 'Task List',
        subtitle: 'Track actionable items',
        icon: <CheckSquare className="w-3 h-3 text-emerald-600" />,
        modality: null,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run()
        },
    },
]

const suggestionConfig = {
    items: ({ query, editor }: { query: string, editor: any }) => {
        const currentModality = (editor.options.editorProps.attributes?.['data-modality'] || "").toUpperCase();

        return COMMANDS
            .filter(item => {
                const matchesQuery = item.title.toLowerCase().startsWith(query.toLowerCase());
                const matchesModality = !item.modality || currentModality.includes(item.modality);
                return matchesQuery && matchesModality;
            })
            .slice(0, 10);
    },

    render: () => {
        let component: ReactRenderer
        let popup: any

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor,
                })

                if (!props.clientRect) {
                    return
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                })
            },

            onUpdate(props: any) {
                component.updateProps(props)

                if (!props.clientRect) {
                    return
                }

                popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                })
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup[0].hide()
                    return true
                }

                return (component.ref as any).onKeyDown(props)
            },

            onExit() {
                popup[0].destroy()
                component.destroy()
            },
        }
    },
}

export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...suggestionConfig,
            }),
        ]
    },
})
