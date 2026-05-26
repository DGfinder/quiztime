"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "coral" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  secondary: "bg-tertiary-fixed-dim text-on-tertiary-fixed hover:opacity-90",
  coral:
    "bg-secondary-container text-on-secondary-container shadow-[0px_10px_20px_rgba(255,107,107,0.2)] hover:opacity-90",
  ghost:
    "bg-transparent text-on-surface-variant border border-outline-variant hover:bg-surface-container",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={`
        font-extrabold rounded-xl transition-colors cursor-pointer
        ${variants[variant]} ${sizes[size]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
