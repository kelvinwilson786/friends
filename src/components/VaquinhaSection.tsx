/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, UserCargo } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Smartphone, Award, Coins, Copy, Check, ShieldCheck, 
  Flame, CheckCircle2, Heart, HeartHandshake, AlertTriangle, HelpCircle, ArrowRight, Loader2
} from 'lucide-react';

export default function VaquinhaSection() {
  const [currentUser, setCurrentUser] = useState<Profile>(db.getActiveProfile());
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  
  // Form States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amountMt, setAmountMt] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  // Status and animation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [successData, setSuccessData] = useState<{
    credits: number;
    cargo: UserCargo;
    benefit: string;
    badge: string;
    transactionId: string;
  } | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setCurrentUser(db.getActiveProfile());
    };
    const unsubscribe = subscribeToGlobalUpdates(handleUpdate);
    return () => unsubscribe();
  }, []);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('870870059');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Calculate rewards dynamically for a given MT value
  const getRewardsForAmount = (mt: number) => {
    let credits = Math.round(mt * 3); // Default proportional: 1 MT = 3 MZN
    let cargo: UserCargo = 'Unverified User';
    let badge = '';
    let benefit = '';

    if (mt >= 1000) {
      credits = 3500;
      cargo = 'Super Merchant';
      badge = 'Emblema Super Merchant (Elite)';
      benefit = 'Moldura de Avatar em Chamas 🔥';
    } else if (mt >= 500) {
      credits = 1600;
      cargo = 'Super Merchant';
      badge = 'Emblema Premium de Super Comerciante';
      benefit = 'Balão de Chat Roxo 🔮';
    } else if (mt >= 200) {
      credits = 600;
      cargo = 'Merchant';
      badge = 'Emblema de Ouro de Apoiador';
      benefit = 'Balão de Chat Dourado ✨';
    } else if (mt >= 100) {
      credits = 250;
      cargo = 'Guide';
      badge = 'Emblema de Prata de Apoiador';
      benefit = 'Balão de Chat Azul 💙';
    } else if (mt >= 50) {
      credits = 100;
      cargo = 'Lucky User';
      badge = 'Emblema de Bronze de Apoiador';
      benefit = 'Cargo da Sorte 🍀';
    } else if (mt > 0) {
      // Small/custom proportional rewards below 50 MT
      badge = 'Apoiador Comum';
      benefit = 'Colaborador da Vaquinha';
    }

    return { credits, cargo, badge, benefit };
  };

  const handleContribSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      alert('Por favor, informe o seu número de celular (E-mola).');
      return;
    }
    const parsedMt = parseFloat(amountMt);
    if (isNaN(parsedMt) || parsedMt <= 0) {
      alert('Por favor, informe um valor de contribuição válido maior que zero.');
      return;
    }
    if (!transactionId.trim()) {
      alert('Por favor, digite o ID da Transação do recibo de transferência do E-mola.');
      return;
    }

    const rewards = getRewardsForAmount(parsedMt);

    setIsProcessing(true);
    setProcessStep('Enviando comprovante para análise da administração...');

    setTimeout(async () => {
      try {
        await api.submitVaquinhaContribution(phoneNumber, parsedMt, transactionId);
        setIsProcessing(false);
        setSuccessData({
          credits: rewards.credits,
          cargo: rewards.cargo,
          benefit: rewards.benefit,
          badge: rewards.badge,
          transactionId: transactionId.trim()
        });
      } catch (err: any) {
        setIsProcessing(false);
        alert(err.message || 'Erro ao enviar comprovante de pagamento.');
      }
    }, 1500);
  };

  const handleResetSuccess = () => {
    setSuccessData(null);
    setPhoneNumber('');
    setAmountMt('');
    setTransactionId('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* HEADER HERO */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <HeartHandshake className="h-44 w-44 text-indigo-400 rotate-12" />
        </div>
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-widest text-pink-400 bg-pink-500/10 border border-pink-500/20 uppercase mb-4">
            <Heart className="h-3.5 w-3.5 text-pink-500 animate-pulse" /> CAMPANHA COMUNITÁRIA 2026
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            Vaquinha Comunitária: Coloque o FCFUNZ Online Profissional! 🚀
          </h1>
          <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
            Quer ver o nosso fã-clube retrô rodando 100% estável, online em servidor permanente de alta velocidade e com domínio oficial? Participe da nossa vaquinha comunitária via <strong>E-mola</strong>! Sua contribuição com dinheiro de verdade nos apoia diretamente e te recompensa com benefícios e privilégios estéticos lendários por 30 dias.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: INFORMATION & TIERS TABLE (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Progress Goal Widget */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Meta da Vaquinha (Fase 1: Domínio + Hospedagem)</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Ajude-nos a bater a meta para fazer a migração do servidor</p>
              </div>
              <div className="text-right font-mono">
                <span className="text-sm font-black text-indigo-400">8.750 MT</span>
                <span className="text-xs text-slate-500"> / 15.000 MT</span>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-slate-950 border border-slate-850 rounded-full overflow-hidden p-[2px]">
                <div className="h-full rounded-full bg-gradient-to-r from-pink-500 via-indigo-600 to-indigo-400 w-[58%] shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>58% Alcançado</span>
                <span>Restam 6.250 MT</span>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Table */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono border-b border-slate-800 pb-3">
              Tabela Oficial de Recompensas e Ranks Especiais
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-mono bg-slate-950/40">
                    <th className="py-2.5 px-3">Contribuição</th>
                    <th className="py-2.5 px-3 text-amber-400">MZN Virtual</th>
                    <th className="py-2.5 px-3 text-indigo-400">Cargo por 1 Mês</th>
                    <th className="py-2.5 px-3">Benefício Estético</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/65">
                  
                  {/* Tier 1 */}
                  <tr className="hover:bg-slate-800/25 transition">
                    <td className="py-3 px-3 font-bold font-mono">50 MT</td>
                    <td className="py-3 px-3 font-bold text-amber-400">100 MZN</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">Lucky User</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-[11px]">
                      Emblema de Bronze de Apoiador 🍀
                    </td>
                  </tr>

                  {/* Tier 2 */}
                  <tr className="hover:bg-slate-800/25 transition">
                    <td className="py-3 px-3 font-bold font-mono">100 MT</td>
                    <td className="py-3 px-3 font-bold text-amber-400">250 MZN</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-500/20 text-teal-400 border border-teal-500/20">guide</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-[11px]">
                      Emblema de Prata + Balão de Chat Azul 💙
                    </td>
                  </tr>

                  {/* Tier 3 */}
                  <tr className="hover:bg-slate-800/25 transition">
                    <td className="py-3 px-3 font-bold font-mono">200 MT</td>
                    <td className="py-3 px-3 font-bold text-amber-400">600 MZN</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/20">merchant</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-[11px]">
                      Emblema de Ouro + Balão de Chat Dourado ✨
                    </td>
                  </tr>

                  {/* Tier 4 */}
                  <tr className="hover:bg-slate-800/25 transition">
                    <td className="py-3 px-3 font-bold font-mono">500 MT</td>
                    <td className="py-3 px-3 font-bold text-amber-400">1.600 MZN</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-pink-500/20 text-pink-400 border border-pink-500/20">super Merchant</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-[11px]">
                      Emblema Premium de Super Comerciante + Balão de Chat Roxo 🔮
                    </td>
                  </tr>

                  {/* Tier 5 */}
                  <tr className="hover:bg-slate-800/25 transition">
                    <td className="py-3 px-3 font-bold font-mono">1000 MT</td>
                    <td className="py-3 px-3 font-bold text-amber-400">3.500 MZN</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-pink-500/20 text-pink-400 border border-pink-500/20">Super Merchant</span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-[11px]">
                      Moldura de Avatar em Chamas 🔥
                    </td>
                  </tr>

                  {/* Proportional */}
                  <tr className="hover:bg-slate-800/25 transition">
                    <td className="py-3 px-3 font-bold text-slate-400">Personalizado</td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-400">1 MT = 3 MZN</td>
                    <td className="py-3 px-3 text-slate-400 font-sans">
                      Baseado no valor atingido
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      Proporcional ao valor contribuído
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* Explanatory notes */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-slate-200">Regras de Validade dos Benefícios</h4>
              <p className="text-slate-400 leading-relaxed">
                As patentes e cargos recebidos através da vaquinha são válidos por exatamente 30 dias corridos após a confirmação. Após esse prazo, o cargo é revertido automaticamente ao cargo anterior, mas você mantém permanentemente todas as moedas virtuais em MZN bônus e os emblemas conquistados na sua conta!
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DIRECT INSTRUCTIONS & PAYMENT FORM (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Instructions Box */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
              Passo 1: Fazer a Transferência
            </h3>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 text-center space-y-2">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Número Oficial E-mola</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-black text-white tracking-wider">870870059</span>
                  <button 
                    onClick={handleCopyPhone}
                    className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
                    title="Copiar número de telefone"
                  >
                    {copiedPhone ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[9px] text-indigo-400 font-medium">Movitel Moçambique</p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="font-mono text-indigo-400 font-extrabold">1.</span>
                  <p className="text-[11px] text-slate-400">Abra o menu do E-mola no seu celular (`*898#`) ou o app oficial.</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-indigo-400 font-extrabold">2.</span>
                  <p className="text-[11px] text-slate-400">Transfira o valor escolhido para o número acima (<strong>870870059</strong>).</p>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-indigo-400 font-extrabold">3.</span>
                  <p className="text-[11px] text-slate-400">Copie o ID/Referência de Transação do SMS de confirmação recebido.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Receipt Form */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
              Passo 2: Enviar Comprovante
            </h3>

            <AnimatePresence mode="wait">
              {isProcessing ? (
                /* Processing State */
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                  <p className="text-xs font-mono font-medium text-slate-300 animate-pulse">{processStep}</p>
                </motion.div>
              ) : successData ? (
                /* Success Pending State */
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="py-4 text-center space-y-4"
                >
                  <div className="inline-flex h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 items-center justify-center text-amber-400 text-xl font-bold">
                    ⏳
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-black text-white">Comprovante Enviado! 🚀</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sua transação com a Ref: <strong className="text-indigo-400 font-mono">{successData.transactionId}</strong> foi registrada e enviada para a fila de análise.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Assim que um fundador ou administrador validar o recebimento do valor via Moza/E-mola, suas moedas virtuais e cargo especial serão ativados.
                    </p>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-left text-xs space-y-1.5 font-mono">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-850">Recompensas Estimadas:</p>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Moedas Bônus:</span>
                      <span className="text-amber-400 font-bold">+{successData.credits} MZN</span>
                    </div>
                    {successData.cargo !== 'Unverified User' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cargo Especial:</span>
                        <span className="text-indigo-400 font-bold">{successData.cargo} (30 dias)</span>
                      </div>
                    )}
                    {successData.benefit && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Benefício Estético:</span>
                        <span className="text-pink-400 font-bold">{successData.benefit}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleResetSuccess}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    Enviar Outro Comprovante
                  </button>
                </motion.div>
              ) : (
                /* Regular Receipt Submission Form */
                <motion.form 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleContribSubmit} 
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Seu Número E-mola</label>
                    <input
                      type="text"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Ex: 871234567"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Valor Pago (MT)</label>
                    <input
                      type="number"
                      required
                      value={amountMt}
                      onChange={(e) => setAmountMt(e.target.value)}
                      placeholder="Ex: 100"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                    {amountMt && !isNaN(parseFloat(amountMt)) && (
                      <div className="mt-1.5 p-2 bg-slate-950/45 border border-slate-850 rounded text-[10px] text-slate-400 flex justify-between font-mono">
                        <span>Retorno Proporcional:</span>
                        <span className="text-amber-400 font-bold">+{getRewardsForAmount(parseFloat(amountMt)).credits} MZN</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">ID da Transação E-mola</label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Ex: TXP12345678"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-lg transition shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider"
                  >
                    <Smartphone className="h-4 w-4" /> Enviar Comprovante
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
}
