import React from "react";
import { ImagePlus, X } from "lucide-react";

export type KeyImage = {
  id: string;
  file_path: string;
};

interface KeyImagesPanelProps {
  images: KeyImage[];
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  onInsertToReport: (img: KeyImage) => void;
  compact?: boolean;
}

export function KeyImagesPanel({
  images,
  onUpload,
  onRemove,
  onInsertToReport,
  compact = false
}: KeyImagesPanelProps) {
  if (compact) {
    return (
      <div className="flex flex-col gap-3 h-full">
        <label className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 text-slate-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer text-xs font-bold uppercase gap-2">
          <ImagePlus className="w-4 h-4" />
          <span>Upload</span>
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) onUpload(e.target.files[0]);
            }}
          />
        </label>

        <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
          {images.length === 0 ? (
            <div className="text-center text-slate-400 text-xs italic py-4 col-span-2">
              No images yet.
            </div>
          ) : (
            images.map((img) => (
              <div
                key={img.id}
                className="group relative w-full aspect-square shrink-0 rounded border border-gray-300 bg-white shadow-sm overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                title="Click to insert into report"
                onClick={() => onInsertToReport(img)}
              >
                <img
                  src={`/api/uploads/keyimages/${img.file_path}`}
                  alt="Key"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(img.id);
                  }}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Legacy Horizontal Mode (Keep as fallback)
  return (
    <div className="h-40 border-t bg-gray-100 flex flex-col shrink-0">
      <div className="h-8 flex items-center justify-between px-4 bg-gray-200 border-b">
        <span className="text-xs font-bold uppercase text-gray-600 tracking-wider">
          Key Images ({images.length})
        </span>
        <label className="cursor-pointer text-xs flex items-center hover:text-blue-600 transition-colors">
          <ImagePlus className="w-3 h-3 mr-1" />
          Add Image
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) onUpload(e.target.files[0]);
            }}
          />
        </label>
      </div>

      <div className="flex-1 overflow-x-auto p-3 flex gap-3 items-center">
        {images.length === 0 ? (
          <div className="w-full text-center text-gray-400 text-sm italic">
            No key images selected. Drag & drop or click "Add Image".
          </div>
        ) : (
          images.map((img) => (
            <div
              key={img.id}
              className="group relative h-24 w-24 shrink-0 rounded border border-gray-300 bg-white shadow-sm overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
              title="Click to insert into report"
              onClick={() => onInsertToReport(img)}
            >
              <img
                src={`/api/uploads/keyimages/${img.file_path}`}
                alt="Key"
                className="h-full w-full object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
                className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-red-600 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
