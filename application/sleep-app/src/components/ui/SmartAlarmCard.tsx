"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SmartAlarmCardProps {
  children: ReactNode;
  className?: string;
}

export function SmartAlarmCard({
  children,
  className = "",
}: SmartAlarmCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 
        border border-slate-700/50 shadow-xl
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
