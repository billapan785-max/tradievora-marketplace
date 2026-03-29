import React from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full" />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.8,
          ease: "easeOut"
        }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            rotateY: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="bg-orange-600 p-6 rounded-3xl shadow-[0_0_50px_rgba(234,88,12,0.3)] mb-8"
        >
          <Shield className="h-20 w-20 text-white" />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">
            ESCROW<span className="text-orange-500">MARKET</span>
          </h1>
          <p className="text-zinc-500 font-medium tracking-widest uppercase text-xs">
            Secure Transactions • Trusted Marketplace
          </p>
        </motion.div>
      </motion.div>

      {/* Loading Bar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 3, ease: "linear" }}
          className="h-full bg-orange-600"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
