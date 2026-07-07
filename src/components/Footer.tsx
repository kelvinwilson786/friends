import React, { useState, useEffect } from 'react';
import { api } from '../lib/supabase';
import { Anuncio } from '../types';
import { Sparkles, Megaphone, ShieldCheck } from 'lucide-react';

interface FooterProps {
  isUserLoggedIn: boolean;
  onGoToMarketplace?: () => void;
}

export default function Footer({ isUserLoggedIn, onGoToMarketplace }: FooterProps) {
  const [activeAd, setActiveAd] = useState<Anuncio | null>(null);
  const [adsList, setAdsList] = useState<Anuncio[]>([]);

  useEffect(() => {
    if (!isUserLoggedIn) {
      setActiveAd(null);
      return;
    }

    const fetchAds = async () => {
      try {
        const ads = await api.getAnuncios();
        setAdsList(ads);
        if (ads.length > 0) {
          // Select one random active ad
          const randomIndex = Math.floor(Math.random() * ads.length);
          const selectedAd = ads[randomIndex];
          setActiveAd(selectedAd);
        } else {
          setActiveAd(null);
        }
      } catch (err) {
        console.error('Erro ao buscar anúncios para o rodapé:', err);
      }
    };

    fetchAds();
    // Rotate ads occasionally (every 20 seconds for more dynamic rotation)
    const interval = setInterval(fetchAds, 20000);
    return () => clearInterval(interval);
  }, [isUserLoggedIn]);

  // Track view count increment once per ad selection
  useEffect(() => {
    if (activeAd) {
      api.incrementAnuncioViews(activeAd.id).catch(err => {
        console.error('Erro ao incrementar visualizações do anúncio:', err);
      });
    }
  }, [activeAd?.id]);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-950/95 border-t border-slate-800 py-2 px-4 sm:px-6 lg:px-8 font-sans transition-all duration-300 backdrop-blur-md">
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

        {/* Center: Beautifully styled active ad widget with fixed height/no-stretch constraints */}
        {isUserLoggedIn && (
          <div className="flex-1 max-w-xl w-full bg-gradient-to-r from-slate-950/60 via-indigo-950/10 to-slate-950/60 border border-indigo-500/25 rounded-lg p-1.5 px-3 flex items-center gap-2.5 backdrop-blur-sm shadow-md transition-all duration-300 hover:border-indigo-500/40 min-w-0">
            <div className="flex items-center gap-1 shrink-0 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-widest animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.15)]">
              <Megaphone className="h-2.5 w-2.5 text-amber-400" /> Pub
            </div>
            
            <div className="flex-1 min-w-0">
              {activeAd ? (
                <div className="flex items-center justify-between gap-3 w-full text-left min-w-0">
                  <span className="text-[11px] text-slate-200 font-medium truncate flex-1 block" title={activeAd.texto}>
                    {activeAd.texto}
                  </span>
                  <span className="text-[8px] text-indigo-300 bg-indigo-600/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-bold shrink-0 font-mono">
                    por @{activeAd.autor_username} • {activeAd.visualizacoes} views 🚀
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 italic flex items-center justify-between w-full min-w-0 gap-2">
                  <span className="truncate flex-1">Espaço para anúncios virtuais ativo.</span>
                  <button 
                    onClick={onGoToMarketplace}
                    className="text-indigo-400 hover:underline hover:text-indigo-300 not-italic font-bold inline-flex items-center gap-1 cursor-pointer hover:scale-105 transition duration-150 text-[10px] shrink-0"
                  >
                    Anuncie aqui por 50 MZN <Sparkles className="h-2.5 w-2.5 text-pink-400 animate-pulse" />
                  </button>
                </div>
              )}
            </div>
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
