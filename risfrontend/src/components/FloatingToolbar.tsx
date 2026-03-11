// src/components/FloatingToolbar.tsx
import React from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Mic, Sparkles } from "lucide-react";

export default function FloatingToolbar({ onDictate, onAI }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="fixed right-6 bottom-10 z-50">
      <div className="bg-white p-2 rounded-2xl shadow-lg flex flex-col gap-2">
        <Button onClick={onDictate} variant="ghost"><Mic className="w-4 h-4" /></Button>
        <Button onClick={onAI} variant="secondary"><Sparkles className="w-4 h-4" /></Button>
      </div>
    </motion.div>
  );
}
