/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile } from '../types';
import { motion } from 'motion/react';
import { 
  Coins, Smartphone, ShieldCheck, AlertTriangle, Copy, Check, 
  ExternalLink, UserCheck, MessageSquare, ShieldAlert, Award, ArrowRight, CheckCircle2
} from 'lucide-react';

export default function CreditsInfoSection() {
  const [responsibleUser, setResponsibleUser] = useState<Profile | null>(null);
  const [responsiblePhone, setResponsiblePhone] = useState<string>('870870059');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedTerms, setCopiedTerms] = useState(false);

  const loadResponsibleData = async () => {
    try {
      const { userId, phone } = await api.getCreditsResponsible();
      const userProfile = db.profiles.find(p => p.id === userId);
      if (userProfile) {
        setResponsibleUser(userProfile);
      } else {
        // Fallback to Kelvin (u1)
        const kelvin = db.profiles.find(p => p.id === 'u1');
        if (kelvin) setResponsibleUser(kelvin);
      }
      setResponsiblePhone(phone);
    } catch (err) {
      console.error('Error loading credits responsible:', err);
    }
  };

  useEffect(() => {
    loadResponsibleData();
    const unsubscribe = subscribeToGlobalUpdates(loadResponsibleData);
    return () => unsubscribe();
  }, []);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(responsiblePhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Mozambique WhatsApp link generator or regular international formatting
  const formattedPhoneForWhatsApp = responsiblePhone.replace(/\s+/g, '').replace('+', '');
  const finalWhatsAppUrl = formattedPhoneForWhatsApp.startsWith('258') 
    ? `https://wa.me/${formattedPhoneForWhatsApp}`
    : formattedPhoneForWhatsApp.length === 9 
      ? `https://wa.me/258${formattedPhoneForWhatsApp}`
      : `https://wa.me/${formattedPhoneForWhatsApp}`;

  // Official Pricing Table Data
  const pricingTiers = [
    { pin: 50, pinUnit: 'MT', npr: 75, nprUnit: 'mzn', popular: false, badge: 'Inicial' },
    { pin: 100, pinUnit: 'MT', npr: 160, nprUnit: 'mzn', popular: false, badge: 'Intermediário' },
    { pin: 200, pinUnit: 'MT', npr: 330, nprUnit: 'mzn', popular: true, badge: 'Recomendado' },
    { pin: 500, pinUnit: 'MT', npr: 800, nprUnit: 'mzn', popular: false, badge: 'Profissional' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pb-12 space-y-8 animate-fade-in">
      
      {/* HEADER HERO ACCENT */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/45 to-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Coins className="h-40 w-40 text-indigo-400 rotate-12" />
        </div>
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 uppercase mb-4">
            <Coins className="h-3.5 w-3.5" /> Compra & Venda de Créditos - Preços mzn
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            Adquira Créditos Npr - Tabela de Preços mzn
          </h1>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Consulte a tabela oficial de taxas abaixo, verifique o contato do responsável autorizado pela administração e leia atentamente nossas diretrizes de proteção para transações seguras.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: PRICING TIERS & TABLES (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Tabela de Preços Oficiais (Preços mzn)</h2>
              </div>
              <span className="text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                Taxa Garantida
              </span>
            </div>

            {/* CARD GRID FOR VISUAL PREFERENCE */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {pricingTiers.map((tier) => (
                <div 
                  key={tier.pin}
                  className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                    tier.popular 
                      ? 'bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-500/5' 
                      : 'bg-slate-950/30 border-slate-850 hover:border-slate-800'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute top-2 right-2 text-[8px] font-bold font-mono bg-indigo-600 text-white px-1.5 py-0.5 rounded tracking-widest uppercase">
                      Popular
                    </span>
                  )}
                  <div>
                    <span className="text-[8px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                      {tier.badge}
                    </span>
                    <h3 className="text-lg font-black text-slate-100 tracking-tight mt-1">
                      {tier.npr} {tier.nprUnit}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Recebe {tier.npr} {tier.nprUnit} de créditos em saldo
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">Paga via Meticais:</span>
                    <span className="text-xs font-bold font-mono text-emerald-400">{tier.pin} {tier.pinUnit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* STRUCTURED COMPARATIVE TABLE */}
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-850 bg-slate-950/20">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Valor em Meticais (MT)</th>
                    <th className="p-3 text-right">Créditos (Npr)</th>
                    <th className="p-3 text-right">Bônus Adicional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {pricingTiers.map((tier) => (
                    <tr key={tier.pin} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-3 font-semibold text-slate-200">
                        {tier.pin} {tier.pinUnit} <span className="text-[10px] text-slate-500 font-normal italic">(via PIN ou Transferência)</span>
                      </td>
                      <td className="p-3 text-right font-black text-indigo-400">
                        {tier.npr} {tier.nprUnit}
                      </td>
                      <td className="p-3 text-right font-mono text-[10px] text-emerald-400">
                        +{Math.round(((tier.npr - tier.pin) / tier.pin) * 100)}% extra
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CONTACT & TRUST NOTICES (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* RESPONSIBLE ADMIN DETAILS SECTION */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2 pb-3.5 border-b border-slate-800">
              <Smartphone className="h-5 w-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Contato para Compra</h2>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 flex items-center gap-4">
              <img 
                src={responsibleUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                alt="Responsável" 
                className="w-12 h-12 rounded-full border border-indigo-500/20 shrink-0" 
              />
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Responsável Oficial
                </span>
                <p className="text-xs font-bold text-slate-200 mt-1">
                  @{responsibleUser?.username || 'Kelvin'}
                </p>
                <p className="text-[10px] text-slate-400">
                  {responsibleUser?.nome} {responsibleUser?.sobrenome} • Cargo: <span className="font-bold text-indigo-400">{responsibleUser?.cargo || 'Founder'}</span>
                </p>
              </div>
            </div>

            {/* ACTION PHONES */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/30 border border-slate-850 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Telefone para Transferência/PIN</span>
                  <span className="font-mono font-bold text-slate-200 text-sm tracking-wide">{responsiblePhone}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={handleCopyPhone}
                    className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                    title="Copiar Telefone"
                  >
                    {copiedPhone ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a 
                    href={`tel:${responsiblePhone}`}
                    className="p-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center"
                    title="Ligar"
                  >
                    <Smartphone className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <a 
                href={finalWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <MessageSquare className="h-4 w-4" /> Conversar no WhatsApp do Responsável
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-3 bg-indigo-950/15 border border-indigo-500/10 rounded-xl text-[10px] text-slate-300 leading-relaxed italic">
              📌 <strong>Observação Importante:</strong> Enquanto não houver mentores e comerciantes ativos credenciados na plataforma, todas as transações oficiais de compra e venda de créditos de segurança do applet são realizadas exclusivamente pelo fundador responsável listado acima.
            </div>
          </div>

          {/* WARNINGS & POLICIES (AVISOS E POLÍTICAS) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2 pb-3.5 border-b border-slate-800">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Avisos & Políticas de Segurança</h2>
            </div>

            <div className="space-y-3.5">
              
              {/* Warn 1 */}
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-amber-500/10 text-amber-400 shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Taxas Sujeitas a Alteração</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Os preços de compra e venda oficiais listados podem sofrer modificações a qualquer momento pela administração sem aviso prévio, de acordo com o balanço econômico interno.
                  </p>
                </div>
              </div>

              {/* Warn 2 */}
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-indigo-500/10 text-indigo-400 shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Transações Recomendadas</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Para máxima proteção do seu saldo MZN, recomendamos transacionar apenas com comerciantes oficiais, mentores autorizados ou membros da administração geral. Eles possuem verificação certificada.
                  </p>
                </div>
              </div>

              {/* Warn 3 */}
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-red-500/10 text-red-400 shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Negociações Particulares</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Negociar créditos diretamente com outros usuários comuns em chats privados ou grupos externos é de total conta e risco pessoal de cada envolvido. Evite compartilhar dados sigilosos ou pins.
                  </p>
                </div>
              </div>

              {/* Warn 4 */}
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 p-1 rounded bg-slate-800 text-slate-400 shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-200">Isenção de Responsabilidade</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    A plataforma e a administração geral do FCFUNZ não lidam com reclamações, perdas de saldo, nem oferecem reembolso para transações realizadas de modo privado entre membros não credenciados.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
