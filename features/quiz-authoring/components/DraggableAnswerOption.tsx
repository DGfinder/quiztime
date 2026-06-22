"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";

interface DraggableAnswerOptionProps {
  id: string;
  value: string;
  color: string;
  label: string;
  isCorrect: boolean;
  radioName: string;
  onChangeValue: (oldVal: string, newVal: string) => void;
  onSelectCorrect: () => void;
}

function GripVertical() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5.5" cy="2.5" r="1.5" />
      <circle cx="10.5" cy="2.5" r="1.5" />
      <circle cx="5.5" cy="8" r="1.5" />
      <circle cx="10.5" cy="8" r="1.5" />
      <circle cx="5.5" cy="13.5" r="1.5" />
      <circle cx="10.5" cy="13.5" r="1.5" />
    </svg>
  );
}

export default function DraggableAnswerOption({
  id,
  value,
  color,
  label,
  isCorrect,
  radioName,
  onChangeValue,
  onSelectCorrect,
}: DraggableAnswerOptionProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id });

  return (
    <div
      ref={setDropRef}
      className={`bg-surface-container-lowest p-5 rounded-xl shadow-sm flex items-center gap-3 group transition-all border-2 ${
        isOver && !isDragging
          ? "border-primary-fixed border-dashed scale-[1.02]"
          : "border-transparent focus-within:border-primary-fixed"
      } ${isDragging ? "opacity-30" : ""}`}
    >
      {/* Drag handle — swaps this answer with the one it's dropped on */}
      <button
        type="button"
        ref={setDragRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag answer ${label} to swap it with another`}
        title="Drag to swap"
        className="cursor-grab active:cursor-grabbing text-outline opacity-0 group-hover:opacity-100 transition-opacity shrink-0 touch-none"
      >
        <GripVertical />
      </button>
      <div
        className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white font-black text-xs shrink-0`}
      >
        {label}
      </div>
      <input
        className="flex-1 border-none focus:ring-0 focus:outline-none p-0 font-bold text-primary bg-transparent placeholder:text-outline"
        type="text"
        value={value}
        onChange={(e) => onChangeValue(value, e.target.value)}
        placeholder="Add answer..."
      />
      <label className="relative flex items-center gap-2 cursor-pointer">
        <input
          className="peer sr-only"
          name={radioName}
          type="radio"
          checked={isCorrect}
          onChange={onSelectCorrect}
        />
        <div className="w-6 h-6 rounded-full border-2 border-outline-variant peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[14px] text-white scale-0 peer-checked:scale-100 transition-transform"
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            check
          </span>
        </div>
        {isCorrect && (
          <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Correct
          </span>
        )}
      </label>
    </div>
  );
}
