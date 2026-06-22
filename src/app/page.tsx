"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  loginAction, 
  fetchUserDataAction, 
  createTransactionAction, 
  createPotAction, 
  topUpEMoneyAction, 
  fetchEstatementAction 
} from "@/app/actions";

// Types
interface Contact {
  id: string;
  name: string;
  accountNo: string;
  bank: string;
  avatar: string;
  color: string;
}

interface Transaction {
  id: string;
  type: "debit" | "credit";
  title: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  recipient?: string;
  bankName?: string;
}

interface CentraPot {
  id: string;
  title: string;
  target: number;
  current: number;
  category: string;
  date: string;
}

export default function Home() {
  // --- Session & Database States ---
  const [loggedInUser, setLoggedInUser] = useState<{
    userId: string;
    name: string;
    accountNo: string;
    birthDate: string;
    age: number;
    isElderly: boolean;
    pin: string;
  } | null>(null);

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [centraPots, setCentraPots] = useState<CentraPot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState<boolean>(true);

  // --- Saved Contacts for quick lookup ---
  const [contacts] = useState<Contact[]>([
    { id: "1", name: "Ahmad Fauzi", accountNo: "8029 1104 55", bank: "Centra", avatar: "AF", color: "bg-emerald-600" },
    { id: "2", name: "Siti Rahma", accountNo: "8029 4920 18", bank: "Centra", avatar: "SR", color: "bg-amber-600" },
    { id: "3", name: "Budi Hartono", accountNo: "0012 9481 05", bank: "BCA", avatar: "BH", color: "bg-blue-800" },
    { id: "4", name: "Dewi Lestari", accountNo: "1092 3840 92", bank: "Mandiri", avatar: "DL", color: "bg-purple-600" },
    { id: "5", name: "Eko Prasetyo", accountNo: "0281 9283 11", bank: "BNI", avatar: "EP", color: "bg-rose-600" },
  ]);

  // --- Mobile Shell States ---
  const [currentScreen, setCurrentScreen] = useState<string>("splash"); // splash, login, dashboard, pin_modal, receipt, feature_sheet, feature_detail, biometric_modal, estatement_view
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [batteryLevel] = useState<number>(94);
  const [simTime, setSimTime] = useState<string>("15:12");
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string; time: string }>>([]);

  // --- E-Money NFC State ---
  const [nfcScanning, setNfcScanning] = useState<boolean>(false);
  const [scannedCard, setScannedCard] = useState<any | null>(null);

  // --- Mode Lansia (Elderly View) Forced Toggle (for demo testing) ---
  const [forceElderlyMode, setForceElderlyMode] = useState<boolean>(false);

  // --- Category / Sheet State ---
  const [selectedCategory, setSelectedCategory] = useState<string>(""); 
  const [selectedSubFeature, setSelectedSubFeature] = useState<string>(""); 

  // --- PIN Entry & Transaction Payload ---
  const [pinInput, setPinInput] = useState<string>("");
  const [pinPurpose, setPinPurpose] = useState<string>(""); 
  const [pinPayload, setPinPayload] = useState<any>(null);
  const [lastTxResult, setLastTxResult] = useState<any>(null);

  // --- Form Input States (Generic) ---
  const [formInputs, setFormInputs] = useState<any>({});

  // --- Audio Synthesizer ---
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- E-statement specific ---
  const [statementData, setStatementData] = useState<any | null>(null);

  const playSound = (type: "click" | "success" | "error" | "biometric") => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      
      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === "success") {
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
        });
      } else if (type === "error") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(170, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.27);
      } else if (type === "biometric") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      }
    } catch (e) {
      console.warn("Audio Context init blocked:", e);
    }
  };

  // Sync Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSimTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Splash Screen Timeout
  useEffect(() => {
    if (currentScreen === "splash") {
      const timer = setTimeout(() => {
        setCurrentScreen("login");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // Formatter for Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Notification Push
  const pushNotification = (text: string) => {
    const id = Date.now();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotifications((prev) => [...prev, { id, text, time }]);
    playSound("biometric");
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // Sync Database user details
  const refreshUserData = async (userId: string) => {
    setIsLoading(true);
    const res = await fetchUserDataAction(userId);
    setIsLoading(false);
    if (res.success) {
      setBalance(res.balance || 0);
      setTransactions(res.transactions || []);
      setCentraPots(res.centraPots || []);
    } else {
      pushNotification(res.error || "Gagal menyinkronkan data database.");
    }
  };

  // Handle Login Authentication
  const handleLogin = async () => {
    const userIdInput = (formInputs.loginUserId || "").trim();
    const passcode = (formInputs.loginPasscode || "").trim();

    if (!userIdInput || !passcode) {
      pushNotification("User ID dan kata sandi harus diisi!");
      return;
    }

    setIsLoading(true);
    const res = await loginAction(userIdInput, passcode);
    setIsLoading(false);

    if (res.success && res.user) {
      setLoggedInUser(res.user);
      // Force elderly mode if user age is 55+ or if already enabled
      if (res.user.isElderly) {
        setForceElderlyMode(true);
        pushNotification(`Mengaktifkan Mode Lansia (Usia ${res.user.age} tahun)`);
      } else {
        setForceElderlyMode(false);
      }
      
      await refreshUserData(res.user.userId);
      setCurrentScreen("dashboard");
      pushNotification(`Selamat datang kembali, ${res.user.name}!`);
    } else {
      playSound("error");
      pushNotification(res.error || "Autentikasi gagal.");
    }
  };

  // PIN Keyboard Input Handlers
  const handlePinPress = (digit: string) => {
    playSound("click");
    if (pinInput.length < 6) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      if (nextPin.length === 6) {
        setTimeout(() => {
          if (loggedInUser && nextPin !== loggedInUser.pin) {
            playSound("error");
            pushNotification("PIN transaksi salah!");
            setPinInput("");
          } else {
            executeFormTransaction();
          }
        }, 300);
      }
    }
  };

  const handlePinBackspace = () => {
    playSound("click");
    setPinInput((prev) => prev.slice(0, -1));
  };

  // --- Dynamic Form Submissions ---
  const launchPinValidation = (purpose: string, payload: any) => {
    setPinPurpose(purpose);
    setPinPayload(payload);
    setPinInput("");
    setCurrentScreen("pin_modal");
  };

  const executeFormTransaction = async () => {
    if (!loggedInUser) return;
    
    const fee = pinPayload.fee || 0;
    const amount = pinPayload.amount || 0;
    const totalDeduction = amount + fee;

    setIsLoading(true);
    
    // Call server action to apply transaction in PostgreSQL
    const res = await createTransactionAction(loggedInUser.userId, {
      id: pinPayload.id,
      type: pinPayload.type,
      title: pinPayload.title,
      category: selectedCategory || "Transaksi",
      amount: amount,
      fee: fee,
      note: pinPayload.note || "Transaksi M-Banking",
      recipient: pinPayload.recipient,
      bankName: pinPayload.bankName
    });

    if (res.success) {
      await refreshUserData(loggedInUser.userId);
      setLastTxResult({
        ...pinPayload,
        date: new Date().toISOString(),
        total: totalDeduction
      });
      playSound("success");
      setCurrentScreen("receipt");
      pushNotification(`Transaksi ${pinPayload.title} berhasil!`);
    } else {
      playSound("error");
      pushNotification(res.error || "Transaksi gagal di database.");
      setCurrentScreen("dashboard");
    }
    setIsLoading(false);
  };

  // Simulated NFC reading for E-money
  const startNfcScanning = (cardType: string) => {
    playSound("click");
    setNfcScanning(true);
    setScannedCard(null);
    setTimeout(() => {
      playSound("biometric");
      setNfcScanning(false);
      setScannedCard({
        type: cardType,
        cardNo: `6088 4910 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        balance: 45000
      });
      pushNotification(`Kartu ${cardType} berhasil dibaca via NFC!`);
    }, 2000);
  };

  // Top up scanned card
  const handleEMoneyTopUp = async (amount: number) => {
    if (!loggedInUser || !scannedCard) return;

    setIsLoading(true);
    const res = await topUpEMoneyAction(loggedInUser.userId, amount, scannedCard.cardNo, scannedCard.type);
    setIsLoading(false);

    if (res.success) {
      await refreshUserData(loggedInUser.userId);
      setScannedCard((prev: any) => ({
        ...prev,
        balance: prev.balance + amount
      }));
      playSound("success");
      pushNotification(`Top Up ${scannedCard.type} sebesar ${formatRupiah(amount)} berhasil!`);
    } else {
      playSound("error");
      pushNotification(res.error || "Top up gagal.");
    }
  };

  // Create CentraPot Saving Pocket
  const handleCreateCentraPot = async () => {
    if (!loggedInUser) return;
    if (!formInputs.potTitle || !formInputs.potTarget) {
      pushNotification("Lengkapi input Pocket!");
      return;
    }

    const potData = {
      id: `pot-${Date.now()}`,
      title: formInputs.potTitle,
      target: Number(formInputs.potTarget),
      category: "Tabungan",
      date: "2027-06-22"
    };

    setIsLoading(true);
    const res = await createPotAction(loggedInUser.userId, potData);
    setIsLoading(false);

    if (res.success) {
      await refreshUserData(loggedInUser.userId);
      setFormInputs({ showNewPotForm: false });
      playSound("success");
      pushNotification(`Pocket "${potData.title}" berhasil dibuat!`);
    } else {
      playSound("error");
      pushNotification(res.error || "Gagal membuat Pocket.");
    }
  };

  // Fetch monthly E-statement
  const handleGenerateEstatement = async () => {
    if (!loggedInUser) return;

    setIsLoading(true);
    const res = await fetchEstatementAction(loggedInUser.userId, formInputs.month || "Juni 2026");
    setIsLoading(false);

    if (res.success && res.transactions) {
      setStatementData({
        month: formInputs.month || "Juni 2026",
        transactions: res.transactions,
        totalDebit: res.totalDebit,
        totalCredit: res.totalCredit
      });
      playSound("success");
      setCurrentScreen("estatement_view");
    } else {
      playSound("error");
      pushNotification("Gagal mengambil laporan E-statement.");
    }
  };

  // Simulated QRIS Trigger
  const triggerDemoQRScan = (merchant: string, amount: number) => {
    playSound("biometric");
    launchPinValidation("qris", {
      id: `QR-${Math.floor(100000 + Math.random() * 900000)}`,
      type: "debit",
      title: `QRIS ${merchant}`,
      amount: amount,
      fee: 0,
      note: "Pembayaran QRIS Centra",
      recipient: merchant
    });
  };

  // --- SVG Logo Component (PT Centurion Bank Brand Navy) ---
  const CentraLogoNavy = ({ className = "w-16 h-16" }: { className?: string }) => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path 
        d="M 142.4 57.6 A 60 60 0 1 0 142.4 142.4" 
        stroke="#002060" 
        strokeWidth="20" 
        strokeLinecap="round" 
        fill="none"
      />
      <circle 
        cx="100" 
        cy="100" 
        r="17" 
        stroke="#002060" 
        strokeWidth="14" 
        fill="none"
      />
      <path 
        d="M 117 100 H 180" 
        stroke="#002060" 
        strokeWidth="14" 
        strokeLinecap="round"
      />
      <rect 
        x="152" 
        y="100" 
        width="18" 
        height="18" 
        fill="#002060" 
        rx="2"
      />
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 lg:p-6 select-none overflow-hidden relative">
      
      {/* Mobile Screen Floating Push Notifications */}
      <div className="absolute top-6 w-full max-w-[360px] z-50 px-4 pointer-events-none flex flex-col items-center gap-2">
        {notifications.map((notif) => (
          <div key={notif.id} className="w-full bg-white text-slate-800 rounded-2xl p-3.5 shadow-xl border-l-4 border-slate-900 flex gap-3 animate-fade-in pointer-events-auto transform translate-y-1">
            <CentraLogoNavy className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-extrabold text-[#002060]">Centra Mobile</span>
                <span className="text-[9px] text-slate-450">{notif.time}</span>
              </div>
              <p className="text-xs mt-1 text-slate-700 font-semibold leading-relaxed">{notif.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Enlarged Android Mockup Shell (Centered) */}
      <div className="relative w-[420px] h-[860px] rounded-[56px] border-[14px] border-slate-900 bg-slate-950 shadow-[0_20px_60px_rgba(0,32,96,0.18)] flex flex-col overflow-hidden ring-4 ring-slate-900/30 shrink-0">
        
        {/* Notch / Camera cutout */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-40 flex items-center justify-between px-4">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60"></div>
          </div>
          <div className="w-16 h-1 bg-slate-900 rounded-full"></div>
        </div>

        {/* Physical Button Visual Guides */}
        <div className="absolute top-32 -left-[14px] w-1.5 h-14 bg-slate-900 rounded-l z-30"></div>
        <div className="absolute top-48 -left-[14px] w-1.5 h-14 bg-slate-900 rounded-l z-30"></div>
        <div className="absolute top-40 -right-[14px] w-1.5 h-16 bg-slate-900 rounded-r z-30"></div>

        {/* App Main UI Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white text-slate-800">
          
          {/* Mock Status Bar */}
          <div className="h-11 px-6 pt-4 flex justify-between items-center z-30 text-xs font-bold text-slate-700 tracking-wide font-mono pointer-events-none">
            <span>{simTime}</span>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 fill-current text-slate-700" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c3.9 3.51 10.29 3.16 13.78-.78l1.82 1.82c1.54-1.23 2.28-3.18 2.28-5.3 0-4.97-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
              </svg>
              <span>LTE</span>
              <div className="flex items-center gap-0.5">
                <div className="w-5 h-2.5 rounded-sm border border-slate-700 p-0.5 flex items-center">
                  <div className="h-full bg-slate-700 rounded-2xs" style={{ width: `${batteryLevel}%` }}></div>
                </div>
                <span className="scale-90">{batteryLevel}%</span>
              </div>
            </div>
          </div>

          {/* Loading Indicator Spinner Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 z-50 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-[#002060] border-t-transparent animate-spin"></div>
              <span className="text-xs font-bold text-[#002060] tracking-wide">Menghubungi Neon Database...</span>
            </div>
          )}

          {/* Core SPA Display Router */}
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative z-10">
            
            {/* 1. SPLASH SCREEN */}
            {currentScreen === "splash" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white animate-fade-in text-center">
                <div className="animate-pulse flex flex-col items-center gap-6">
                  <CentraLogoNavy className="w-24 h-24" />
                  <div>
                    <h2 className="text-3xl font-black text-[#002060] tracking-wider">CENTRA</h2>
                    <p className="text-[10px] font-extrabold tracking-widest text-[#002060]/75 uppercase mt-1">PT Centurion Bank Tbk.</p>
                  </div>
                </div>
                <div className="absolute bottom-20 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full border-2 border-[#002060] border-t-transparent animate-spin"></div>
                  <span className="text-[10px] tracking-widest text-slate-500 font-extrabold uppercase mt-4">Sistem Aman Terverifikasi</span>
                </div>
              </div>
            )}

            {/* 2. LOGIN SCREEN */}
            {currentScreen === "login" && (
              <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in">
                <div className="flex justify-center items-center mt-6">
                  <div className="flex flex-col items-center gap-2">
                    <CentraLogoNavy className="w-16 h-16" />
                    <h3 className="text-2xl font-black tracking-wider text-[#002060]">CENTRA</h3>
                    <span className="text-[9px] font-bold text-slate-450 uppercase -mt-1.5 tracking-wider">PT Centurion Bank Tbk.</span>
                  </div>
                </div>

                <div className="my-auto space-y-5">
                  <div className="text-center space-y-1">
                    <h4 className="text-lg font-bold text-slate-900">Selamat Siang</h4>
                    <p className="text-xs text-slate-500 font-medium">Masuk menggunakan Akun Neon Terdaftar</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">User ID / Kode Akses</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: AMINAH28"
                        onChange={(e) => setFormInputs({ ...formInputs, loginUserId: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#002060] text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Kata Sandi</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        onChange={(e) => setFormInputs({ ...formInputs, loginPasscode: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#002060] text-slate-800"
                      />
                    </div>

                    <button 
                      onClick={handleLogin}
                      className="w-full h-11 rounded-xl bg-[#002060] hover:bg-[#001845] transition-all text-white font-extrabold text-sm flex items-center justify-center glow-navy active:scale-95"
                    >
                      Masuk Rekening
                    </button>

                    <button 
                      onClick={() => setCurrentScreen("biometric_modal")}
                      className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 border border-slate-200"
                    >
                      👁️‍Q Sidik Jari / Face ID
                    </button>
                  </div>
                </div>

                {/* Footnotes */}
                <div className="text-center text-[10px] text-slate-400 font-semibold mt-4">
                  Default login: ID <code className="font-mono bg-slate-100 px-1 rounded text-[#002060]">AMINAH28</code> &amp; Pass <code className="font-mono bg-slate-100 px-1 rounded text-[#002060]">2hanima8*</code>
                </div>
              </div>
            )}

            {/* BIOMETRICS SCAN SCREEN */}
            {currentScreen === "biometric_modal" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white animate-fade-in text-center">
                <div className="relative w-28 h-28 rounded-full border-2 border-[#002060]/20 flex items-center justify-center mb-6">
                  <svg className="w-14 h-14 text-[#002060] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <div className="absolute inset-0 border-2 border-[#002060] rounded-full animate-nfc-pulse pointer-events-none opacity-40"></div>
                </div>
                <h4 className="text-base font-bold text-slate-800">Verifikasi Biometrik</h4>
                <p className="text-xs text-slate-500 mt-2 max-w-[200px] font-medium leading-relaxed">Letakkan jari Anda pada area pemindai sensor sidik jari perangkat</p>
                
                <div className="mt-8 space-y-2.5 w-full">
                  <button 
                    onClick={async () => {
                      // Login Aminah automatically via Biometrics
                      setIsLoading(true);
                      const res = await loginAction("AMINAH28", "2hanima8*");
                      setIsLoading(false);
                      if (res.success && res.user) {
                        setLoggedInUser(res.user);
                        await refreshUserData(res.user.userId);
                        playSound("success");
                        setCurrentScreen("dashboard");
                        pushNotification("Sidik Jari Terverifikasi. Selamat Datang Aminah!");
                      } else {
                        pushNotification("Sidik Jari Gagal.");
                      }
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-650 bg-emerald-600 text-white text-xs font-bold active:scale-95 transition-transform"
                  >
                    Simulasi Sidik Jari Selesai
                  </button>
                  <button 
                    onClick={() => {
                      playSound("click");
                      setCurrentScreen("login");
                    }}
                    className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold active:scale-95 border border-slate-200"
                  >
                    Kembali
                  </button>
                </div>
              </div>
            )}

            {/* 3. INTERACTIVE DASHBOARD VIEW (AGE-BASED RENDERING SWITCH) */}
            {currentScreen === "dashboard" && loggedInUser && (
              <>
                {/* 3A: INTERFACE MODE LANSIA (ELDERLY MODE - AGE 55+) */}
                {forceElderlyMode ? (
                  <div className="flex-1 flex flex-col p-6 animate-fade-in justify-between">
                    
                    {/* Big Header */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <CentraLogoNavy className="w-10 h-10" />
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">MODE LANSIA AKTIF</span>
                      </div>
                      <h3 className="text-2xl font-black text-[#002060] pt-2">Selamat Siang,</h3>
                      <h4 className="text-xl font-bold text-slate-800 leading-tight">Ibu {loggedInUser.name}</h4>
                    </div>

                    {/* Massive balance view */}
                    <div className="p-6 rounded-2xl bg-gradient-to-tr from-[#002060] to-[#0A2540] text-white space-y-2.5 shadow-xl border border-[#002060]">
                      <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Total Uang Anda Saat Ini:</span>
                      <h2 className="text-3xl font-black font-mono leading-none tracking-tight">{formatRupiah(balance)}</h2>
                      <span className="block text-xs font-mono opacity-80 pt-1">No. Rekening: {loggedInUser.accountNo}</span>
                    </div>

                    {/* Simplified Big-Button Grid (Easy to click, large fonts) */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* 1. Kirim Uang */}
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSelectedCategory("Transfer");
                            // Default to in-bank Centra for simplicity
                            setSelectedSubFeature("Antar Rekening Centra");
                            setFormInputs({});
                            setCurrentScreen("feature_detail");
                          }}
                          className="p-5 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 shadow-sm"
                        >
                          <span className="text-4xl">📤</span>
                          <span className="text-sm font-extrabold text-slate-800 text-center tracking-tight">Kirim Uang</span>
                        </button>

                        {/* 2. Tarik Tunai ATM */}
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSelectedCategory("Cardless");
                            setSelectedSubFeature("Tarik tunai");
                            setFormInputs({});
                            setCurrentScreen("feature_detail");
                          }}
                          className="p-5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 shadow-sm"
                        >
                          <span className="text-4xl">💵</span>
                          <span className="text-sm font-extrabold text-slate-800 text-center tracking-tight">Tarik di ATM</span>
                        </button>

                        {/* 3. Bayar Tagihan */}
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSelectedCategory("Tagihan");
                            setSelectedSubFeature("PLN");
                            setFormInputs({});
                            setCurrentScreen("feature_detail");
                          }}
                          className="p-5 bg-amber-55 bg-amber-50 border-2 border-amber-200 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 shadow-sm"
                        >
                          <span className="text-4xl">🧾</span>
                          <span className="text-sm font-extrabold text-slate-800 text-center tracking-tight">Bayar Listrik</span>
                        </button>

                        {/* 4. Rekening Koran */}
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSelectedCategory("Rekening Koran");
                            setSelectedSubFeature("Rekening Koran");
                            setFormInputs({ month: "Juni 2026" });
                            setCurrentScreen("feature_detail");
                          }}
                          className="p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 shadow-sm"
                        >
                          <span className="text-4xl">📄</span>
                          <span className="text-sm font-extrabold text-slate-800 text-center tracking-tight">Cetak Laporan</span>
                        </button>
                      </div>

                      {/* Customer Support Line */}
                      <button 
                        onClick={() => {
                          playSound("click");
                          pushNotification("Menghubungi Layanan Bantuan Khusus Lansia Centra Care (1500-112)");
                        }}
                        className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm active:scale-95 flex items-center justify-center gap-2"
                      >
                        📞 HUBUNGI BANTUAN DARURAT CS
                      </button>
                    </div>

                    {/* Developer Toggle back to standard view */}
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 border-t pt-4">
                      <span>Usia Anda: {loggedInUser.age} tahun</span>
                      <button 
                        onClick={() => {
                          playSound("click");
                          setForceElderlyMode(false);
                          pushNotification("Kembali ke tampilan standar.");
                        }}
                        className="text-[#002060] underline"
                      >
                        Paksa Mode Standar
                      </button>
                    </div>

                  </div>
                ) : (
                  
                  /* 3B: INTERFACE MODE PRODUKTIF (STANDARD COMPLEX 12-MENU GRID) */
                  <div className="flex-1 flex flex-col p-5 animate-fade-in space-y-4">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CentraLogoNavy className="w-8 h-8" />
                        <div>
                          <span className="text-[10px] text-slate-450 block font-bold uppercase tracking-wider">PT Centurion Bank</span>
                          <span className="text-xs font-bold text-slate-800 leading-tight">Halo, {loggedInUser.name}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => pushNotification("Tidak ada pesan baru.")}
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm border border-slate-200 hover:bg-slate-200"
                      >
                        🔔
                      </button>
                    </div>

                    {/* Platinum Card representation */}
                    <div className="h-44 rounded-2xl bg-gradient-to-tr from-[#002060] via-[#0A2540] to-[#002060] p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl"></div>
                      
                      <div className="flex justify-between items-start z-10">
                        <div>
                          <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#FFC80A]">Centra Gold Premium</span>
                          <span className="block text-xs font-bold opacity-80 mt-0.5">Tabungan Centra Utama</span>
                        </div>
                        <span className="text-xs font-black tracking-widest text-[#FFC80A] italic">PREMIUM</span>
                      </div>

                      <div className="my-auto z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black font-mono tracking-tight">
                            {isBalanceVisible ? formatRupiah(balance) : "••••••••"}
                          </span>
                          <button 
                            onClick={() => { playSound("click"); setIsBalanceVisible(!isBalanceVisible); }}
                            className="text-base opacity-90 p-1"
                          >
                            {isBalanceVisible ? "👁️" : "👁️‍Q"}
                          </button>
                        </div>
                        <span className="text-[10px] font-mono opacity-60 tracking-wider">No. Rek: {loggedInUser.accountNo}</span>
                      </div>

                      <div className="flex justify-between items-center text-[8px] opacity-75 font-extrabold tracking-widest z-10 border-t border-white/10 pt-2">
                        <span>{loggedInUser.name.toUpperCase()}</span>
                        <span>CENTURION BANK</span>
                      </div>
                    </div>

                    {/* 12-MENU LAYANAN GRID */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#002060] block mb-1">Daftar Layanan Perbankan</span>
                      
                      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                        
                        {/* Transfer */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Transfer"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-indigo-55 bg-indigo-50 text-[#002060] border border-indigo-100 flex items-center justify-center text-lg shadow-sm">
                            📤
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Transfer</span>
                        </button>

                        {/* Telekomunikasi */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Telekomunikasi"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center text-lg shadow-sm">
                            📱
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Pulsa &amp; Data</span>
                        </button>

                        {/* Tagihan */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Tagihan"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center text-lg shadow-sm">
                            🧾
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Tagihan</span>
                        </button>

                        {/* Keuangan */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Keuangan"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center text-lg shadow-sm">
                            💳
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Keuangan</span>
                        </button>

                        {/* Hiburan */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Hiburan"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center text-lg shadow-sm">
                            🎮
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Hiburan</span>
                        </button>

                        {/* Layanan Pemerintah */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Layanan Pemerintah"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#002060] border border-blue-100 flex items-center justify-center text-lg shadow-sm">
                            🏛️
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Pemerintah</span>
                        </button>

                        {/* Pendidikan & Layanan Sosial */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Pendidikan & Layanan Sosial"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center text-lg shadow-sm">
                            🎓
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Pendidikan</span>
                        </button>

                        {/* Investasi */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Investasi"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-700 border border-orange-100 flex items-center justify-center text-lg shadow-sm">
                            📈
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Investasi</span>
                        </button>

                        {/* Cardless */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Cardless"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-slate-700 border border-zinc-200 flex items-center justify-center text-lg shadow-sm">
                            💵
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Cardless ATM</span>
                        </button>

                        {/* Produk Perbankan */}
                        <button 
                          onClick={() => { playSound("click"); setSelectedCategory("Produk Perbankan"); setCurrentScreen("feature_sheet"); }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center text-lg shadow-sm">
                            🏦
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">Produk Bank</span>
                        </button>

                        {/* E-statement */}
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSelectedCategory("Rekening Koran");
                            setSelectedSubFeature("Rekening Koran");
                            setFormInputs({ month: "Juni 2026" });
                            setCurrentScreen("feature_detail");
                          }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#002060] border border-amber-100 flex items-center justify-center text-lg shadow-sm">
                            📄
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">E-Statement</span>
                        </button>

                        {/* CentraPot saving pockets */}
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSelectedCategory("Produk Perbankan");
                            setSelectedSubFeature("CentraPot");
                            setCurrentScreen("feature_detail");
                          }}
                          className="flex flex-col items-center gap-1.5 active:opacity-75"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-[#002060]/5 text-[#002060] border border-[#002060]/10 flex items-center justify-center text-lg shadow-sm">
                            🏺
                          </div>
                          <span className="text-[9px] font-extrabold text-slate-700 text-center tracking-tight leading-tight">CentraPot</span>
                        </button>

                      </div>
                    </div>

                    {/* Developer panel inside standard view settings */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-500">Demo Testing (Mode Lansia):</span>
                      <button 
                        onClick={() => {
                          playSound("click");
                          setForceElderlyMode(true);
                          pushNotification("Tampilan disesuaikan untuk Lansia.");
                        }}
                        className="text-[#002060] underline"
                      >
                        Aktifkan Mode Lansia
                      </button>
                    </div>

                    {/* Centra Promo Banner */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200/60 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[#002060] flex items-center justify-center text-base shrink-0">
                        ☕
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[10px] font-extrabold text-[#002060] leading-none uppercase">Mitra Kopi Kenangan</h5>
                        <p className="text-[9px] text-slate-500 font-semibold mt-1 truncate">Diskon 50% untuk Kopi Susu Aren via QRIS Centra</p>
                      </div>
                    </div>

                    {/* RIWAYAT MUTASI DARI DATABASE */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#002060]">Riwayat Transaksi (Neon DB)</span>
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSelectedCategory("Rekening Koran");
                            setSelectedSubFeature("Rekening Koran");
                            setFormInputs({ month: "Juni 2026" });
                            setCurrentScreen("feature_detail");
                          }}
                          className="text-[9px] font-bold text-[#002060] hover:underline"
                        >
                          Semua
                        </button>
                      </div>

                      <div className="space-y-1 max-h-[140px] overflow-y-auto no-scrollbar">
                        {transactions.length === 0 ? (
                          <div className="p-3 text-center text-[10px] text-slate-400 italic font-semibold">
                            Belum ada riwayat transaksi.
                          </div>
                        ) : (
                          transactions.slice(0, 3).map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-200/50">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{tx.type === "credit" ? "📥" : "📤"}</span>
                                <div>
                                  <span className="text-[11px] font-bold text-slate-900 block leading-tight">{tx.title}</span>
                                  <span className="text-[9px] text-slate-450 block font-semibold mt-0.5">{tx.category}</span>
                                </div>
                              </div>
                              <span className={`text-[11px] font-bold font-mono ${tx.type === "credit" ? "text-emerald-600" : "text-slate-800"}`}>
                                {tx.type === "credit" ? "+" : "-"}{formatRupiah(tx.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}

            {/* 4. FEATURE SHEET VIEW (SUB-FEATURES GRID SELECT) */}
            {currentScreen === "feature_sheet" && (
              <div className="flex-1 flex flex-col p-5 animate-fade-in space-y-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                    className="text-lg p-1 font-bold text-[#002060]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-base font-bold text-[#002060]">{selectedCategory}</h3>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold">Pilih Layanan yang Anda butuhkan:</p>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* Render specific sub-menus based on category */}
                    {selectedCategory === "Transfer" && (
                      <>
                        <button 
                          onClick={() => { playSound("click"); setSelectedSubFeature("Antar Rekening Centra"); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                        >
                          <span className="text-xs font-bold block text-slate-800">Antar Centra</span>
                          <span className="text-[9px] text-slate-400 block mt-1">Gratis biaya admin</span>
                        </button>
                        <button 
                          onClick={() => { playSound("click"); setSelectedSubFeature("Bank Lain"); setFormInputs({ bank: "BCA" }); setCurrentScreen("feature_detail"); }}
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                        >
                          <span className="text-xs font-bold block text-slate-800">Bank Lain</span>
                          <span className="text-[9px] text-slate-400 block mt-1">Transfer online / BI-Fast</span>
                        </button>
                        <button 
                          onClick={() => { playSound("click"); setSelectedSubFeature("Valas Bank Lain"); setFormInputs({ currency: "USD" }); setCurrentScreen("feature_detail"); }}
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                        >
                          <span className="text-xs font-bold block text-slate-800">Valas Bank Lain</span>
                          <span className="text-[9px] text-slate-400 block mt-1">Kirim mata uang asing</span>
                        </button>
                        <button 
                          onClick={() => { playSound("click"); setSelectedSubFeature("Virtual Account"); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                        >
                          <span className="text-xs font-bold block text-slate-800">Virtual Account</span>
                          <span className="text-[9px] text-slate-400 block mt-1">Pembayaran VA Instan</span>
                        </button>
                      </>
                    )}

                    {selectedCategory === "Telekomunikasi" && (
                      <>
                        {["Paket Data", "Pulsa", "Pascabayar", "E-SIM", "Roaming"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Simulasi pembelian {sub}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Tagihan" && (
                      <>
                        {["PLN", "PDAM", "BPJS", "Internet dan TV Kabel"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Bayar tagihan bulanan {sub}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Keuangan" && (
                      <>
                        {["Kartu Kredit dan Paylater", "E-Wallet", "E-Money Card", "Pinjaman", "Asuransi (mitra)"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">{sub} Services</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Hiburan" && (
                      <>
                        {["Voucher Game", "Voucher Streaming"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Beli voucher instan</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Layanan Pemerintah" && (
                      <>
                        {["PBB", "SIGNAL", "Pajak lain", "MPN"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Setoran &amp; Retribusi {sub}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Pendidikan & Layanan Sosial" && (
                      <>
                        {["Pendidikan", "Zakat"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Pembayaran {sub}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Investasi" && (
                      <>
                        {["Reksa Dana", "Obligasi & SBN Pasar Perdana", "Obligasi & SBN Pasar Sekunder"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Beli instrumen {sub}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Cardless" && (
                      <>
                        {["Tarik tunai", "Setor tunai"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Transaksi ATM Tanpa Kartu</span>
                          </button>
                        ))}
                      </>
                    )}

                    {selectedCategory === "Produk Perbankan" && (
                      <>
                        {["Kartu kredit", "Paylater", "CentraPot", "Deposito", "Kredit konsumen (rumah, kendaraan)", "Asuransi (mitra)"].map(sub => (
                          <button
                            key={sub}
                            onClick={() => { playSound("click"); setSelectedSubFeature(sub); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#002060] active:scale-98 transition-all"
                          >
                            <span className="text-xs font-bold block text-slate-800">{sub}</span>
                            <span className="text-[9px] text-slate-400 block mt-1">Pembukaan {sub}</span>
                          </button>
                        ))}
                      </>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* 5. INTERACTIVE FEATURE SUB-FORM / DETAIL */}
            {currentScreen === "feature_detail" && (
              <div className="flex-1 flex flex-col p-5 animate-fade-in space-y-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      playSound("click");
                      setScannedCard(null);
                      if (selectedCategory === "Rekening Koran") {
                        setCurrentScreen("dashboard");
                      } else {
                        setCurrentScreen("feature_sheet");
                      }
                    }}
                    className="text-lg p-1 font-bold text-[#002060]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">{selectedCategory}</h3>
                </div>

                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-base font-bold text-slate-800 leading-none">{selectedSubFeature}</h4>
                </div>

                {/* DYNAMIC FORMS ACCORDING TO SUB-FEATURE */}
                <div className="space-y-4 flex-1">
                  
                  {/* TRANSFER - ANTAR REKENING CENTRA */}
                  {selectedSubFeature === "Antar Rekening Centra" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Rekening Tujuan</label>
                        <input 
                          type="text" 
                          placeholder="Masukkan No Rekening Centra"
                          value={formInputs.accNo || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, accNo: e.target.value.replace(/[^0-9]/g, "") })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#002060] text-slate-850"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jumlah Transfer (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Min Rp 10.000"
                          value={formInputs.amount || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#002060] text-slate-850"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (!formInputs.accNo || !formInputs.amount || formInputs.amount < 10000) {
                            pushNotification("Masukkan no rekening dan nominal min Rp 10.000");
                            return;
                          }
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Trsf Centra ke ${formInputs.accNo}`,
                            amount: formInputs.amount,
                            recipient: formInputs.accNo,
                            fee: 0
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Kirim Dana
                      </button>
                    </div>
                  )}

                  {/* TRANSFER - BANK LAIN */}
                  {selectedSubFeature === "Bank Lain" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Pilih Bank</label>
                        <select 
                          value={formInputs.bank || "BCA"}
                          onChange={(e) => setFormInputs({ ...formInputs, bank: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none text-slate-850"
                        >
                          <option value="BCA">BCA (Bank Central Asia)</option>
                          <option value="Mandiri">Bank Mandiri</option>
                          <option value="BNI">BNI (Bank Negara Indonesia)</option>
                          <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nomor Rekening</label>
                        <input 
                          type="text" 
                          placeholder="Masukkan No Rekening"
                          value={formInputs.accNo || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, accNo: e.target.value.replace(/[^0-9]/g, "") })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#002060] text-slate-850"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nominal (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Min Rp 10.000"
                          value={formInputs.amount || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#002060] text-slate-850"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-450">
                        <span>Biaya Admin (BI-Fast)</span>
                        <span className="text-emerald-600">Rp 2.500</span>
                      </div>
                      <button 
                        onClick={() => {
                          if (!formInputs.accNo || !formInputs.amount || formInputs.amount < 10000) {
                            pushNotification("Masukkan no rekening dan nominal min Rp 10.000");
                            return;
                          }
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Trsf ${formInputs.bank} ke ${formInputs.accNo}`,
                            amount: formInputs.amount,
                            recipient: formInputs.accNo,
                            fee: 2500,
                            bankName: formInputs.bank
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Kirim Dana
                      </button>
                    </div>
                  )}

                  {/* TRANSFER - VALAS BANK LAIN (Foreign Exchange) */}
                  {selectedSubFeature === "Valas Bank Lain" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Mata Uang Tujuan</label>
                        <select 
                          value={formInputs.currency || "USD"}
                          onChange={(e) => setFormInputs({ ...formInputs, currency: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none text-slate-850"
                        >
                          <option value="USD">USD (Dolar Amerika) - Kurs Rp 16.350</option>
                          <option value="SGD">SGD (Dolar Singapura) - Kurs Rp 12.100</option>
                          <option value="EUR">EUR (Euro) - Kurs Rp 17.500</option>
                          <option value="JPY">JPY (Yen Jepang) - Kurs Rp 102</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nominal Asing</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="Contoh: 100"
                            value={formInputs.valasAmount || ""}
                            onChange={(e) => setFormInputs({ ...formInputs, valasAmount: parseFloat(e.target.value) })}
                            className="flex-1 h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#002060] text-slate-850"
                          />
                          <span className="h-10 px-3 bg-slate-100 flex items-center justify-center font-bold text-xs rounded-lg text-slate-600">
                            {formInputs.currency || "USD"}
                          </span>
                        </div>
                      </div>

                      {/* Display Conversion */}
                      {formInputs.valasAmount > 0 && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-550">Estimasi Kurs</span>
                            <span className="font-bold">
                              1 {formInputs.currency} = {formatRupiah(formInputs.currency === "USD" ? 16350 : formInputs.currency === "SGD" ? 12100 : formInputs.currency === "EUR" ? 17500 : 102)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                            <span className="text-slate-550">Ekuivalen Rupiah</span>
                            <span className="text-[#002060]">
                              {formatRupiah(
                                formInputs.valasAmount * 
                                (formInputs.currency === "USD" ? 16350 : formInputs.currency === "SGD" ? 12100 : formInputs.currency === "EUR" ? 17500 : 102)
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          const valasMultiplier = formInputs.currency === "USD" ? 16350 : formInputs.currency === "SGD" ? 12100 : formInputs.currency === "EUR" ? 17500 : 102;
                          const calculatedIdr = (formInputs.valasAmount || 0) * valasMultiplier;
                          
                          if (calculatedIdr < 10000) {
                            pushNotification("Masukkan jumlah transfer valas yang valid");
                            return;
                          }
                          
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Kirim Valas ${formInputs.valasAmount} ${formInputs.currency}`,
                            amount: calculatedIdr,
                            fee: 25000, 
                            note: `Swift Transfer ${formInputs.currency}`
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Kirim Remitansi Valas
                      </button>
                    </div>
                  )}

                  {/* VIRTUAL ACCOUNT */}
                  {selectedSubFeature === "Virtual Account" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nomor Virtual Account</label>
                        <input 
                          type="text" 
                          placeholder="Contoh: 8029 0812 3456"
                          value={formInputs.vaNo || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, vaNo: e.target.value.replace(/[^0-9]/g, "") })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#002060]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jumlah Bayar (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Nominal Pembayaran"
                          value={formInputs.amount || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#002060]"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          if (!formInputs.vaNo || !formInputs.amount) {
                            pushNotification("Masukkan nomor VA dan nominal");
                            return;
                          }
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Bayar VA ${formInputs.vaNo}`,
                            amount: formInputs.amount,
                            recipient: formInputs.vaNo,
                            fee: 0
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Konfirmasi VA
                      </button>
                    </div>
                  )}

                  {/* TELEKOMUNIKASI - PULSA */}
                  {selectedSubFeature === "Pulsa" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nomor Handphone</label>
                        <input 
                          type="text" 
                          placeholder="08xxxxxxxxxx"
                          value={formInputs.phone || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, phone: e.target.value.replace(/[^0-9]/g, "") })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#002060]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nominal Pulsa</label>
                        <select 
                          value={formInputs.amount || 25000}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseInt(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none text-slate-850"
                        >
                          <option value={25000}>Rp 25.000 (Harga: Rp 25.000)</option>
                          <option value={50000}>Rp 50.000 (Harga: Rp 50.000)</option>
                          <option value={100000}>Rp 100.000 (Harga: Rp 100.000)</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          if (!formInputs.phone) {
                            pushNotification("Masukkan nomor HP");
                            return;
                          }
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Beli Pulsa ${formInputs.phone}`,
                            amount: formInputs.amount || 25000,
                            recipient: formInputs.phone,
                            fee: 0
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Beli Pulsa
                      </button>
                    </div>
                  )}

                  {/* TELEKOMUNIKASI - eSIM */}
                  {selectedSubFeature === "E-SIM" && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-normal">
                        Dapatkan profil E-SIM digital instan untuk konektivitas seluler terintegrasi.
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Pilih Operator</label>
                        <select 
                          value={formInputs.operator || "Telkomsel"}
                          onChange={(e) => setFormInputs({ ...formInputs, operator: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none text-slate-850"
                        >
                          <option value="Telkomsel">Telkomsel Lite eSIM - Rp 50.000</option>
                          <option value="Indosat">Indosat IM3 eSIM - Rp 45.000</option>
                          <option value="XL">XL Axiata eSIM - Rp 48.000</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Email untuk Pengiriman Profile</label>
                        <input 
                          type="email" 
                          placeholder="name@email.com"
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const eSIMPrice = formInputs.operator === "Indosat" ? 45000 : formInputs.operator === "XL" ? 48000 : 50000;
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Beli eSIM ${formInputs.operator || "Telkomsel"}`,
                            amount: eSIMPrice,
                            fee: 0,
                            note: "Pengiriman profil via Email"
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Beli E-SIM
                      </button>
                    </div>
                  )}

                  {/* KEUANGAN - E-MONEY CARD SIMULATION (NFC TAP CHECKOUT) */}
                  {selectedSubFeature === "E-Money Card" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-[#002060]/5 rounded-xl border border-[#002060]/10 text-xs text-slate-650 leading-normal">
                        Simulasikan pembacaan chip kartu uang elektronik (CentraPay, Flazz, TapCash, E-Money) via sensor NFC smartphone Anda.
                      </div>

                      {!scannedCard && !nfcScanning && (
                        <div className="space-y-2">
                          <label className="block text-[9px] font-extrabold text-slate-550 uppercase tracking-wider">Pilih Jenis Kartu</label>
                          <div className="grid grid-cols-2 gap-2">
                            {["CentraPay", "Flazz BCA", "Mandiri E-Money", "TapCash BNI"].map(card => (
                              <button
                                key={card}
                                onClick={() => startNfcScanning(card)}
                                className="p-3 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 hover:border-[#002060] transition-colors"
                              >
                                {card}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {nfcScanning && (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                          <div className="relative w-20 h-20 rounded-full bg-[#002060]/10 flex items-center justify-center mb-4">
                            <span className="text-xl">📡</span>
                            <div className="absolute inset-0 rounded-full border-2 border-[#002060] animate-nfc-pulse"></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700">Mendekatkan Kartu ke Sensor NFC...</span>
                          <span className="text-[10px] text-slate-450 mt-1">Jangan pindahkan kartu Anda</span>
                        </div>
                      )}

                      {scannedCard && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white flex flex-col justify-between h-32 relative">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-extrabold tracking-wider">{scannedCard.type}</span>
                              <span className="text-sm">🛜</span>
                            </div>
                            <div>
                              <span className="block text-[10px] opacity-60 font-mono">{scannedCard.cardNo}</span>
                              <span className="block text-base font-bold font-mono mt-1">{formatRupiah(scannedCard.balance)}</span>
                            </div>
                            <div className="absolute bottom-2 right-4 text-[8px] opacity-40 font-bold">NFC ENABLED</div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Top Up Kartu Ini</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[20000, 50000, 100000].map(amt => (
                                <button
                                  key={amt}
                                  onClick={() => handleEMoneyTopUp(amt)}
                                  className="py-2 text-[10px] font-bold border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 text-slate-850"
                                >
                                  +{formatRupiah(amt).replace("Rp", "").trim()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => setScannedCard(null)}
                            className="w-full py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600"
                          >
                            Lepas Kartu
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PENDIDIKAN & SOSIAL - ZAKAT */}
                  {selectedSubFeature === "Zakat" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jenis Zakat</label>
                        <select 
                          value={formInputs.zakatType || "Zakat Penghasilan"}
                          onChange={(e) => setFormInputs({ ...formInputs, zakatType: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none text-slate-850"
                        >
                          <option value="Zakat Penghasilan">Zakat Profesi / Penghasilan</option>
                          <option value="Zakat Maal">Zakat Maal (Harta)</option>
                          <option value="Zakat Fitrah">Zakat Fitrah</option>
                        </select>
                      </div>

                      {formInputs.zakatType !== "Zakat Fitrah" ? (
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jumlah Pendapatan Bulanan (Rp)</label>
                          <input 
                            type="number" 
                            placeholder="Contoh: 10000000"
                            value={formInputs.income || ""}
                            onChange={(e) => {
                              const inc = parseFloat(e.target.value) || 0;
                              setFormInputs({ 
                                ...formInputs, 
                                income: inc,
                                amount: Math.floor(inc * 0.025) 
                              });
                            }}
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jumlah Jiwa</label>
                          <input 
                            type="number" 
                            placeholder="Contoh: 4"
                            value={formInputs.members || ""}
                            onChange={(e) => {
                              const mbr = parseInt(e.target.value) || 0;
                              setFormInputs({
                                ...formInputs,
                                members: mbr,
                                amount: mbr * 45000 
                              });
                            }}
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none"
                          />
                        </div>
                      )}

                      {formInputs.amount > 0 && (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center text-xs font-bold">
                          <span className="text-emerald-700">Wajib Zakat:</span>
                          <span className="text-emerald-800 font-mono">{formatRupiah(formInputs.amount)}</span>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          if (!formInputs.amount || formInputs.amount <= 0) {
                            pushNotification("Lengkapi input kalkulator Zakat");
                            return;
                          }
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Bayar ${formInputs.zakatType || "Zakat"}`,
                            amount: formInputs.amount,
                            fee: 0,
                            note: "Pembayaran Zakat Centra Care"
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Bayar Zakat Sekarang
                      </button>
                    </div>
                  )}

                  {/* LAYANAN PEMERINTAH - SIGNAL */}
                  {selectedSubFeature === "SIGNAL" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nomor Registrasi Kendaraan (Pelat Nomor)</label>
                        <input 
                          type="text" 
                          placeholder="B 1234 ABC"
                          value={formInputs.plate || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, plate: e.target.value.toUpperCase() })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">NIK Pemilik Kendaraan</label>
                        <input 
                          type="text" 
                          placeholder="317xxxxxxxxxxxxx"
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none"
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          if (!formInputs.plate) {
                            pushNotification("Masukkan nomor pelat kendaraan");
                            return;
                          }
                          setFormInputs({
                            ...formInputs,
                            taxBill: 345000,
                            vehicle: "Honda Vario 150 (2020)"
                          });
                          pushNotification("Tagihan Pajak Ditemukan!");
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060]/10 text-[#002060] text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Cek Tagihan Pajak
                      </button>

                      {formInputs.taxBill && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Kendaraan:</span>
                            <span className="font-bold text-slate-800">{formInputs.vehicle}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                            <span className="text-slate-550">Pajak PKB + SWDKLLJ:</span>
                            <span className="text-[#002060] font-mono">{formatRupiah(formInputs.taxBill)}</span>
                          </div>
                          
                          <button 
                            onClick={() => {
                              launchPinValidation("transfer", {
                                id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                                type: "debit",
                                title: `Pajak SIGNAL ${formInputs.plate}`,
                                amount: formInputs.taxBill,
                                fee: 5000,
                                recipient: formInputs.plate
                              });
                            }}
                            className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95 mt-2"
                          >
                            Bayar Pajak
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* REKENING KORAN (E-STATEMENT GENERATOR) */}
                  {selectedSubFeature === "Rekening Koran" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Pilih Bulan E-statement</label>
                        <select 
                          value={formInputs.month || "Juni 2026"}
                          onChange={(e) => setFormInputs({ ...formInputs, month: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none text-slate-850"
                        >
                          <option value="Juni 2026">Juni 2026</option>
                          <option value="Mei 2026">Mei 2026</option>
                          <option value="April 2026">April 2026</option>
                        </select>
                      </div>

                      <button 
                        onClick={handleGenerateEstatement}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Generate E-Statement
                      </button>
                    </div>
                  )}

                  {/* CARDLESS - TARIK TUNAI / SETOR TUNAI */}
                  {selectedSubFeature === "Tarik tunai" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Pilih Nominal Penarikan</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[100000, 200000, 500000, 1000000].map(amt => (
                            <button
                              key={amt}
                              onClick={() => setFormInputs({ ...formInputs, selectedAmt: amt })}
                              className={`p-3 text-center rounded-xl border text-xs font-bold font-mono transition-all ${formInputs.selectedAmt === amt ? "bg-[#002060] border-[#002060] text-white" : "bg-white border-slate-200 text-slate-850"}`}
                            >
                              {formatRupiah(amt).replace("Rp", "").trim()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (!formInputs.selectedAmt) {
                            pushNotification("Pilih nominal transaksi!");
                            return;
                          }
                          launchPinValidation("withdraw", {
                            id: `WD-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Tarik Tunai Cardless`,
                            amount: formInputs.selectedAmt,
                            fee: 0,
                            note: "Tarik Tunai ATM"
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Dapatkan Kode Penarikan ATM
                      </button>
                    </div>
                  )}

                  {selectedSubFeature === "Setor tunai" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-normal">
                        Simulasikan penyetoran uang kertas pecahan Rp 50.000 / Rp 100.000 langsung ke rekening utama Anda.
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jumlah Setor (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Masukkan Nominal Setoran"
                          value={formInputs.selectedAmt || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, selectedAmt: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none"
                        />
                      </div>

                      <button 
                        onClick={() => {
                          if (!formInputs.selectedAmt || formInputs.selectedAmt <= 0) {
                            pushNotification("Masukkan nominal setoran!");
                            return;
                          }
                          launchPinValidation("withdraw", {
                            id: `SD-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "credit",
                            title: `Setor Tunai Cardless`,
                            amount: formInputs.selectedAmt,
                            fee: 0,
                            note: "Setor Tunai ATM"
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Konfirmasi Setor Tunai
                      </button>
                    </div>
                  )}

                  {/* PRODUK BANK - CENTRAPOT */}
                  {selectedSubFeature === "CentraPot" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-[#002060]/5 rounded-xl border border-[#002060]/10 text-xs text-slate-650 leading-normal">
                        <strong>CentraPot</strong> membantu Anda menyisihkan tabungan khusus untuk pos tertentu seperti liburan, beli gadget, atau investasi.
                      </div>

                      {!formInputs.showNewPotForm ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                            <span>Daftar Saving Pockets (Neon DB)</span>
                            <button 
                              onClick={() => setFormInputs({ ...formInputs, showNewPotForm: true })}
                              className="text-xs font-bold text-[#002060] hover:underline"
                            >
                              + Buat Pocket
                            </button>
                          </div>

                          <div className="space-y-2">
                            {centraPots.length === 0 ? (
                              <div className="p-4 text-center text-[10px] text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                                Belum ada pocket tabungan dibuat.
                              </div>
                            ) : (
                              centraPots.map(pot => (
                                <div key={pot.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-850">
                                    <span>{pot.title}</span>
                                    <span className="text-[#002060] font-mono">{formatRupiah(pot.current)} / {formatRupiah(pot.target).replace("Rp", "").trim()}</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (pot.current / pot.target) * 100)}%` }}></div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 animate-fade-in bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <span className="block text-xs font-bold text-[#002060] border-b pb-1">Pocket Baru</span>
                          
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-550 uppercase mb-1">Nama Pocket</label>
                            <input 
                              type="text" 
                              placeholder="Contoh: Beli Laptop Baru"
                              value={formInputs.potTitle || ""}
                              onChange={(e) => setFormInputs({ ...formInputs, potTitle: e.target.value })}
                              className="w-full h-9 px-3 rounded-lg border bg-white text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-555 uppercase mb-1">Target Saldo (Rp)</label>
                            <input 
                              type="number" 
                              placeholder="Contoh: 10000000"
                              value={formInputs.potTarget || ""}
                              onChange={(e) => setFormInputs({ ...formInputs, potTarget: parseFloat(e.target.value) })}
                              className="w-full h-9 px-3 rounded-lg border bg-white text-xs focus:outline-none"
                            />
                          </div>

                          <button 
                            onClick={handleCreateCentraPot}
                            className="w-full py-2 bg-[#002060] text-white text-xs font-bold rounded-lg active:scale-95 mt-1"
                          >
                            Simpan Pocket
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PRODUK BANK - DEPOSITO INTEREST CALCULATOR */}
                  {selectedSubFeature === "Deposito" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-550 uppercase mb-1">Pokok Deposito (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Min Rp 10.000.000"
                          value={formInputs.depoPrincipal || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setFormInputs({ 
                              ...formInputs, 
                              depoPrincipal: val,
                              interest: Math.floor(val * 0.055 * (1/12)) 
                            });
                          }}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-550 uppercase mb-1">Tenor Deposito</label>
                        <select 
                          value={formInputs.depoTenure || "3 Bulan"}
                          onChange={(e) => setFormInputs({ ...formInputs, depoTenure: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none text-slate-850"
                        >
                          <option value="1 Bulan">1 Bulan (Suku Bunga 5.25% p.a.)</option>
                          <option value="3 Bulan">3 Bulan (Suku Bunga 5.50% p.a.)</option>
                          <option value="6 Bulan">6 Bulan (Suku Bunga 5.75% p.a.)</option>
                          <option value="12 Bulan">12 Bulan (Suku Bunga 6.00% p.a.)</option>
                        </select>
                      </div>

                      {formInputs.depoPrincipal >= 10000000 && (
                        <div className="p-3 bg-[#002060]/5 border border-[#002060]/10 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Estimasi Bunga Kotor/Bulan:</span>
                            <span className="font-bold font-mono text-[#002060]">{formatRupiah(formInputs.interest)}</span>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          if (!formInputs.depoPrincipal || formInputs.depoPrincipal < 10000000) {
                            pushNotification("Minimum penempatan deposito adalah Rp 10.000.000");
                            return;
                          }
                          launchPinValidation("transfer", {
                            id: `DP-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Deposito ${formInputs.depoTenure}`,
                            amount: formInputs.depoPrincipal,
                            fee: 0,
                            note: "Deposito Berjangka Online"
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Buka Deposito Sekarang
                      </button>
                    </div>
                  )}

                  {/* Standard placeholder for other subfeatures */}
                  {!["Antar Rekening Centra", "Bank Lain", "Valas Bank Lain", "Virtual Account", "Pulsa", "E-SIM", "E-Money Card", "Zakat", "SIGNAL", "Rekening Koran", "Tarik tunai", "Setor tunai", "CentraPot", "Deposito"].includes(selectedSubFeature) && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2 text-xs">
                        <span className="text-2xl">⚙️</span>
                        <h6 className="font-bold text-slate-800">Form Layanan Simulasi</h6>
                        <p className="text-slate-550 leading-normal">Masukkan parameter nominal di bawah ini untuk mengonfirmasi transaksi simulasi di database.</p>
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-555 uppercase mb-1">Nominal Transaksi (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Masukkan Nominal"
                          value={formInputs.amount || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none"
                        />
                      </div>

                      <button 
                        onClick={() => {
                          if (!formInputs.amount || formInputs.amount <= 0) {
                            pushNotification("Masukkan nominal transaksi!");
                            return;
                          }
                          launchPinValidation("transfer", {
                            id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
                            type: "debit",
                            title: `Bayar ${selectedSubFeature}`,
                            amount: formInputs.amount,
                            fee: 1500,
                            recipient: `Ref: ${Math.floor(1000 + Math.random() * 9000)}`
                          });
                        }}
                        className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Proses Pembayaran
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* E-STATEMENT LEDGER DETAILED VIEW SCREEN */}
            {currentScreen === "estatement_view" && statementData && (
              <div className="flex-1 flex flex-col p-5 animate-fade-in space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <button 
                    onClick={() => { playSound("click"); setCurrentScreen("feature_detail"); }}
                    className="text-lg p-1 font-bold text-[#002060]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-base font-bold text-[#002060]">E-Statement Ledger</h3>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-[10px] font-sans">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div>
                      <span className="font-extrabold text-[#002060] block text-xs">LAPORAN MUTASI REKENING KORAN</span>
                      <span className="text-[8px] text-slate-400 font-mono">Bulan: {statementData.month}</span>
                    </div>
                    <CentraLogoNavy className="w-6 h-6 animate-pulse" />
                  </div>

                  <div className="space-y-1.5 font-mono text-[9px] border-b pb-2">
                    <div className="flex justify-between">
                      <span>Nama Pemilik:</span>
                      <span className="font-bold text-slate-800">{loggedInUser?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>No Rekening:</span>
                      <span className="font-bold text-slate-800">{loggedInUser?.accountNo}</span>
                    </div>
                    <div className="flex justify-between text-emerald-650 text-emerald-600">
                      <span>Total Masuk (+):</span>
                      <span>{formatRupiah(statementData.totalCredit)}</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>Total Keluar (-):</span>
                      <span>{formatRupiah(statementData.totalDebit)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar">
                    {statementData.transactions.length === 0 ? (
                      <div className="text-center italic text-slate-450">Tidak ada transaksi di bulan ini.</div>
                    ) : (
                      statementData.transactions.map((t: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start border-b border-slate-100 pb-1.5 font-mono text-[8px]">
                          <div>
                            <span className="font-bold text-slate-850 block">{t.title}</span>
                            <span className="text-[7px] text-slate-400 block">{new Date(t.date).toLocaleDateString("id-ID")}</span>
                          </div>
                          <span className={t.type === "credit" ? "text-emerald-600" : "text-slate-700"}>
                            {t.type === "credit" ? "+" : "-"}{formatRupiah(t.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      playSound("click");
                      pushNotification("E-statement PDF berhasil disimpan ke folder Download.");
                    }}
                    className="w-full py-2 bg-slate-200 hover:bg-slate-350 text-slate-750 text-[9px] font-bold rounded"
                  >
                    Unduh Laporan PDF
                  </button>
                </div>
              </div>
            )}

            {/* 6. PIN TRANSKEYPAD MODAL */}
            {currentScreen === "pin_modal" && (
              <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in bg-slate-900 text-white">
                <div className="text-center mt-6">
                  <h3 className="text-base font-extrabold text-white">PIN Transaksi</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Masukkan 6 digit PIN untuk menyelesaikan transaksi Anda</p>
                  
                  <div className="flex justify-center gap-3.5 mt-8">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={`w-3.5 h-3.5 rounded-full border-2 border-yellow-500 transition-all ${pinInput.length > i ? "bg-yellow-500" : ""}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto mb-8 font-semibold">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button 
                      key={num} 
                      onClick={() => handlePinPress(num)}
                      className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xl flex items-center justify-center pin-btn"
                    >
                      {num}
                    </button>
                  ))}
                  <button 
                    onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                    className="w-16 h-16 rounded-full bg-slate-900 text-slate-400 text-xs flex items-center justify-center hover:text-white"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => handlePinPress("0")}
                    className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 text-white font-mono font-bold text-xl flex items-center justify-center pin-btn"
                  >
                    0
                  </button>
                  <button 
                    onClick={handlePinBackspace}
                    className="w-16 h-16 rounded-full bg-slate-900 text-slate-400 text-sm flex items-center justify-center hover:text-white"
                  >
                    &larr;
                  </button>
                </div>
              </div>
            )}

            {/* 7. DIGITAL RECEIPT (SUCCESS VIEW) */}
            {currentScreen === "receipt" && lastTxResult && (
              <div className="flex-1 flex flex-col justify-between p-5 animate-fade-in">
                <div className="flex-1 flex flex-col items-center justify-center mt-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-scale-up">
                    <svg className="w-9 h-9 text-slate-955" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest block">Transaksi Sukses</span>
                    <h4 className="text-xl font-black text-slate-900 mt-1">{formatRupiah(lastTxResult.amount)}</h4>
                  </div>

                  <div className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Tujuan</span>
                      <span className="text-slate-900 font-bold">{lastTxResult.title}</span>
                    </div>
                    {lastTxResult.recipient && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">No. Penerima/Ref</span>
                        <span className="text-slate-900 font-mono font-bold">{lastTxResult.recipient}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Nomor Resi</span>
                      <span className="text-slate-900 font-mono font-semibold">{lastTxResult.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Tanggal</span>
                      <span className="text-slate-900 font-bold">
                        {new Date(lastTxResult.date).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    {lastTxResult.note && lastTxResult.note.includes("ATM") && (
                      <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-center mt-2 space-y-1">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Kode Token ATM</span>
                        <span className="block text-2xl font-black font-mono text-[#002060] tracking-widest">
                          {Math.floor(100000 + Math.random() * 900000)}
                        </span>
                        <span className="block text-[8px] text-slate-400">Gunakan di ATM Centurion, berlaku 5 menit</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                      <span className="text-slate-500">Total Transaksi</span>
                      <span className="text-[#002060] font-mono">{formatRupiah(lastTxResult.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button 
                    onClick={() => { playSound("click"); pushNotification("Resi PDF berhasil disimpan!"); }}
                    className="py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold active:scale-95"
                  >
                    Simpan Resi
                  </button>
                  <button 
                    onClick={() => {
                      playSound("click");
                      setScannedCard(null);
                      setCurrentScreen("dashboard");
                    }}
                    className="py-3 rounded-xl bg-[#002060] text-white text-xs font-extrabold active:scale-95"
                  >
                    Kembali
                  </button>
                </div>
              </div>
            )}

            {/* 8. QRIS 4-MODES SCREEN */}
            {currentScreen === "qris" && (
              <div className="flex-1 flex flex-col p-5 animate-fade-in space-y-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                    className="text-lg p-1 font-bold text-[#002060]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-base font-bold text-[#002060]">Layanan QRIS</h3>
                </div>

                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  {["Scan", "Pay", "Transfer", "Tap"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => { playSound("click"); setFormInputs({ ...formInputs, qrisMode: mode }); }}
                      className={`py-1.5 text-[9px] font-extrabold rounded-lg transition-all ${
                        (formInputs.qrisMode || "Scan") === mode ? "bg-[#002060] text-white shadow" : "text-slate-500"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* QRIS SCAN MODE */}
                {(formInputs.qrisMode === "Scan" || !formInputs.qrisMode) && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                      <div className="absolute left-4 right-4 h-0.5 bg-[#f43f5e] animate-scan z-20 shadow-[0_0_10px_rgba(244,63,94,1)]"></div>
                      <div className="absolute w-52 h-52 border border-yellow-500 rounded-lg flex items-center justify-center animate-laser-pulse z-10">
                        <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">Arahkan ke QRIS</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-550">Simulasi Merchant Terdekat</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => triggerDemoQRScan("Kopi Kenangan", 32000)}
                          className="p-3 text-left rounded-xl bg-slate-50 border border-slate-250 active:scale-95"
                        >
                          <span className="text-xs font-bold block text-slate-800">Kopi Kenangan</span>
                          <span className="text-[9px] text-[#002060] font-mono block mt-0.5">Rp 32.000</span>
                        </button>
                        <button 
                          onClick={() => triggerDemoQRScan("Super Indo", 145000)}
                          className="p-3 text-left rounded-xl bg-slate-50 border border-slate-250 active:scale-95"
                        >
                          <span className="text-xs font-bold block text-slate-800">Super Indo</span>
                          <span className="text-[9px] text-[#002060] font-mono block mt-0.5">Rp 145.000</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* QRIS PAY MODE */}
                {formInputs.qrisMode === "Pay" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <span className="text-xs font-semibold text-slate-550">Tunjukkan barcode ini kepada kasir</span>
                    
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center">
                      <svg className="w-44 h-44 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                        <rect x="10" y="10" width="20" height="20" />
                        <rect x="15" y="15" width="10" height="10" fill="white" />
                        <rect x="70" y="10" width="20" height="20" />
                        <rect x="75" y="15" width="10" height="10" fill="white" />
                        <rect x="10" y="70" width="20" height="20" />
                        <rect x="15" y="75" width="10" height="10" fill="white" />
                        <rect x="40" y="40" width="20" height="20" />
                        <rect x="35" y="20" width="30" height="10" />
                        <rect x="20" y="45" width="15" height="15" />
                        <rect x="65" y="45" width="15" height="25" />
                        <rect x="45" y="65" width="15" height="15" />
                      </svg>
                      <span className="text-xs font-mono font-bold text-slate-600 mt-3">8029 4810 2219 90</span>
                    </div>

                    <span className="text-[10px] text-slate-400 italic">Kode diperbarui otomatis dalam 45 detik</span>
                  </div>
                )}

                {/* QRIS TRANSFER MODE */}
                {formInputs.qrisMode === "Transfer" && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 text-xs">
                      <span className="text-2xl">📱</span>
                      <h6 className="font-bold text-slate-800">Transfer Sesama QRIS</h6>
                      <p className="text-slate-550">Masukkan Kode QRIS Penerima untuk memicu transfer saldo.</p>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-555 uppercase mb-1">Kode QRIS Penerima</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 936002060xxxxx"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none"
                      />
                    </div>

                    <button 
                      onClick={() => {
                        playSound("click");
                        launchPinValidation("qris", {
                          id: `QR-${Math.floor(100000 + Math.random() * 900000)}`,
                          type: "debit",
                          title: "QRIS Transfer Dana",
                          amount: 50000,
                          fee: 0
                        });
                      }}
                      className="w-full h-10 rounded-lg bg-[#002060] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                    >
                      Kirim Saldo QRIS
                    </button>
                  </div>
                )}

                {/* QRIS TAP MODE (NFC PAY TERMINAL) */}
                {formInputs.qrisMode === "Tap" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                    <div className="relative w-28 h-28 rounded-full bg-[#002060]/5 flex items-center justify-center">
                      <span className="text-3xl">🛜</span>
                      <div className="absolute inset-0 rounded-full border-2 border-[#002060]/40 animate-nfc-pulse"></div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-sm font-bold text-slate-800">Simulasi QRIS Tap NFC</h5>
                      <p className="text-xs text-slate-550 max-w-[200px] mx-auto leading-relaxed">Dekatkan ponsel Anda ke terminal pembayaran merchant berlogo GPN/NFC</p>
                    </div>

                    <button 
                      onClick={() => {
                        playSound("success");
                        launchPinValidation("qris", {
                          id: `QR-${Math.floor(100000 + Math.random() * 900000)}`,
                          type: "debit",
                          title: "QRIS Tap NFC Merchant",
                          amount: 68000,
                          fee: 0
                        });
                      }}
                      className="w-full py-2.5 rounded-lg bg-[#002060] text-white text-xs font-bold active:scale-95"
                    >
                      Dekatkan Ke Terminal Pembayaran
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Bottom Navigation */}
          {currentScreen !== "splash" && currentScreen !== "login" && currentScreen !== "biometric_modal" && currentScreen !== "pin_modal" && loggedInUser && (
            <div className="h-14 px-4 border-t border-slate-200 bg-white grid grid-cols-5 gap-1 items-center z-30 shrink-0">
              <button 
                onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                className={`flex flex-col items-center justify-center gap-0.5 ${currentScreen === "dashboard" ? "text-[#002060]" : "text-slate-450"}`}
              >
                <span className="text-base">🏠</span>
                <span className="text-[8px] font-bold">Beranda</span>
              </button>
              
              <button 
                onClick={() => { playSound("click"); setSelectedCategory("Transfer"); setCurrentScreen("feature_sheet"); }}
                className={`flex flex-col items-center justify-center gap-0.5 ${currentScreen === "feature_sheet" && selectedCategory === "Transfer" ? "text-[#002060]" : "text-slate-450"}`}
              >
                <span className="text-base">📤</span>
                <span className="text-[8px] font-bold">Transfer</span>
              </button>

              {/* Centered QRIS circular button */}
              <button 
                onClick={() => { playSound("click"); setFormInputs({ qrisMode: "Scan" }); setCurrentScreen("qris"); }}
                className="flex flex-col items-center justify-center -mt-5 z-40 active:scale-105 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-[#002060] flex items-center justify-center shadow-lg border-2 border-white text-white text-sm">
                  📷
                </div>
                <span className="text-[8px] font-bold text-slate-500 mt-1">QRIS</span>
              </button>

              <button 
                onClick={() => {
                  playSound("click");
                  setSelectedCategory("Rekening Koran");
                  setSelectedSubFeature("Rekening Koran");
                  setFormInputs({ month: "Juni 2026" });
                  setCurrentScreen("feature_detail");
                }}
                className={`flex flex-col items-center justify-center gap-0.5 ${currentScreen === "feature_detail" && selectedSubFeature === "Rekening Koran" ? "text-[#002060]" : "text-slate-450"}`}
              >
                <span className="text-base">📄</span>
                <span className="text-[8px] font-bold">E-Statement</span>
              </button>
              
              <button 
                onClick={() => { playSound("click"); setLoggedInUser(null); setCurrentScreen("login"); pushNotification("Sesi Anda ditutup."); }}
                className="flex flex-col items-center justify-center gap-0.5 text-slate-400"
              >
                <span className="text-base">👤</span>
                <span className="text-[8px] font-bold">Keluar</span>
              </button>
            </div>
          )}

          {/* Android Home Gestures capsule pill */}
          <div className="h-6 flex items-center justify-center z-30 shrink-0 pointer-events-none bg-white">
            <div className="w-24 h-1.5 bg-slate-300 rounded-full"></div>
          </div>

        </div>

      </div>

    </div>
  );
}
