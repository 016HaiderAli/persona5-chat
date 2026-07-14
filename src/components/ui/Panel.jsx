import React from 'react';
import { motion } from 'motion/react';

export default function Panel({ children, isOpen, className, style }) {
  const cls = ['ui-panel', className].filter(Boolean).join(' ');
  return (
    <motion.div
      className={cls}
      initial={{ opacity: 0, x: '-8%' }}
      animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: '-8%' }}
      transition={{ duration: 0.24 }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
