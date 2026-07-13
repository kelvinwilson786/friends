import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  isUserLoggedIn: boolean;
}

export default function Footer({ isUserLoggedIn }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-950/95 border-t border-slate-800 py-4 px-4 sm:px-6 lg:px-8 font-sans transition-all duration-300 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left Side: Logo and Copyright (AMIGOS rebranding integration) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-center sm:text-left shrink-0">
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <span className="font-extrabold tracking-widest bg-gradient-to-r from-indigo-400 via-pink-400 to-amber-400 bg-clip-text text-transparent text-xs uppercase">
              AMIGOS Social
            </span>
            <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-400 font-mono font-bold" title="O futuro de FCFUNZ Premium">
              Nova Era (FC)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            &copy; {currentYear} AMIGOS. Todos os direitos reservados.
          </p>
        </div>

        {/* Center: Re-branded "AMIGOS" active motto line */}
        {isUserLoggedIn && (
          <div className="flex-1 max-w-xl w-full text-center py-1 flex items-center justify-center gap-2">
            <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase font-bold animate-pulse">
              🤝 AMIGOS • O lema é Amizade Sem Fronteiras
            </span>
          </div>
        )}

        {/* Right Side: Security status */}
        <div className="flex items-center gap-3 text-slate-500 shrink-0">
          <div className="flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded text-emerald-400/80 tracking-wide uppercase">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> Sessão Segura
          </div>
        </div>

      </div>
    </footer>
  );
}
