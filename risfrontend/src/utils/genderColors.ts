
export const getGenderColors = (gender?: string) => {
    const g = (gender || "").toLowerCase();
    if (g.startsWith("m")) {
        return {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
            icon: "text-blue-500",
            indicator: "bg-blue-500"
        };
    }
    if (g.startsWith("f") || g.startsWith("w")) {
        return {
            bg: "bg-pink-50",
            text: "text-pink-700",
            border: "border-pink-200",
            icon: "text-pink-500",
            indicator: "bg-pink-500"
        };
    }
    // Other / Unknown
    return {
        bg: "bg-slate-50",
        text: "text-slate-600",
        border: "border-slate-200",
        icon: "text-slate-400",
        indicator: "bg-slate-400"
    };
};
