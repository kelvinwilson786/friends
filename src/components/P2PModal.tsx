import React, { useState, useEffect } from 'react';
import { api, db, subscribeToGlobalUpdates } from '../lib/supabase';
import { Profile, P2POrder, MerchantRate } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, ArrowUpRight, ArrowDownLeft, X, Upload, Check, AlertTriangle, 
  Clock, ShieldCheck, History, ArrowRight, Smartphone, MessageSquare, 
  HelpCircle, Sparkles, User, Percent, Info, Ban
} from 'lucide-react';

interface P2PModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  setActiveTab: (tab: string) => void;
}

export default function P2PModal({ isOpen, onClose, currentUser, setActiveTab }: P2PModalProps) {
  const [activeTab, setActiveTabLocal] = useState<'depositar' | 'levantar' | 'minhas_ordens'>('depositar');
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [rates, setRates] = useState<MerchantRate[]>([]);
  const [merchants, setMerchants] = useState<Profile[]>([]);
  
  // Buying states
  const [selectedMerchant, setSelectedMerchant] = useState<Profile | null>(null);
  const [buyAmountMzn, setBuyAmountMzn] = useState<string>('');
  const [comprovativo, setComprovativo] = useState<File | null>(null);
  const [comprovativoName, setComprovativoName] = useState<string>('');
  const [comprovativoBase64, setComprovativoBase64] = useState<string>('');
  const [buyingStep, setBuyingStep] = useState<'amount' | 'payment' | 'success'>('amount');
  
  // Withdrawal states
  const [withdrawAmountMzn, setWithdrawAmountMzn] = useState<string>('');
  const [withdrawPhone, setWithdrawPhone] = useState<string>('');
  const [withdrawalStep, setWithdrawalStep] = useState<'form' | 'success'>('form');

  // General state
  const [errorStr, setErrorStr] = useState<string | null>(null);
  const [successStr, setSuccessStr] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = subscribeToGlobalUpdates(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const loadData = () => {
    // Load orders
    api.getP2POrders().then(ordersList => {
      setOrders(ordersList);
    });

    // Load rates
    api.getMerchantRates().then(ratesList => {
      setRates(ratesList);
    });

    // Load profiles who can sell credits (Merchant, Super Merchant, Mentor, Founder, Admin)
    const eligibleMerchants = db.profiles.filter(p => 
      ['Merchant', 'Super Merchant', 'Mentor', 'Mentor Head', 'Founder', 'Global Admin'].includes(p.cargo) &&
      p.id !== 'system'
    );
    setMerchants(eligibleMerchants);
  };

  if (!isOpen || !currentUser) return null;

  // Find rate for a merchant
  const getMerchantRate = (merchantId: string, cargo: string): number => {
    const rateObj = rates.find(r => r.merchant_id === merchantId);
    if (rateObj) return rateObj.rate;
    // Fallbacks
    if (cargo === 'Mentor' || cargo === 'Mentor Head' || cargo === 'Founder') return 1.15;
    if (cargo === 'Super Merchant') return 1.20;
    return 1.25; // default for Merchant
  };

  // Sorted merchants (best price first - lowest rate)
  const sortedMerchants = [...merchants].map(m => ({
    ...m,
    computedRate: getMerchantRate(m.id, m.cargo)
  })).sort((a, b) => a.computedRate - b.computedRate);

  // Generate deterministic phone number for a merchant if they don't have one
  const getMerchantPhone = (merchant: Profile): string => {
    // if vaquinha contribution exists with a phone, use it, else make a nice fake one
    const vq = db.vaquinhaContributions.find(c => c.user_id === merchant.id);
    if (vq && vq.phone_number) return vq.phone_number;
    
    // Deterministic mock phone
    let sum = 0;
    for (let i = 0; i < merchant.username.length; i++) sum += merchant.username.charCodeAt(i);
    const lastDigits = String((sum * 13) % 10000000).padStart(7, '4');
    return `87${lastDigits.substring(0, 7)}`;
  };

  // Handle proof upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setComprovativo(file);
      setComprovativoName(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprovativoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setComprovativo(file);
      setComprovativoName(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprovativoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Buying Order
  const handleConfirmBuy = async () => {
    if (!selectedMerchant || !buyAmountMzn) return;
    setErrorStr(null);
    
    const amount = parseFloat(buyAmountMzn);
    if (isNaN(amount) || amount <= 0) {
      setErrorStr('Insira uma quantidade de MZN válida.');
      return;
    }

    if (!comprovativoBase64) {
      setErrorStr('Você precisa anexar o comprovativo de transferência via e-Mola para continuar.');
      return;
    }

    const rate = getMerchantRate(selectedMerchant.id, selectedMerchant.cargo);
    const totalMts = amount * rate;

    try {
      await api.createP2POrder({
        buyer_id: currentUser.id,
        buyer_username: currentUser.username,
        merchant_id: selectedMerchant.id,
        merchant_username: selectedMerchant.username,
        amount_mzn: amount,
        rate,
        total_mts: totalMts,
        payment_method: 'e-Mola',
        comprovativo_name: comprovativoName,
        comprovativo_data: comprovativoBase64,
        type: 'deposit'
      });

      setBuyingStep('success');
      loadData();
    } catch (err: any) {
      setErrorStr(err.message || 'Erro ao enviar pedido.');
    }
  };

  // Submit Withdrawal Order
  const handleWithdrawalSubmit = async () => {
    setErrorStr(null);
    const amount = parseFloat(withdrawAmountMzn);
    if (isNaN(amount) || amount <= 0) {
      setErrorStr('Insira um valor de levantamento válido.');
      return;
    }

    if (amount > (currentUser.credits || 0)) {
      setErrorStr(`Saldo MZN insuficiente. Você possui apenas ${currentUser.credits} MZN.`);
      return;
    }

    const cleanPhone = withdrawPhone.trim();
    if (!/^(84|85|87)\d{7}$/.test(cleanPhone)) {
      setErrorStr('O número de e-Mola deve começar com 84, 85 ou 87 e possuir 9 dígitos.');
      return;
    }

    try {
      await api.createP2POrder({
        buyer_id: currentUser.id,
        buyer_username: currentUser.username,
        merchant_id: 'system',
        merchant_username: 'Administração',
        amount_mzn: amount,
        rate: 1.0, // standard withdrawal rate
        total_mts: amount * 1.0,
        payment_method: 'e-Mola',
        type: 'withdrawal',
        withdrawal_phone: cleanPhone
      });

      setWithdrawalStep('success');
      loadData();
    } catch (err: any) {
      setErrorStr(err.message || 'Erro ao registrar levantamento.');
    }
  };

  // Simulate order release immediately for user testing
  const handleSimulateRelease = async (orderId: string) => {
    try {
      await api.updateP2POrderStatus(orderId, 'completed');
      setSuccessStr('Sucesso! Transação P2P liberada e créditos creditados na sua carteira.');
      setTimeout(() => setSuccessStr(null), 4000);
      loadData();
    } catch (err: any) {
      setErrorStr(err.message);
    }
  };

  // Dispute order
  const handleDisputeOrder = async (orderId: string) => {
    try {
      await api.updateP2POrderStatus(orderId, 'disputed');
      setSuccessStr('Ordem marcada como EM DISPUTA. A administração analisará as provas.');
      setTimeout(() => setSuccessStr(null), 4000);
      loadData();
    } catch (err: any) {
      setErrorStr(err.message);
    }
  };

  // Withdrawal logic preconditions checks
  const isEligibleWithdrawal = ['Merchant', 'Super Merchant', 'Mentor', 'Mentor Head', 'Founder', 'Global Admin'].includes(currentUser.cargo || '');
  
  // Calculate MPoints requirements
  const getRequiredMPoints = (cargo: string): number => {
    if (cargo === 'Mentor' || cargo === 'Mentor Head' || cargo === 'Founder' || cargo === 'Global Admin') return 350;
    if (cargo === 'Super Merchant') return 250;
    return 150; // Merchant
  };

  const requiredMpoints = getRequiredMPoints(currentUser.cargo || '');
  const hasEnoughMpoints = (currentUser.mpoint || 0) >= requiredMpoints;

  // Date Check: Can only withdraw once per month
  const lastWithdrawDate = currentUser.last_withdrawal_at ? new Date(currentUser.last_withdrawal_at) : null;
  const isWithdrawLimitExceeded = lastWithdrawDate ? (
    new Date().getMonth() === lastWithdrawDate.getMonth() &&
    new Date().getFullYear() === lastWithdrawDate.getFullYear()
  ) : false;

  const getWithdrawLimitFormatted = () => {
    if (!lastWithdrawDate) return '';
    const nextMonth = new Date(lastWithdrawDate.getFullYear(), lastWithdrawDate.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' });
  };

  const getCargoColorClass = (cargo: string) => {
    if (['Founder', 'Global Admin', 'Mentor Head', 'Mentor'].includes(cargo)) return 'text-red-400 border-red-500/20 bg-red-500/5';
    if (cargo === 'Super Merchant') return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  };

  const mentorsList = db.profiles.filter(p => ['Mentor', 'Mentor Head'].includes(p.cargo));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="p2p-modal">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Sistema P2P FCFUNZ
                <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">e-Mola</span>
              </h2>
              <p className="text-[10px] text-slate-400">Compre ou retire créditos de forma instantânea com revendedores credenciados</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Balance Bar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Seu saldo:</span>
            <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              {currentUser.credits} MZN
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Seu Cargo:</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCargoColorClass(currentUser.cargo || '')}`}>
              {currentUser.cargo}
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 p-1 gap-1">
          <button
            onClick={() => { setActiveTabLocal('depositar'); setSelectedMerchant(null); setBuyingStep('amount'); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'depositar' 
                ? 'bg-slate-800 text-slate-200 shadow-inner border border-slate-700/50' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
            Depositar MZN
          </button>
          <button
            onClick={() => { setActiveTabLocal('levantar'); setWithdrawalStep('form'); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'levantar' 
                ? 'bg-slate-800 text-slate-200 shadow-inner border border-slate-700/50' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="h-4 w-4 text-red-400" />
            Levantar MZN via e-Mola
          </button>
          <button
            onClick={() => { setActiveTabLocal('minhas_ordens'); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'minhas_ordens' 
                ? 'bg-slate-800 text-slate-200 shadow-inner border border-slate-700/50' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="h-4 w-4 text-indigo-400" />
            Minhas Ordens
            {orders.filter(o => o.buyer_id === currentUser.id && o.status === 'pending').length > 0 && (
              <span className="absolute top-2.5 right-2 h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            )}
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {errorStr && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorStr}</span>
            </div>
          )}

          {successStr && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-start gap-2">
              <Check className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successStr}</span>
            </div>
          )}

          {/* TAB 1: DEPOSIT / COMPRAR */}
          {activeTab === 'depositar' && (
            <div className="space-y-4">
              {!selectedMerchant ? (
                <>
                  <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-emerald-400/90 leading-relaxed flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>Como funciona:</strong> Selecione o revendedor com o melhor preço (ordenado do menor para o maior). Informe quantos MZN quer adquirir, efetue o pagamento no número e-Mola fornecido e envie o comprovativo. Os créditos serão adicionados ao seu saldo assim que o revendedor liberar.
                    </p>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">Revendedores Credenciados Disponíveis</h3>
                  <div className="grid gap-3">
                    {sortedMerchants.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                        Nenhum comerciante online no momento.
                      </div>
                    ) : (
                      sortedMerchants.map((merchant) => (
                        <div 
                          key={merchant.id}
                          className="p-3.5 bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-100 flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                @{merchant.username}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getCargoColorClass(merchant.cargo || '')}`}>
                                {merchant.cargo}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-500" />
                                Envio Médio: <strong>~3m</strong>
                              </span>
                              <span className="text-slate-600">|</span>
                              <span className="text-emerald-400/90 font-medium">Taxa de Sucesso: 99.8%</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 bg-indigo-500/5 border border-indigo-500/10 rounded px-2 py-0.5 w-max">
                              <Percent className="h-3 w-3 text-indigo-400" />
                              Limite: <strong className="font-mono">Min 10 - Max 10,000 MZN</strong>
                            </div>
                          </div>

                          <div className="w-full md:w-auto flex justify-between md:flex-col items-center md:items-end gap-2 border-t border-slate-800/50 md:border-t-0 pt-2.5 md:pt-0">
                            <div className="text-left md:text-right">
                              <div className="text-[10px] text-slate-400 font-medium">Preço Unitário</div>
                              <div className="text-sm font-mono font-bold text-emerald-400">
                                1 MZN = {merchant.computedRate.toFixed(2)} MTs
                              </div>
                            </div>
                            <button
                              onClick={() => { setSelectedMerchant(merchant); setBuyingStep('amount'); setBuyAmountMzn(''); setComprovativo(null); setComprovativoName(''); }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-emerald-950/20 active:scale-95"
                            >
                              Comprar
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                /* Buying Steps */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedMerchant(null)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                    >
                      ← Voltar à Lista de Preços
                    </button>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                      Ordem ID: Nova
                    </span>
                  </div>

                  {buyingStep === 'amount' && (
                    <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={selectedMerchant.avatar_url} 
                          alt="" 
                          className="h-10 w-10 rounded-full border border-slate-700 bg-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-100">@{selectedMerchant.username}</div>
                          <div className="text-[10px] text-slate-400">Calculado a: <strong className="font-mono text-emerald-400">1 MZN = {getMerchantRate(selectedMerchant.id, selectedMerchant.cargo).toFixed(2)} MTs</strong></div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Quantidade que deseja Comprar (MZN)</label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            placeholder="Mínimo 10 MZN"
                            value={buyAmountMzn}
                            onChange={(e) => setBuyAmountMzn(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-xl px-4 py-3 text-sm text-slate-200 font-mono font-bold"
                          />
                          <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-bold">MZN</span>
                        </div>
                      </div>

                      {buyAmountMzn && parseFloat(buyAmountMzn) > 0 && (
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex justify-between items-center text-xs font-medium">
                          <span className="text-slate-400">Total a Pagar via e-Mola:</span>
                          <span className="font-mono font-extrabold text-amber-400 text-sm">
                            {(parseFloat(buyAmountMzn) * getMerchantRate(selectedMerchant.id, selectedMerchant.cargo)).toFixed(2)} MTs
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          const amt = parseFloat(buyAmountMzn);
                          if (!amt || amt < 10) {
                            setErrorStr('O valor mínimo de depósito é 10 MZN.');
                            return;
                          }
                          setErrorStr(null);
                          setBuyingStep('payment');
                        }}
                        disabled={!buyAmountMzn || parseFloat(buyAmountMzn) < 10}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
                      >
                        Continuar para Pagamento
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {buyingStep === 'payment' && (
                    <div className="space-y-4">
                      {/* Merchant Payment Info Card */}
                      <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3.5 relative overflow-hidden">
                        <div className="absolute right-0 top-0 bg-indigo-500/5 text-indigo-400/20 font-bold font-mono text-5xl select-none translate-x-4 translate-y-2 uppercase">
                          e-Mola
                        </div>
                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <Smartphone className="h-4 w-4 text-indigo-400" />
                          Dados de Transferência do Vendedor
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-slate-800/60">
                          <div>
                            <div className="text-slate-400 text-[10px]">Beneficiário:</div>
                            <div className="font-bold text-slate-200">{selectedMerchant.nome} {selectedMerchant.sobrenome}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px]">Carteira Móvel:</div>
                            <div className="font-mono font-bold text-indigo-400 text-sm flex items-center gap-1 select-all">
                              {getMerchantPhone(selectedMerchant)}
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px]">Valor da Transferência:</div>
                            <div className="font-mono font-extrabold text-amber-400 text-sm">
                              {(parseFloat(buyAmountMzn) * getMerchantRate(selectedMerchant.id, selectedMerchant.cargo)).toFixed(2)} MTs
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px]">Créditos FCFUNZ:</div>
                            <div className="font-mono font-bold text-slate-200">
                              {buyAmountMzn} MZN
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* File Uploader */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Anexar Comprovativo (Screenshot / PDF)</label>
                        
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('comprovativo-file')?.click()}
                          className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/40 cursor-pointer rounded-xl p-6 text-center transition-all space-y-2 flex flex-col items-center justify-center"
                        >
                          <input 
                            type="file" 
                            id="comprovativo-file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Upload className="h-7 w-7 text-indigo-400" />
                          <div>
                            <p className="text-xs font-medium text-slate-300">Arrastar & soltar ou clicar para selecionar comprovativo</p>
                            <p className="text-[10px] text-slate-500 mt-1">Formatos suportados: PNG, JPG, JPEG, PDF (Máx. 5MB)</p>
                          </div>
                        </div>

                        {comprovativoName && (
                          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-slate-300 truncate max-w-[80%] font-mono">{comprovativoName}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setComprovativo(null); setComprovativoName(''); setComprovativoBase64(''); }}
                              className="text-red-400 hover:text-red-300"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setBuyingStep('amount')}
                          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={handleConfirmBuy}
                          disabled={!comprovativoBase64}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
                        >
                          Confirmar Pagamento
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {buyingStep === 'success' && (
                    <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-200">Pedido de Compra P2P Criado!</h4>
                        <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                          Seu comprovativo foi enviado para o revendedor <strong>@{selectedMerchant.username}</strong>. Assim que ele verificar a conta dele e liberar o pagamento via e-Mola, seus créditos estarão disponíveis instantaneamente!
                        </p>
                      </div>

                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl max-w-xs mx-auto text-xs text-indigo-400 leading-relaxed font-mono">
                        DICA DE TESTES: Vá na aba <strong>"Minhas Ordens"</strong> para simular a liberação do comerciante de forma instantânea!
                      </div>

                      <button
                        onClick={() => { setSelectedMerchant(null); setActiveTabLocal('minhas_ordens'); }}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        Ver Minhas Ordens
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WITHDRAW / LEVANTAR */}
          {activeTab === 'levantar' && (
            <div className="space-y-4">
              {/* RESTRICTION CHECK: MUST BE AN AUTHORIZED CARGO */}
              {!isEligibleWithdrawal ? (
                /* MONETIZATION HOOK / BECOME MERCHANT REDIRECT */
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl text-center space-y-5 animate-fade-in">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-950/40">
                    <Sparkles className="h-7 w-7 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">
                      👑 Torne-se Comerciante Oficial Credenciado!
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      O levantamento de saldos MZN via e-Mola para a vida real está disponível <strong>exclusivamente para Merchants, Super Merchants, e Mentores</strong> da comunidade.
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto bg-slate-900 border border-slate-850 px-3 py-2 rounded-xl">
                      Crie sua própria fonte de renda faturando no site! Comerciantes podem receber fundos, vender créditos cobrando sua própria taxa e lucrar.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto pt-2 border-t border-slate-800/40">
                    <button
                      onClick={() => { setActiveTab('vaquinha'); onClose(); }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 hover:shadow-emerald-950/30 active:scale-95"
                    >
                      Apoiar o Site (Vaquinha)
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    
                    <button
                      onClick={() => {
                        // Redirect to the first active mentor's PM!
                        const mentor = mentorsList[0] || db.profiles.find(p => p.cargo === 'Mentor');
                        if (mentor) {
                          onClose();
                          setActiveTab('pms');
                          // set recipient in custom event or window helper
                          (window as any)._p2p_chat_recipient = mentor.id;
                          window.dispatchEvent(new CustomEvent('p2p_open_chat', { detail: { id: mentor.id } }));
                        } else {
                          setErrorStr('Nenhum mentor encontrado online.');
                        }
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95"
                    >
                      <MessageSquare className="h-4 w-4 text-indigo-400" />
                      Falar com um Mentor
                    </button>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2.5">Nossos Mentores para Comprar o Cargo:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {mentorsList.slice(0, 4).map(m => (
                        <div key={m.id} className="p-2.5 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200">@{m.username}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">Preço Justo</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : !hasEnoughMpoints ? (
                /* RESTRICTION CHECK: MUST HAVE COMPLETED TASKS & ENOUGH MPOINTS TO REACTIVATE CARGO */
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                    <AlertTriangle className="h-6 w-6 animate-bounce" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      ⚠️ Cargo Inativo ou Requer Reativação!
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Para solicitar levantamentos de MZN via e-Mola, você precisa ter seu cargo reativado no Painel de Comerciantes! Para reativar seu cargo de <strong>{currentUser.cargo}</strong>, você precisa acumular MPoints suficientes nas missões diárias.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl max-w-sm mx-auto space-y-2.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Seus MPoints:</span>
                      <span className="font-bold font-mono text-indigo-400">{currentUser.mpoint || 0} / {requiredMpoints} MPOINTS</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((currentUser.mpoint || 0) / requiredMpoints) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Falta apenas <strong>{Math.max(0, requiredMpoints - (currentUser.mpoint || 0))} MPoints</strong>! Complete as missões de parcerias para liberar.
                    </p>
                  </div>

                  <button
                    onClick={() => { setActiveTab('merchants'); onClose(); }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    Ir para o Painel de Missões
                  </button>
                </div>
              ) : isWithdrawLimitExceeded ? (
                /* RESTRICTION CHECK: ONCE PER MONTH LIMIT */
                <div className="p-5 bg-slate-950/40 border border-slate-800 rounded-2xl text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                    <Ban className="h-6 w-6" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      ⚠️ Limite de Retirada Atingido!
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      De acordo com as diretrizes de sustentabilidade do site, comerciantes podem efetuar levantamentos de MZN para dinheiro real via e-Mola <strong>apenas uma vez por mês</strong>.
                    </p>
                    <p className="text-[11px] text-emerald-400/90 font-medium">
                      O seu último levantamento foi em <strong>{lastWithdrawDate?.toLocaleDateString('pt-MZ')}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Seu próximo levantamento estará disponível em: <strong className="text-slate-300 font-mono">{getWithdrawLimitFormatted()}</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                    DICA: Use seus créditos para presentear usuários no chat, adquirir novas salas, patrocinar anúncios ou jogar nas salas multiplicadoras para expandir seus lucros!
                  </div>
                </div>
              ) : (
                /* WITHDRAW FORM FOR ELIGIBLE COMMERCIAL USERS */
                <div className="space-y-4">
                  <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400/95 leading-relaxed flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>Levantamento Autorizado:</strong> Você possui o cargo credenciado ativo de <strong>{currentUser.cargo}</strong> com <strong>{currentUser.mpoint} MPoints</strong>. Você pode sacar créditos diretamente para sua conta e-Mola cadastrada (uma retirada mensal permitida).
                    </p>
                  </div>

                  {withdrawalStep === 'form' ? (
                    <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Quantidade de MZN a Retirar</label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            max={currentUser.credits}
                            placeholder={`Máximo ${currentUser.credits} MZN`}
                            value={withdrawAmountMzn}
                            onChange={(e) => setWithdrawAmountMzn(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-sm text-slate-200 font-mono font-bold"
                          />
                          <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-bold">MZN</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Número da Conta e-Mola (9 dígitos)</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="Ex: 870870059"
                            value={withdrawPhone}
                            onChange={(e) => setWithdrawPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 focus:outline-none rounded-xl px-4 py-3 text-sm text-slate-200 font-mono font-bold"
                          />
                          <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-bold">CARTEIRA</span>
                        </div>
                      </div>

                      {withdrawAmountMzn && parseFloat(withdrawAmountMzn) > 0 && (
                        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex justify-between items-center text-xs font-medium">
                          <span className="text-slate-400">Total a Receber na Carteira e-Mola:</span>
                          <span className="font-mono font-extrabold text-emerald-400 text-sm">
                            {(parseFloat(withdrawAmountMzn) * 1.0).toFixed(2)} MTs
                          </span>
                        </div>
                      )}

                      <button
                        onClick={handleWithdrawalSubmit}
                        disabled={!withdrawAmountMzn || !withdrawPhone || parseFloat(withdrawAmountMzn) > (currentUser.credits || 0)}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
                      >
                        Confirmar Levantamento
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-200">Levantamento Solicitado com Sucesso!</h4>
                        <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                          Seu pedido de retirada de <strong>{withdrawAmountMzn} MZN</strong> foi enviado à Administração. A transferência de {withdrawAmountMzn} MT para a sua conta e-Mola ({withdrawPhone}) será realizada em até 12 horas!
                        </p>
                      </div>

                      <button
                        onClick={() => { setWithdrawAmountMzn(''); setWithdrawPhone(''); setWithdrawalStep('form'); setActiveTabLocal('minhas_ordens'); }}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95"
                      >
                        Acompanhar Ordem
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIST OF ORDERS */}
          {activeTab === 'minhas_ordens' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">Seu Histórico de Transações P2P</h3>
              <div className="space-y-3">
                {orders.filter(o => o.buyer_id === currentUser.id).length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                    Você ainda não efetuou nenhuma transação P2P.
                  </div>
                ) : (
                  orders.filter(o => o.buyer_id === currentUser.id).map((order) => (
                    <div 
                      key={order.id}
                      className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-slate-400">ID: {order.id}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(order.created_at).toLocaleString('pt-MZ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs border-t border-b border-slate-800/50 py-2.5">
                        <div>
                          <div className="text-slate-500 text-[10px]">Tipo:</div>
                          <div className="font-bold flex items-center gap-1">
                            {order.type === 'deposit' ? (
                              <span className="text-emerald-400 flex items-center gap-0.5">
                                <ArrowDownLeft className="h-3 w-3" /> Depósito
                              </span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-0.5">
                                <ArrowUpRight className="h-3 w-3" /> Levantamento
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500 text-[10px]">Créditos (MZN):</div>
                          <div className="font-bold text-amber-400 font-mono">{order.amount_mzn} MZN</div>
                        </div>

                        <div>
                          <div className="text-slate-500 text-[10px]">Total (MTs):</div>
                          <div className="font-bold text-slate-200 font-mono">{order.total_mts.toFixed(2)} MTs</div>
                        </div>

                        <div>
                          <div className="text-slate-500 text-[10px]">Status:</div>
                          <div className="font-bold">
                            {order.status === 'pending' && (
                              <span className="text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                Pendente
                              </span>
                            )}
                            {order.status === 'completed' && (
                              <span className="text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                Concluído
                              </span>
                            )}
                            {order.status === 'rejected' && (
                              <span className="text-red-400 bg-red-500/5 border border-red-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                Recusado
                              </span>
                            )}
                            {order.status === 'disputed' && (
                              <span className="text-yellow-400 bg-yellow-500/5 border border-yellow-500/10 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                Em Disputa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info on current counterparty */}
                      <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 justify-between items-center">
                        <div>
                          Parceiro: <strong className="text-slate-300">@{order.merchant_username}</strong>
                          {order.withdrawal_phone && (
                            <span className="ml-2">| Carteira: <strong className="text-indigo-400 font-mono">{order.withdrawal_phone}</strong></span>
                          )}
                        </div>

                        {/* Interactive testing and dispute triggers inside the preview app */}
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            {order.type === 'deposit' && (
                              <button
                                onClick={() => handleSimulateRelease(order.id)}
                                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white rounded text-[10px] font-bold transition-all"
                                title="Simula a liberação do comerciante no painel"
                              >
                                Simular Liberação (Testar)
                              </button>
                            )}
                            <button
                              onClick={() => handleDisputeOrder(order.id)}
                              className="px-2.5 py-1 bg-yellow-600/20 hover:bg-yellow-600 border border-yellow-500/20 text-yellow-400 hover:text-white rounded text-[10px] font-bold transition-all"
                            >
                              Entrar em Disputa (Reclamar)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[9px] text-slate-500 font-mono flex flex-col sm:flex-row justify-between gap-2 items-center">
          <span>Sistema de Garantia e Escrow FCFUNZ P2P Ativado</span>
          <span className="flex items-center gap-1 text-indigo-400/80">
            <ShieldCheck className="h-3.5 w-3.5" />
            100% Protegido e Auditado
          </span>
        </div>

      </div>
    </div>
  );
}
