// src/utils/modalityColors.ts

export const MODALITY_COLORS = {
    CT: {
        border: "border-teal-500",
        bg: "bg-teal-50",
        text: "text-teal-900",
        pill: "bg-teal-100/80 text-teal-800",
        shadow: "shadow-teal-500/20",
        gradient: "from-teal-600 to-teal-400",
        icon: "text-teal-500"
    },
    MR: {
        border: "border-violet-500",
        bg: "bg-violet-50",
        text: "text-violet-900",
        pill: "bg-violet-100/80 text-violet-800",
        shadow: "shadow-violet-500/20",
        gradient: "from-violet-600 to-violet-400",
        icon: "text-violet-500"
    },
    MRI: { // Alias for MR
        border: "border-violet-500",
        bg: "bg-violet-50",
        text: "text-violet-900",
        pill: "bg-violet-100/80 text-violet-800",
        shadow: "shadow-violet-500/20",
        gradient: "from-violet-600 to-violet-400",
        icon: "text-violet-500"
    },
    "X-RAY": {
        border: "border-sky-500",
        bg: "bg-sky-50",
        text: "text-sky-900",
        pill: "bg-sky-100/80 text-sky-800",
        shadow: "shadow-sky-500/20",
        gradient: "from-sky-600 to-sky-400",
        icon: "text-sky-500"
    },
    XR: { // Alias for X-RAY
        border: "border-sky-500",
        bg: "bg-sky-50",
        text: "text-sky-900",
        pill: "bg-sky-100/80 text-sky-800",
        shadow: "shadow-sky-500/20",
        gradient: "from-sky-600 to-sky-400",
        icon: "text-sky-500"
    },
    CR: { // Alias for X-RAY
        border: "border-sky-500",
        bg: "bg-sky-50",
        text: "text-sky-900",
        pill: "bg-sky-100/80 text-sky-800",
        shadow: "shadow-sky-500/20",
        gradient: "from-sky-600 to-sky-400",
        icon: "text-sky-500"
    },
    DX: { // Alias for X-RAY
        border: "border-sky-500",
        bg: "bg-sky-50",
        text: "text-sky-900",
        pill: "bg-sky-100/80 text-sky-800",
        shadow: "shadow-sky-500/20",
        gradient: "from-sky-600 to-sky-400",
        icon: "text-sky-500"
    },
    USG: {
        border: "border-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-900",
        pill: "bg-emerald-100/80 text-emerald-800",
        shadow: "shadow-emerald-500/20",
        gradient: "from-emerald-600 to-emerald-400",
        icon: "text-emerald-500"
    },
    ULTRASOUND: { // Alias
        border: "border-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-900",
        pill: "bg-emerald-100/80 text-emerald-800",
        shadow: "shadow-emerald-500/20",
        gradient: "from-emerald-600 to-emerald-400",
        icon: "text-emerald-500"
    },
    US: { // Alias for Ultrasound
        border: "border-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-900",
        pill: "bg-emerald-100/80 text-emerald-800",
        shadow: "shadow-emerald-500/20",
        gradient: "from-emerald-600 to-emerald-400",
        icon: "text-emerald-500"
    },
    MAMMO: {
        border: "border-pink-500",
        bg: "bg-pink-50",
        text: "text-pink-900",
        pill: "bg-pink-100/80 text-pink-800",
        shadow: "shadow-pink-500/20",
        gradient: "from-pink-600 to-pink-400",
        icon: "text-pink-500"
    },
    MG: { // Alias
        border: "border-pink-500",
        bg: "bg-pink-50",
        text: "text-pink-900",
        pill: "bg-pink-100/80 text-pink-800",
        shadow: "shadow-pink-500/20",
        gradient: "from-pink-600 to-pink-400",
        icon: "text-pink-500"
    },
    DEFAULT: {
        border: "border-slate-400",
        bg: "bg-slate-50",
        text: "text-slate-800",
        pill: "bg-slate-100 text-slate-600",
        shadow: "shadow-slate-500/10",
        gradient: "from-slate-600 to-slate-400",
        icon: "text-slate-400"
    }
};

export function getModalityColors(modality: string | undefined) {
    if (!modality) return MODALITY_COLORS.DEFAULT;
    const key = modality.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // Direct match or partial check if needed, but direct map is safer
    // @ts-ignore
    return MODALITY_COLORS[key] || MODALITY_COLORS.DEFAULT;
}
