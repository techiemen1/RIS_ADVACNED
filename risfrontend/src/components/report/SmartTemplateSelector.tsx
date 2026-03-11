import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../services/axiosInstance";
import { ChevronDown, FileText, Loader2, Search } from "lucide-react";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "../ui/dropdown-menu";

type Template = {
    id: number;
    name: string;
    content: string;
    modality?: string;
    body_part?: string;
    gender?: string;
};

interface SmartTemplateSelectorProps {
    modality?: string;
    bodyPart?: string;
    gender?: string;
    onSelect: (content: string) => void;
}

export function SmartTemplateSelector({
    modality,
    bodyPart,
    gender,
    onSelect,
}: SmartTemplateSelectorProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            // Build query params with sanitization
            const params = new URLSearchParams();

            const clean = (val?: string) => {
                if (!val) return null;
                const v = val.trim();
                if (v === "" || v === "—" || v.toLowerCase() === "pending" || v === " ") return null;
                return v;
            };

            const m = clean(modality);
            const b = clean(bodyPart);
            const g = clean(gender);

            if (m) params.append('modality', m);
            if (b) params.append('bodyPart', b);
            if (g) params.append('gender', g);

            console.log("Fetching templates with:", params.toString());
            const r = await axiosInstance.get(`/report-templates/match?${params.toString()}`);

            if (r.data?.success && r.data.data.length > 0) {
                setTemplates(r.data.data);
            } else {
                console.log("⚠️ [Template Match] No specific matches, falling back to all templates...");
                const allRes = await axiosInstance.get(`/report-templates/match`); // No params = all
                setTemplates(allRes.data?.data || []);
            }
        } catch (err) {
            console.error(err);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, [modality, bodyPart, gender]);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        }
    }, [isOpen, fetchTemplates]);

    const filtered = templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    // Auto-suggestion logic: Backend already sorts by relevance!
    // But we can visually separate the top match if it's highly specific
    // Top 3 are "Suggested"
    const suggested = filtered.slice(0, 3);
    const others = filtered.slice(3);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-dashed border-blue-300 bg-blue-50/50 text-blue-700 hover:bg-blue-100 h-9">
                    <FileText className="w-4 h-4" />
                    <span>Templates</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[320px] p-0" align="start">
                <div className="p-2 border-b bg-gray-50 flex items-center gap-2 sticky top-0">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        placeholder="Search templates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="max-h-[300px] overflow-y-auto py-1">
                    {loading ? (
                        <div className="p-4 flex justify-center text-gray-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-xs">
                            No templates found
                        </div>
                    ) : (
                        <>
                            {suggested.length > 0 && (
                                <>
                                    <DropdownMenuLabel className="text-xs text-blue-600 px-2 py-1 bg-blue-50/30">
                                        Suggested Matches
                                    </DropdownMenuLabel>
                                    {suggested.map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => onSelect(t.content)} className="cursor-pointer gap-2">
                                            <span className="flex-1 truncate">{t.name}</span>
                                            <div className="flex gap-1">
                                                {t.modality && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{t.modality}</span>}
                                                {t.gender && <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded">{t.gender}</span>}
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                </>
                            )}

                            {others.length > 0 && (
                                <>
                                    <DropdownMenuLabel className="text-xs text-gray-500 px-2 py-1">
                                        Other Templates
                                    </DropdownMenuLabel>
                                    {others.map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => onSelect(t.content)} className="cursor-pointer gap-2">
                                            <span className="flex-1 truncate">{t.name}</span>
                                            {t.modality && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{t.modality}</span>}
                                        </DropdownMenuItem>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
