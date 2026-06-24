"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  loginAction, 
  fetchUserDataAction, 
  createTransactionAction, 
  createPotAction, 
  topUpEMoneyAction, 
  fetchEstatementAction,
  registerUserAction,
  updateUserPinAction,
  updateUserPasscodeAction,
  csChatAction
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
  const [featureDetailBackTarget, setFeatureDetailBackTarget] = useState<string>("dashboard");
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

  // --- Registration States for Buka Rekening ---
  const [regStep, setRegStep] = useState<number>(1);
  const [regInputs, setRegInputs] = useState({
    name: "",
    nik: "",
    birthDate: "",
    userId: "",
    passcode: "",
    pin: "",
    initialDeposit: 100000
  });
  const [regResult, setRegResult] = useState<{ accountNo: string; userId: string } | null>(null);
  const [regOtpInput, setRegOtpInput] = useState<string>("");
  const [regOtpSentVia, setRegOtpSentVia] = useState<"SMS" | "WhatsApp">("SMS");
  const [regOtpTimer, setRegOtpTimer] = useState<number>(30);

  // --- Lansia Walkthrough Guide ---
  const [lansiaGuideStep, setLansiaGuideStep] = useState<number>(1);

  // --- Home Screen Privacy Toggles ---
  const [isHomeTransactionsVisible, setIsHomeTransactionsVisible] = useState<boolean>(false);

  // --- Settings (Pengaturan) States ---
  const [settingsInputs, setSettingsInputs] = useState({
    oldPin: "",
    newPin: "",
    oldPasscode: "",
    newPasscode: "",
    dailyLimit: 25000000,
    isCardBlocked: false,
    smsNotif: true,
    emailNotif: true,
    pushNotif: true,
    biometrics: true
  });
  const [activeSettingsForm, setActiveSettingsForm] = useState<string | null>(null);

  // --- CS Chatbot States ---
  const [csMessages, setCsMessages] = useState<Array<{ role: "user" | "model"; content: string }>>([
    { role: "model", content: "Halo! Selamat datang di Centra Care. Saya adalah asisten virtual Centra. Ada yang bisa saya bantu hari ini?" }
  ]);
  const [csInputText, setCsInputText] = useState<string>("");
  const [csLoading, setCsLoading] = useState<boolean>(false);

  // --- Riwayat (Activity) Filters & Download States ---
  const [riwayatFilterTanggal, setRiwayatFilterTanggal] = useState<string>("Semua");
  const [riwayatFilterLayanan, setRiwayatFilterLayanan] = useState<string>("Semua");
  const [riwayatFilterMetode, setRiwayatFilterMetode] = useState<string>("Semua");
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [isDownloadingRiwayat, setIsDownloadingRiwayat] = useState<boolean>(false);

  // --- Inline Form State Feedback for Settings ---
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);
  const [pinChangeSuccess, setPinChangeSuccess] = useState<boolean>(false);
  const [passcodeChangeError, setPasscodeChangeError] = useState<string | null>(null);
  const [passcodeChangeSuccess, setPasscodeChangeSuccess] = useState<boolean>(false);

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

  // OTP Countdown Timer
  useEffect(() => {
    let interval: any;
    if (currentScreen === "buka_rekening" && regStep === 4 && regOtpTimer > 0) {
      interval = setInterval(() => {
        setRegOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, regStep, regOtpTimer]);

  // Track feature_detail back target navigation state
  useEffect(() => {
    if (currentScreen === "dashboard") {
      setFeatureDetailBackTarget("dashboard");
    } else if (currentScreen === "feature_sheet") {
      setFeatureDetailBackTarget("feature_sheet");
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
    try {
      const res = await fetchUserDataAction(userId);
      if (res.success) {
        setBalance(res.balance || 0);
        setTransactions(res.transactions || []);
        setCentraPots(res.centraPots || []);
      } else {
        pushNotification(res.error || "Gagal menyinkronkan data database.");
      }
    } catch (err) {
      console.error(err);
      pushNotification("Gagal terhubung ke database. Cek konfigurasi server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transaction list download simulation
  const handleDownloadRiwayat = () => {
    setIsDownloadingRiwayat(true);
    playSound("click");
    setTimeout(() => {
      setIsDownloadingRiwayat(false);
      pushNotification("Riwayat transaksi berhasil diunduh ke folder Download (Format: PDF).");
    }, 1500);
  };

  // Handle PIN Transaction update in database
  const handleUpdatePin = async () => {
    setPinChangeError(null);
    setPinChangeSuccess(false);
    if (!settingsInputs.oldPin || !settingsInputs.newPin) {
      setPinChangeError("PIN lama dan baru harus diisi!");
      playSound("error");
      return;
    }
    if (settingsInputs.newPin.length !== 6 || !/^\d+$/.test(settingsInputs.newPin)) {
      setPinChangeError("PIN baru harus tepat 6 digit angka!");
      playSound("error");
      return;
    }
    setIsLoading(true);
    try {
      const res = await updateUserPinAction(loggedInUser!.userId, settingsInputs.oldPin, settingsInputs.newPin);
      if (res.success) {
        setPinChangeSuccess(true);
        playSound("success");
        pushNotification("PIN transaksi berhasil diperbarui!");
        setSettingsInputs(prev => ({ ...prev, oldPin: "", newPin: "" }));
      } else {
        setPinChangeError(res.error || "Gagal memperbarui PIN.");
        playSound("error");
      }
    } catch (err) {
      console.error(err);
      setPinChangeError("Kesalahan koneksi database.");
      playSound("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login passcode update in database
  const handleUpdatePasscode = async () => {
    setPasscodeChangeError(null);
    setPasscodeChangeSuccess(false);
    if (!settingsInputs.oldPasscode || !settingsInputs.newPasscode) {
      setPasscodeChangeError("Kata sandi lama dan baru harus diisi!");
      playSound("error");
      return;
    }
    if (settingsInputs.newPasscode.length < 6) {
      setPasscodeChangeError("Kata sandi baru minimal 6 karakter!");
      playSound("error");
      return;
    }
    setIsLoading(true);
    try {
      const res = await updateUserPasscodeAction(loggedInUser!.userId, settingsInputs.oldPasscode, settingsInputs.newPasscode);
      if (res.success) {
        setPasscodeChangeSuccess(true);
        playSound("success");
        pushNotification("Kata sandi berhasil diperbarui!");
        setSettingsInputs(prev => ({ ...prev, oldPasscode: "", newPasscode: "" }));
      } else {
        setPasscodeChangeError(res.error || "Gagal memperbarui kata sandi.");
        playSound("error");
      }
    } catch (err) {
      console.error(err);
      setPasscodeChangeError("Kesalahan koneksi database.");
      playSound("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CS Chatbot message dispatch and response streaming
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || csInputText;
    if (!text.trim()) return;

    playSound("click");
    if (!textToSend) setCsInputText("");

    const updatedMessages = [...csMessages, { role: "user" as const, content: text }];
    setCsMessages(updatedMessages);
    setCsLoading(true);

    try {
      const res = await csChatAction(updatedMessages);
      if (res.success && res.reply) {
        setCsMessages([...updatedMessages, { role: "model" as const, content: res.reply }]);
        playSound("success");
      } else {
        pushNotification(res.error || "Gagal menghubungi asisten CS.");
        setCsMessages([
          ...updatedMessages,
          { role: "model" as const, content: "Maaf, sistem bantuan Centra sedang mengalami kendala. Silakan coba lagi." }
        ]);
        playSound("error");
      }
    } catch (err) {
      console.error(err);
      setCsMessages([
        ...updatedMessages,
        { role: "model" as const, content: "Koneksi terputus. Pastikan Anda terhubung ke internet." }
      ]);
      playSound("error");
    } finally {
      setCsLoading(false);
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
    try {
      const res = await loginAction(userIdInput, passcode);
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
        if (res.error === "User ID tidak ditemukan") {
          pushNotification("User ID tidak ditemukan. Jika belum memiliki rekening, silakan klik 'Buka Sekarang' di bawah.");
        } else {
          pushNotification(res.error || "Autentikasi gagal.");
        }
      }
    } catch (err) {
      console.error(err);
      playSound("error");
      pushNotification("Koneksi Neon Database terputus. Pastikan DATABASE_URL sudah dikonfigurasi di Vercel.");
    } finally {
      setIsLoading(false);
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
    try {
      if (pinPayload.isSimulatedFailure) {
        // Simulate a network delay and failure verification
        await new Promise((resolve) => setTimeout(resolve, 2000));
        playSound("error");
        pushNotification("⚠️ Transaksi GAGAL karena gangguan jaringan. Sistem Audit mendeteksi gangguan. Saldo Anda aman (Auto-Reversal Berhasil).");
        setCurrentScreen("dashboard");
        return;
      }

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
    } catch (err) {
      console.error(err);
      playSound("error");
      pushNotification("Gagal memproses transaksi. Koneksi database bermasalah.");
      setCurrentScreen("dashboard");
    } finally {
      setIsLoading(false);
    }
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
    try {
      const res = await topUpEMoneyAction(loggedInUser.userId, amount, scannedCard.cardNo, scannedCard.type);
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
    } catch (err) {
      console.error(err);
      playSound("error");
      pushNotification("Gagal memproses Top Up. Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  // Create CentraPot Saving Pocket
  const handleCreateCentraPot = async () => {
    if (!loggedInUser) return;
    if (!formInputs.potTitle || !formInputs.potTarget) {
      pushNotification("Lengkapi input CentraPot!");
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
    try {
      const res = await createPotAction(loggedInUser.userId, potData);
      if (res.success) {
        await refreshUserData(loggedInUser.userId);
        setFormInputs({ showNewPotForm: false });
        playSound("success");
        pushNotification(`CentraPot "${potData.title}" berhasil dibuat!`);
      } else {
        playSound("error");
        pushNotification(res.error || "Gagal membuat CentraPot.");
      }
    } catch (err) {
      console.error(err);
      playSound("error");
      pushNotification("Gagal membuat CentraPot. Koneksi database gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch monthly E-statement
  const handleGenerateEstatement = async () => {
    if (!loggedInUser) return;

    setIsLoading(true);
    try {
      const res = await fetchEstatementAction(loggedInUser.userId, formInputs.month || "Juni 2026");
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
    } catch (err) {
      console.error(err);
      playSound("error");
      pushNotification("Gagal mengambil E-statement. Masalah koneksi database.");
    } finally {
      setIsLoading(false);
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

  const triggerDemoQRScanFailed = (merchant: string, amount: number) => {
    playSound("biometric");
    launchPinValidation("qris", {
      id: `QR-${Math.floor(100000 + Math.random() * 900000)}`,
      type: "debit",
      title: `QRIS ${merchant}`,
      amount: amount,
      fee: 0,
      note: "Simulasi Transaksi QRIS Gagal",
      recipient: merchant,
      isSimulatedFailure: true
    });
  };

  // --- Memoized computations for Riwayat / Activity Ledger ---
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filter Metode (Credit/Debit)
      if (riwayatFilterMetode === "Uang Masuk" && tx.type !== "credit") return false;
      if (riwayatFilterMetode === "Uang Keluar" && tx.type !== "debit") return false;
      
      // 2. Filter Layanan (Category)
      if (riwayatFilterLayanan !== "Semua") {
        if (riwayatFilterLayanan === "Lainnya") {
          if (["Transfer", "Keuangan", "Cardless", "Tagihan"].includes(tx.category)) return false;
        } else {
          if (tx.category !== riwayatFilterLayanan) return false;
        }
      }
      
      // 3. Filter Tanggal
      if (riwayatFilterTanggal !== "Semua") {
        const txDate = new Date(tx.date);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (riwayatFilterTanggal === "Hari Ini") {
          const txDay = new Date(tx.date);
          txDay.setHours(0,0,0,0);
          if (txDay.getTime() !== today.getTime()) return false;
        } else if (riwayatFilterTanggal === "Kemarin") {
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);
          yesterday.setHours(0,0,0,0);
          const txDay = new Date(tx.date);
          txDay.setHours(0,0,0,0);
          if (txDay.getTime() !== yesterday.getTime()) return false;
        } else if (riwayatFilterTanggal === "7 Hari Terakhir") {
          const limit = new Date();
          limit.setDate(today.getDate() - 7);
          if (txDate < limit) return false;
        } else if (riwayatFilterTanggal === "30 Hari Terakhir") {
          const limit = new Date();
          limit.setDate(today.getDate() - 30);
          if (txDate < limit) return false;
        }
      }
      
      return true;
    });
  }, [transactions, riwayatFilterTanggal, riwayatFilterLayanan, riwayatFilterMetode]);

  const groupedTxs = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTxs.forEach((tx) => {
      const d = new Date(tx.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      let dateStr = "";
      if (d.toDateString() === today.toDateString()) {
        dateStr = "Hari ini";
      } else if (d.toDateString() === yesterday.toDateString()) {
        dateStr = "Kemarin";
      } else {
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(tx);
    });
    return groups;
  }, [filteredTxs]);

  // --- Centra Logo Component using Violet PNG Asset ---
  const CentraLogoNavy = ({ className = "w-16 h-16" }: { className?: string }) => (
    <img 
      src="/asset/logo-violet.png" 
      alt="Centra Logo" 
      className={className} 
      style={{ objectFit: "contain" }}
    />
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
                <span className="text-[11px] font-extrabold text-[#30009F]">Centra Mobile</span>
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
              <div className="w-10 h-10 rounded-full border-4 border-[#30009F] border-t-transparent animate-spin"></div>
              <span className="text-xs font-bold text-[#30009F] tracking-wide">Menghubungi Neon Database...</span>
            </div>
          )}

          {/* Core SPA Display Router */}
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative z-10">
            
            {/* 1. SPLASH SCREEN */}
            {currentScreen === "splash" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 phone-brand-bg animate-fade-in text-center">
                <div className="animate-pulse flex flex-col items-center gap-6">
                  <div className="w-24 h-24 p-3 bg-white/40 backdrop-blur-md rounded-[32px] border border-white/50 shadow-lg flex items-center justify-center">
                    <CentraLogoNavy className="w-16 h-16" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black text-[#30009F] tracking-widest font-sans">CENTRA</h2>
                    <p className="text-[11px] font-black tracking-widest text-[#30009F]/70 uppercase mt-1.5">PT Centurion Bank Tbk.</p>
                  </div>
                </div>
                <div className="absolute bottom-20 flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full border-3 border-[#30009F] border-t-transparent animate-spin"></div>
                  <span className="text-[11px] tracking-widest text-[#30009F]/80 font-black uppercase mt-4">Sistem Aman Terverifikasi</span>
                </div>
              </div>
            )}

            {/* 2. LOGIN SCREEN */}
            {currentScreen === "login" && (
              <div className="flex-1 flex flex-col justify-between p-6 phone-brand-bg animate-fade-in">
                <div className="flex justify-center items-center mt-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 p-2.5 bg-white/40 backdrop-blur-md rounded-[28px] border border-white/50 shadow-md flex items-center justify-center">
                      <CentraLogoNavy className="w-14 h-14" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-black tracking-widest text-[#30009F] font-sans">CENTRA</h3>
                      <span className="text-[9px] font-black text-[#30009F]/60 uppercase tracking-widest">PT Centurion Bank Tbk.</span>
                    </div>
                  </div>
                </div>

                <div className="my-auto space-y-6">
                  <div className="text-center space-y-1.5">
                    <h4 className="text-xl font-extrabold text-slate-900">Selamat Datang</h4>
                    <p className="text-xs text-slate-600 font-semibold">Masuk ke Rekening Centra Anda</p>
                  </div>

                  <div className="space-y-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white shadow-xl card-shadow">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">User ID / Kode Akses</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: AMINAH28"
                        onChange={(e) => setFormInputs({ ...formInputs, loginUserId: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#30009F] focus:border-transparent text-slate-800 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1.5">Kata Sandi</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        onChange={(e) => setFormInputs({ ...formInputs, loginPasscode: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#30009F] focus:border-transparent text-slate-800 transition-all"
                      />
                    </div>

                    <button 
                      onClick={handleLogin}
                      className="w-full h-12 rounded-xl bg-[#30009F] hover:bg-[#1e0064] transition-all text-white font-black text-sm flex items-center justify-center glow-violet active:scale-95 cursor-pointer"
                    >
                      Masuk Rekening
                    </button>

                    <button 
                      onClick={() => { playSound("click"); setCurrentScreen("biometric_modal"); }}
                      className="w-full h-12 rounded-xl bg-[#E3CDFF]/40 hover:bg-[#E3CDFF]/60 text-[#30009F] text-xs font-black flex items-center justify-center gap-2 active:scale-95 border border-[#E3CDFF]/85 transition-all cursor-pointer"
                    >
                      👁️ Verifikasi Sidik Jari / Face ID
                    </button>

                    <button 
                      onClick={() => { 
                        playSound("click"); 
                        setRegStep(1); 
                        setRegInputs({
                          name: "",
                          nik: "",
                          birthDate: "",
                          userId: "",
                          passcode: "",
                          pin: "",
                          initialDeposit: 100000
                        });
                        setRegResult(null);
                        setCurrentScreen("buka_rekening"); 
                      }}
                      className="w-full h-12 rounded-xl bg-white hover:bg-[#FFCDF7]/10 text-[#30009F] text-xs font-black flex items-center justify-center gap-2 active:scale-95 border border-dashed border-[#30009F]/40 transition-all cursor-pointer"
                    >
                      🏦 Belum Punya Rekening? Buka Sekarang
                    </button>
                  </div>
                </div>

                {/* Footnotes */}
                <div className="text-center text-[10px] text-slate-500 font-bold mt-4 bg-white/30 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/20">
                  Default login: ID <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded text-[#30009F] font-black">AMINAH28</code> &amp; Pass <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded text-[#30009F] font-black">2hanima8*</code>
                </div>
              </div>
            )}

            {/* BIOMETRICS SCAN SCREEN */}
            {currentScreen === "biometric_modal" && (
              <div className="flex-1 flex flex-col justify-between p-6 phone-brand-bg animate-fade-in">
                <div className="flex justify-center items-center mt-8">
                  <div className="flex flex-col items-center gap-1.5">
                    <CentraLogoNavy className="w-12 h-12" />
                    <h3 className="text-lg font-black tracking-widest text-[#30009F]">CENTRA</h3>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <div className="relative w-32 h-32 rounded-full bg-white/60 border-2 border-[#E3CDFF] flex items-center justify-center mb-8 shadow-md">
                    <svg className="w-16 h-16 text-[#30009F] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    <div className="absolute inset-0 border-3 border-[#30009F] rounded-full animate-nfc-pulse pointer-events-none opacity-40"></div>
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">Verifikasi Biometrik</h4>
                  <p className="text-xs text-slate-600 mt-2 max-w-[220px] font-semibold leading-relaxed">Letakkan jari Anda pada area pemindai sensor sidik jari perangkat untuk verifikasi cepat</p>
                </div>
                
                <div className="space-y-3 w-full">
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
                    className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-xs font-black active:scale-95 transition-transform shadow-md cursor-pointer"
                  >
                    Simulasi Sidik Jari Selesai
                  </button>
                  <button 
                    onClick={() => {
                      playSound("click");
                      setCurrentScreen("login");
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#E3CDFF]/50 text-[#30009F] text-xs font-black active:scale-95 border border-[#E3CDFF]/90 transition-transform cursor-pointer"
                  >
                    Kembali ke Login Sandi
                  </button>
                </div>
              </div>
            )}

            {/* 3. INTERACTIVE DASHBOARD VIEW (AGE-BASED RENDERING SWITCH) */}
            {currentScreen === "dashboard" && loggedInUser && (
              <>
                {/* 3A: INTERFACE MODE LANSIA (ELDERLY MODE - AGE 55+) */}
                {forceElderlyMode ? (
                  <div className="flex-1 flex flex-col animate-fade-in bg-[#E3CDFF]/20 overflow-y-auto no-scrollbar h-full">
                    
                    {/* Top portion on light purple background */}
                    <div className="p-5 pb-3.5 space-y-4 shrink-0">
                      
                      {/* Big Accessible Header */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <CentraLogoNavy className="w-12 h-12" />
                          <div>
                            <span className="text-[10px] text-[#30009F] block font-black uppercase tracking-wider leading-none">CENTRA LANSIA</span>
                            <span className="text-sm font-bold text-slate-800 leading-tight">Selamat Siang, Ibu {loggedInUser.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { playSound("click"); setCurrentScreen("cs_chat_view"); }}
                            className="w-12 h-12 rounded-xl bg-white border border-[#E3CDFF]/85 flex items-center justify-center hover:bg-white transition-all active:scale-95 cursor-pointer shadow-2xs"
                            title="Layanan Pelanggan"
                          >
                            <img src="/asset/customer-service-violet.png" className="w-7 h-7" alt="Customer Service" />
                          </button>
                          <button 
                            onClick={() => { playSound("click"); setCurrentScreen("settings_view"); }}
                            className="w-12 h-12 rounded-xl bg-white border border-[#E3CDFF]/85 flex items-center justify-center hover:bg-white transition-all active:scale-95 cursor-pointer shadow-2xs"
                            title="Pengaturan"
                          >
                            <img src="/asset/setting-violet.png" className="w-7 h-7" alt="Settings" />
                          </button>
                        </div>
                      </div>

                      {/* Platinum Card representation for Lansia */}
                      <div className="h-52 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden border border-[#E3CDFF]/40 card-shadow">
                        {settingsInputs.isCardBlocked && (
                          <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-white animate-fade-in">
                            <span className="text-3xl">🚫</span>
                            <span className="text-sm font-black uppercase tracking-wider text-rose-455 text-rose-400 mt-2">Kartu Anda Diblokir Sementara</span>
                            <span className="text-[10px] text-slate-350 font-semibold mt-1">Aktifkan kembali melalui menu Pengaturan</span>
                          </div>
                        )}
                        {/* Top Part: Violet Brand Color */}
                        <div className="h-[62%] bg-gradient-to-tr from-[#30009F] to-[#1e0064] p-5 text-white flex flex-col justify-between relative">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFCDF7]/15 rounded-full blur-xl"></div>
                          
                          <div className="flex justify-between items-start z-10">
                            <div>
                              <span className="text-[10px] uppercase font-black tracking-widest text-[#FFCDF7]">Centra Platinum Premium</span>
                              <span className="block text-xs font-bold opacity-90 mt-1">Tabungan Utama Lansia</span>
                            </div>
                            <span className="text-[10px] font-black tracking-widest text-[#30009F] bg-[#FFCDF7] px-3 py-1 rounded-full border border-white/20 shadow-2xs">MODE LANSIA</span>
                          </div>

                          <div className="z-10 mt-2">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl font-black font-mono tracking-tight leading-none text-white">
                                {isBalanceVisible ? formatRupiah(balance) : "••••••••"}
                              </span>
                              <button 
                                onClick={() => { playSound("click"); setIsBalanceVisible(!isBalanceVisible); }}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer"
                                title="Tampilkan Saldo"
                              >
                                <img 
                                  src={isBalanceVisible ? "/asset/eye-on-pink.png" : "/asset/eye-off-pink.png"} 
                                  className="w-6 h-6" 
                                  alt="Toggle Balance" 
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Part: Clean White Details */}
                        <div className="h-[38%] bg-white px-5 py-4 flex justify-between items-center text-[#30009F] font-bold text-xs border-t border-slate-100">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">No. Rekening Anda</span>
                            <span className="font-mono text-sm text-slate-800">{loggedInUser.accountNo}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Nama Pemilik</span>
                            <span className="text-slate-800 truncate block max-w-[150px] text-sm">{loggedInUser.name.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Bottom sheet curved white card */}
                    <div className="flex-1 bg-white rounded-t-[36px] p-5 pb-8 space-y-6 border-t border-slate-100 shadow-md">
                      
                      {/* Kirim Cepat (Saved Contacts Row for Lansia) */}
                      <div className="space-y-2.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#30009F] block">Kirim Cepat ke Keluarga</span>
                        <div className="flex gap-4 overflow-x-auto py-1 no-scrollbar">
                          {contacts.map((contact) => (
                            <button
                              key={contact.id}
                              onClick={() => {
                                playSound("click");
                                setSelectedCategory("Transfer");
                                setSelectedSubFeature(contact.bank === "Centra" ? "Antar Rekening Centra" : "Bank Lain");
                                setFormInputs({ 
                                  accNo: contact.accountNo.replace(/\s/g, ""), 
                                  bank: contact.bank,
                                  recipientName: contact.name
                                });
                                setCurrentScreen("feature_detail");
                              }}
                              className="flex flex-col items-center gap-1.5 active:scale-95 shrink-0 transition-transform cursor-pointer"
                            >
                              <div className={`w-14 h-14 rounded-full ${contact.color} text-white flex items-center justify-center font-black text-base shadow-md border-2 border-white`}>
                                {contact.avatar}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 text-center max-w-[65px] truncate">{contact.name.split(" ")[0]}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Layanan Perbankan Grid for Lansia (3 Columns, Big Buttons) */}
                      <div className="space-y-3">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#30009F] block mb-1">Layanan Perbankan Utama</span>
                        <div className="grid grid-cols-3 gap-3">
                          
                          {/* 1. Kirim Uang */}
                          <button 
                            onClick={() => {
                              playSound("click");
                              setSelectedCategory("Transfer");
                              setSelectedSubFeature("Antar Rekening Centra");
                              setFormInputs({});
                              setCurrentScreen("feature_detail");
                            }}
                            className="p-4 bg-[#E3CDFF]/30 border border-[#E3CDFF]/60 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <img src="/asset/transfer-violet.png" className="w-10 h-10" alt="Transfer" />
                            <span className="text-[11px] font-black text-slate-800 text-center tracking-tight leading-tight">Kirim Uang</span>
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
                            className="p-4 bg-[#FFCDF7]/30 border border-[#FFCDF7]/60 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <img src="/asset/cardless-violet.png" className="w-10 h-10" alt="Cardless" />
                            <span className="text-[11px] font-black text-slate-800 text-center tracking-tight leading-tight text-wrap">Tarik di ATM</span>
                          </button>

                          {/* 3. Bayar Listrik */}
                          <button 
                            onClick={() => {
                              playSound("click");
                              setSelectedCategory("Tagihan");
                              setSelectedSubFeature("PLN");
                              setFormInputs({});
                              setCurrentScreen("feature_detail");
                            }}
                            className="p-4 bg-[#E3CDFF]/30 border border-[#E3CDFF]/60 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <img src="/asset/tagihan-violet.png" className="w-10 h-10" alt="Tagihan" />
                            <span className="text-[11px] font-black text-slate-800 text-center tracking-tight leading-tight text-wrap">Bayar Listrik</span>
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
                            className="p-4 bg-[#FFCDF7]/30 border border-[#FFCDF7]/60 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <img src="/asset/e-statement-violet.png" className="w-10 h-10" alt="E-Statement" />
                            <span className="text-[11px] font-black text-slate-800 text-center tracking-tight leading-tight text-wrap">Cetak Laporan</span>
                          </button>

                          {/* 5. CentraPot */}
                          <button 
                            onClick={() => {
                              playSound("click");
                              setSelectedCategory("Produk Perbankan");
                              setSelectedSubFeature("CentraPot");
                              setCurrentScreen("feature_detail");
                            }}
                            className="p-4 bg-[#FFCDF7]/30 border border-[#FFCDF7]/60 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <div className="w-10 h-10 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 10v9a3 3 0 01-3 3H8a3 3 0 01-3-3v-9h14z" fill="#30009F" />
                                <path d="M4 8h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v2a1 1 0 001 1z" fill="#30009F" opacity="0.8" />
                                <path d="M12 2a3 3 0 00-3 3h6a3 3 0 00-3-3z" fill="#30009F" />
                              </svg>
                            </div>
                            <span className="text-[11px] font-black text-slate-800 text-center tracking-tight leading-tight">CentraPot</span>
                          </button>

                          {/* 6. Layanan Bantuan */}
                          <button 
                            onClick={() => {
                              playSound("click");
                              setCurrentScreen("cs_chat_view");
                            }}
                            className="p-4 bg-[#E3CDFF]/30 border border-[#E3CDFF]/60 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 shadow-2xs cursor-pointer"
                          >
                            <img src="/asset/customer-service-violet.png" className="w-10 h-10" alt="Bantuan CS" />
                            <span className="text-[11px] font-black text-slate-800 text-center tracking-tight leading-tight">Bantuan CS</span>
                          </button>

                        </div>
                      </div>

                      {/* Hotline CS Darurat */}
                      <button 
                        onClick={() => {
                          playSound("click");
                          pushNotification("Menghubungi Layanan Bantuan Khusus Lansia Centra Care (1500-112)");
                        }}
                        className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer shadow-md animate-laser-pulse"
                      >
                        <img src="/asset/customer-service-pink.png" className="w-5.5 h-5.5" alt="CS Help" />
                        <span>Hubungi Telepon Darurat Lansia</span>
                      </button>

                      {/* RIWAYAT MUTASI DARI DATABASE (MASKED FOR PRIVACY) for Lansia */}
                      <div className="space-y-2.5 border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[12px] font-black uppercase tracking-wider text-[#30009F]">Riwayat Transaksi Terakhir</span>
                            <button 
                              onClick={() => {
                                playSound("click");
                                setIsHomeTransactionsVisible(!isHomeTransactionsVisible);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#E3CDFF]/30 transition-all cursor-pointer"
                              title={isHomeTransactionsVisible ? "Sembunyikan" : "Tampilkan"}
                            >
                              <img 
                                src={isHomeTransactionsVisible ? "/asset/eye-on-pink.png" : "/asset/eye-off-pink.png"} 
                                className="w-4 h-4" 
                                style={{ filter: "invert(12%) sepia(95%) saturate(4156%) saturate(120%) hue-rotate(258deg) brightness(85%) contrast(124%)" }}
                                alt="Toggle Riwayat" 
                              />
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              playSound("click");
                              setCurrentScreen("riwayat_view");
                            }}
                            className="text-xs font-black text-[#30009F] hover:underline cursor-pointer"
                          >
                            Lihat Semua
                          </button>
                        </div>

                        {!isHomeTransactionsVisible ? (
                          <div className="p-4 py-5 rounded-2xl bg-[#E3CDFF]/10 border border-[#E3CDFF]/30 shadow-2xs flex flex-col items-center justify-center text-center">
                            <img src="/asset/riwayat-lilac.png" className="w-8 h-8 opacity-35 mb-1.5" alt="Tersembunyi" />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Riwayat Transaksi Tersembunyi</span>
                            <span className="text-[9px] text-slate-500 font-semibold max-w-[230px] mt-1 leading-tight">Tekan tombol mata di atas untuk menampilkan riwayat.</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[160px] overflow-y-auto no-scrollbar">
                            {transactions.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-450 italic font-semibold">
                                Belum ada riwayat transaksi.
                              </div>
                            ) : (
                              transactions.slice(0, 3).map((tx) => (
                                <div key={tx.id} className="flex justify-between items-center p-3.5 rounded-2xl bg-[#E3CDFF]/15 border border-[#E3CDFF]/35 shadow-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E3CDFF]/50 flex items-center justify-center shadow-2xs">
                                      <img 
                                        src={tx.type === "credit" ? "/asset/uang-masuk-violet.png" : "/asset/uang-keluar-violet.png"} 
                                        className="w-6 h-6" 
                                        alt={tx.type === "credit" ? "Uang Masuk" : "Uang Keluar"} 
                                      />
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold text-slate-850 block leading-tight">{tx.title}</span>
                                      <span className="text-[9.5px] text-[#30009F] font-extrabold uppercase mt-0.5 block">{tx.category}</span>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-black font-mono ${tx.type === "credit" ? "text-emerald-600" : "text-slate-850"}`}>
                                    {tx.type === "credit" ? "+" : "-"}{formatRupiah(tx.amount)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Developer Toggle back to standard view */}
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-4">
                        <span>Usia Anda: {loggedInUser.age} tahun</span>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              playSound("click");
                              setLansiaGuideStep(1);
                              pushNotification("Memulai panduan interaktif Lansia.");
                            }}
                            className="text-[#30009F] font-black underline cursor-pointer"
                          >
                            📖 Panduan
                          </button>
                          <button 
                            onClick={() => {
                              playSound("click");
                              setForceElderlyMode(false);
                              pushNotification("Kembali ke tampilan standar.");
                            }}
                            className="text-slate-500 font-bold underline cursor-pointer"
                          >
                            Mode Standar
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                ) : (
                  
                  /* 3B: INTERFACE MODE PRODUKTIF (STANDARD COMPLEX 12-MENU GRID) */
                  <div className="flex-1 flex flex-col animate-fade-in bg-[#E3CDFF]/25">
                    
                    {/* Top Section (Header + Card) on lilac background */}
                    <div className="p-5 pb-3.5 space-y-4">
                      {/* Header info */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                          <CentraLogoNavy className="w-9 h-9" />
                          <div>
                            <span className="text-[10px] text-[#30009F] block font-black uppercase tracking-wider leading-none">CENTRA</span>
                            <span className="text-xs font-bold text-slate-800 leading-tight">Halo, {loggedInUser.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => { playSound("click"); setCurrentScreen("cs_chat_view"); }}
                            className="w-9 h-9 rounded-xl bg-white/70 border border-[#E3CDFF]/60 flex items-center justify-center hover:bg-white transition-all active:scale-95 cursor-pointer"
                            title="Layanan Pelanggan"
                          >
                            <img src="/asset/customer-service-violet.png" className="w-5 h-5" alt="Customer Service" />
                          </button>
                          <button 
                            onClick={() => { playSound("click"); setCurrentScreen("settings_view"); }}
                            className="w-9 h-9 rounded-xl bg-white/70 border border-[#E3CDFF]/60 flex items-center justify-center hover:bg-white transition-all active:scale-95 cursor-pointer"
                            title="Pengaturan"
                          >
                            <img src="/asset/setting-violet.png" className="w-5 h-5" alt="Settings" />
                          </button>
                        </div>
                      </div>

                      {/* Platinum Card representation (Split-Color Design) */}
                      <div className="h-44 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden border border-[#E3CDFF]/30 card-shadow">
                        {settingsInputs.isCardBlocked && (
                          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-white animate-fade-in">
                            <span className="text-2xl">🚫</span>
                            <span className="text-xs font-black uppercase tracking-wider text-rose-455 text-rose-400 mt-1">Kartu Diblokir Sementara</span>
                            <span className="text-[8px] text-slate-300 font-semibold mt-0.5">Aktifkan kembali melalui menu Pengaturan</span>
                          </div>
                        )}
                        {/* Top Part: Violet Brand Color */}
                        <div className="h-[60%] bg-gradient-to-tr from-[#30009F] to-[#1e0064] p-4 text-white flex flex-col justify-between relative">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFCDF7]/15 rounded-full blur-xl"></div>
                          
                          <div className="flex justify-between items-start z-10">
                            <div>
                              <span className="text-[9px] uppercase font-black tracking-widest text-[#FFCDF7]">Centra Platinum Premium</span>
                              <span className="block text-[10px] font-bold opacity-85 mt-0.5">Tabungan Centra Utama</span>
                            </div>
                            <span className="text-[9px] font-black tracking-widest text-[#FFCDF7] bg-white/10 px-2 py-0.5 rounded-full border border-white/20">ACTIVE</span>
                          </div>

                          <div className="z-10 mt-1">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl font-black font-mono tracking-tight leading-none">
                                {isBalanceVisible ? formatRupiah(balance) : "••••••••"}
                              </span>
                              <button 
                                onClick={() => { playSound("click"); setIsBalanceVisible(!isBalanceVisible); }}
                                className="w-5 h-5 flex items-center justify-center opacity-95 hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <img 
                                  src={isBalanceVisible ? "/asset/eye-on-pink.png" : "/asset/eye-off-pink.png"} 
                                  className="w-5 h-5" 
                                  alt="Toggle Balance" 
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Part: Clean White Details */}
                        <div className="h-[40%] bg-white px-4 py-3 flex justify-between items-center text-[#30009F] font-bold text-[11px] border-t border-slate-100">
                          <div>
                            <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">No. Rekening</span>
                            <span className="font-mono text-xs text-slate-800">{loggedInUser.accountNo}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Pemilik</span>
                            <span className="text-slate-850 truncate block max-w-[150px]">{loggedInUser.name.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section (White Sheet) */}
                    <div className="flex-1 bg-white rounded-t-[36px] p-5 pb-8 space-y-5 border-t border-slate-100 shadow-md">
                      
                      {/* 12-MENU LAYANAN GRID */}
                      <div className="space-y-3">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#30009F] block mb-1">Layanan Perbankan</span>
                        
                        <div className="grid grid-cols-4 gap-x-1 gap-y-4.5">
                          
                          {/* Transfer */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Transfer"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/transfer-violet.png" className="w-7 h-7" alt="Transfer" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Transfer</span>
                          </button>

                          {/* Pulsa & Paket Data */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Telekomunikasi"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#FFCDF7]/30 border border-[#FFCDF7]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/paket-data-violet.png" className="w-7 h-7" alt="Pulsa & Data" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Pulsa &amp; Data</span>
                          </button>

                          {/* Tagihan */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Tagihan"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/tagihan-violet.png" className="w-7 h-7" alt="Tagihan" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Tagihan</span>
                          </button>

                          {/* Keuangan / Pembayaran */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Keuangan"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#FFCDF7]/30 border border-[#FFCDF7]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/pembayaran-&-top-up-violet.png" className="w-7 h-7" alt="Pembayaran" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Pembayaran</span>
                          </button>

                          {/* Hiburan */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Hiburan"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#FFCDF7]/30 border border-[#FFCDF7]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/hiburan-violet.png" className="w-7 h-7" alt="Hiburan" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Hiburan</span>
                          </button>

                          {/* Pajak (Layanan Pemerintah) */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Layanan Pemerintah"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/pajak-violet.png" className="w-7 h-7" alt="Pajak" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Pajak</span>
                          </button>

                          {/* Pendidikan */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Pendidikan & Layanan Sosial"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/edukasi-violet.png" className="w-7 h-7" alt="Pendidikan" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Pendidikan</span>
                          </button>

                          {/* Investasi */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Investasi"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#FFCDF7]/30 border border-[#FFCDF7]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/investasi-violet.png" className="w-7 h-7" alt="Investasi" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Investasi</span>
                          </button>

                          {/* Cardless */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Cardless"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#FFCDF7]/30 border border-[#FFCDF7]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/cardless-violet.png" className="w-7 h-7" alt="Cardless ATM" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Cardless</span>
                          </button>

                          {/* Produk Bank */}
                          <button 
                            onClick={() => { playSound("click"); setSelectedCategory("Produk Perbankan"); setCurrentScreen("feature_sheet"); }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/bank-violet.png" className="w-7 h-7" alt="Produk Perbankan" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight text-wrap">Produk Bank</span>
                          </button>

                          {/* E-Statement */}
                          <button 
                            onClick={() => {
                              playSound("click");
                              setSelectedCategory("Rekening Koran");
                              setSelectedSubFeature("Rekening Koran");
                              setFormInputs({ month: "Juni 2026" });
                              setCurrentScreen("feature_detail");
                            }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/50 flex items-center justify-center shadow-xs">
                              <img src="/asset/e-statement-violet.png" className="w-7 h-7" alt="E-Statement" />
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">Laporan</span>
                          </button>

                          {/* CentraPot */}
                          <button 
                            onClick={() => {
                              playSound("click");
                              setSelectedCategory("Produk Perbankan");
                              setSelectedSubFeature("CentraPot");
                              setCurrentScreen("feature_detail");
                            }}
                            className="flex flex-col items-center gap-2 active:scale-95 transition-transform cursor-pointer"
                          >
                            <div className="w-13 h-13 rounded-2xl bg-[#FFCDF7]/30 border border-[#FFCDF7]/50 flex items-center justify-center shadow-xs">
                              {/* Bucket/Pot Custom SVG matching reference screenshot */}
                              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 10v9a3 3 0 01-3 3H8a3 3 0 01-3-3v-9h14z" fill="#30009F" />
                                <path d="M4 8h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v2a1 1 0 001 1z" fill="#30009F" opacity="0.8" />
                                <path d="M12 2a3 3 0 00-3 3h6a3 3 0 00-3-3z" fill="#30009F" />
                              </svg>
                            </div>
                            <span className="text-[10.5px] font-extrabold text-slate-800 text-center tracking-tight leading-tight">CentraPot</span>
                          </button>

                        </div>
                      </div>

                      {/* Developer panel inside standard view settings */}
                      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500">Mode Lansia Demo Testing:</span>
                        <button 
                          onClick={() => {
                            playSound("click");
                            setForceElderlyMode(true);
                            pushNotification("Tampilan disesuaikan untuk Lansia.");
                          }}
                          className="text-[#30009F] font-black underline cursor-pointer"
                        >
                          Aktifkan Mode Lansia
                        </button>
                      </div>

                      {/* Centra Promo Banner */}
                      <div className="relative rounded-2xl overflow-hidden bg-[#FFCDF7]/10 border border-[#FFCDF7]/35 p-3 flex items-center gap-3 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-[#FFCDF7]/30 text-[#30009F] flex items-center justify-center text-lg shrink-0">
                          ☕
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[10px] font-black text-[#30009F] leading-none uppercase tracking-wide">Mitra Kopi Kenangan</h5>
                          <p className="text-[10px] text-slate-600 font-semibold mt-1 truncate">Diskon 50% untuk Kopi Susu Aren via QRIS Centra</p>
                        </div>
                      </div>

                      {/* RIWAYAT MUTASI DARI DATABASE (MASKED FOR PRIVACY) */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#30009F]">Riwayat Transaksi</span>
                            <button 
                              onClick={() => {
                                playSound("click");
                                setIsHomeTransactionsVisible(!isHomeTransactionsVisible);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[#E3CDFF]/30 transition-all cursor-pointer"
                              title={isHomeTransactionsVisible ? "Sembunyikan" : "Tampilkan"}
                            >
                              <img 
                                src={isHomeTransactionsVisible ? "/asset/eye-on-pink.png" : "/asset/eye-off-pink.png"} 
                                className="w-3.5 h-3.5" 
                                style={{ filter: "invert(12%) sepia(95%) saturate(4156%) saturate(120%) hue-rotate(258deg) brightness(85%) contrast(124%)" }}
                                alt="Toggle Riwayat" 
                              />
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              playSound("click");
                              setCurrentScreen("riwayat_view");
                            }}
                            className="text-[10px] font-black text-[#30009F] hover:underline cursor-pointer"
                          >
                            Semua
                          </button>
                        </div>

                        {!isHomeTransactionsVisible ? (
                          <div className="p-4 py-5 rounded-2xl bg-[#E3CDFF]/10 border border-[#E3CDFF]/30 shadow-2xs flex flex-col items-center justify-center text-center">
                            <img src="/asset/riwayat-lilac.png" className="w-7 h-7 opacity-35 mb-1.5" alt="Tersembunyi" />
                            <span className="text-[9.5px] font-black text-slate-800 uppercase tracking-wider">Riwayat Transaksi Tersembunyi</span>
                            <span className="text-[8.5px] text-slate-500 font-semibold max-w-[210px] mt-0.5 leading-tight">Tekan tombol mata atau tombol di bawah untuk melihat daftar transaksi.</span>
                            <button
                              onClick={() => {
                                playSound("click");
                                setIsHomeTransactionsVisible(true);
                              }}
                              className="mt-2.5 px-3.5 py-1 bg-[#30009F] hover:bg-[#1e0064] text-white font-black text-[9px] uppercase tracking-widest rounded-lg active:scale-95 transition-all shadow-xs"
                            >
                              Tampilkan
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[140px] overflow-y-auto no-scrollbar">
                            {transactions.length === 0 ? (
                              <div className="p-3 text-center text-[10px] text-slate-450 italic font-semibold">
                                Belum ada riwayat transaksi.
                              </div>
                            ) : (
                              transactions.slice(0, 3).map((tx) => (
                                <div key={tx.id} className="flex justify-between items-center p-3 rounded-2xl bg-[#E3CDFF]/15 border border-[#E3CDFF]/30 shadow-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white border border-[#E3CDFF]/45 flex items-center justify-center shadow-2xs">
                                      <img 
                                        src={tx.type === "credit" ? "/asset/uang-masuk-violet.png" : "/asset/uang-keluar-violet.png"} 
                                        className="w-5.5 h-5.5" 
                                        alt={tx.type === "credit" ? "Uang Masuk" : "Uang Keluar"} 
                                      />
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold text-slate-850 block leading-tight">{tx.title}</span>
                                      <span className="text-[9.5px] text-[#30009F] font-extrabold uppercase mt-0.5 block">{tx.category}</span>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-black font-mono ${tx.type === "credit" ? "text-emerald-600" : "text-slate-850"}`}>
                                    {tx.type === "credit" ? "+" : "-"}{formatRupiah(tx.amount)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
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
                    className="text-lg p-1 font-bold text-[#30009F]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-base font-bold text-[#30009F]">{selectedCategory}</h3>
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
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
                        >
                          <span className="text-xs font-bold block text-slate-800">Antar Centra</span>
                          <span className="text-[9px] text-slate-400 block mt-1">Gratis biaya admin</span>
                        </button>
                        <button 
                          onClick={() => { playSound("click"); setSelectedSubFeature("Bank Lain"); setFormInputs({ bank: "BCA" }); setCurrentScreen("feature_detail"); }}
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
                        >
                          <span className="text-xs font-bold block text-slate-800">Bank Lain</span>
                          <span className="text-[9px] text-slate-400 block mt-1">Transfer online / BI-Fast</span>
                        </button>
                        <button 
                          onClick={() => { playSound("click"); setSelectedSubFeature("Valas Bank Lain"); setFormInputs({ currency: "USD" }); setCurrentScreen("feature_detail"); }}
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
                        >
                          <span className="text-xs font-bold block text-slate-800">Valas Bank Lain</span>
                          <span className="text-[9px] text-slate-400 block mt-1">Kirim mata uang asing</span>
                        </button>
                        <button 
                          onClick={() => { playSound("click"); setSelectedSubFeature("Virtual Account"); setFormInputs({}); setCurrentScreen("feature_detail"); }}
                          className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                            className="p-3 text-left bg-white rounded-xl border border-slate-200 hover:border-[#30009F] active:scale-98 transition-all"
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
                      setCurrentScreen(featureDetailBackTarget);
                    }}
                    className="text-lg p-1 font-bold text-[#30009F]"
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
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F] text-slate-850"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jumlah Transfer (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Min Rp 10.000"
                          value={formInputs.amount || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F] text-slate-850"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F] text-slate-850"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nominal (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Min Rp 10.000"
                          value={formInputs.amount || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F] text-slate-850"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                            className="flex-1 h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F] text-slate-850"
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
                            <span className="text-[#30009F]">
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Jumlah Bayar (Rp)</label>
                        <input 
                          type="number" 
                          placeholder="Nominal Pembayaran"
                          value={formInputs.amount || ""}
                          onChange={(e) => setFormInputs({ ...formInputs, amount: parseFloat(e.target.value) })}
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F]"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#30009F]"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Beli E-SIM
                      </button>
                    </div>
                  )}

                  {/* KEUANGAN - E-MONEY CARD SIMULATION (NFC TAP CHECKOUT) */}
                  {selectedSubFeature === "E-Money Card" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-[#30009F]/5 rounded-xl border border-[#30009F]/10 text-xs text-slate-650 leading-normal">
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
                                className="p-3 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 hover:border-[#30009F] transition-colors"
                              >
                                {card}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {nfcScanning && (
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                          <div className="relative w-20 h-20 rounded-full bg-[#30009F]/10 flex items-center justify-center mb-4">
                            <span className="text-xl">📡</span>
                            <div className="absolute inset-0 rounded-full border-2 border-[#30009F] animate-nfc-pulse"></div>
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                        className="w-full h-10 rounded-lg bg-[#30009F]/10 text-[#30009F] text-xs font-bold flex items-center justify-center active:scale-95"
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
                            <span className="text-[#30009F] font-mono">{formatRupiah(formInputs.taxBill)}</span>
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
                            className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95 mt-2"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                              className={`p-3 text-center rounded-xl border text-xs font-bold font-mono transition-all ${formInputs.selectedAmt === amt ? "bg-[#30009F] border-[#30009F] text-white" : "bg-white border-slate-200 text-slate-850"}`}
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Konfirmasi Setor Tunai
                      </button>
                    </div>
                  )}

                  {/* PRODUK BANK - CENTRAPOT */}
                  {selectedSubFeature === "CentraPot" && (
                    <div className="space-y-4">
                      <div className="p-3 bg-[#30009F]/5 rounded-xl border border-[#30009F]/10 text-xs text-slate-650 leading-normal">
                        <strong>CentraPot</strong> membantu Anda menyisihkan tabungan khusus untuk pos tertentu seperti liburan, beli gadget, atau investasi.
                      </div>

                      {!formInputs.showNewPotForm ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                            <span>Daftar Tabungan CentraPot</span>
                            <button 
                              onClick={() => setFormInputs({ ...formInputs, showNewPotForm: true })}
                              className="text-xs font-bold text-[#30009F] hover:underline"
                            >
                              + Buat CentraPot
                            </button>
                          </div>

                          <div className="space-y-2">
                            {centraPots.length === 0 ? (
                              <div className="p-4 text-center text-[10px] text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                                Belum ada tabungan CentraPot yang dibuat.
                              </div>
                            ) : (
                              centraPots.map(pot => (
                                <div key={pot.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-850">
                                    <span>{pot.title}</span>
                                    <span className="text-[#30009F] font-mono">{formatRupiah(pot.current)} / {formatRupiah(pot.target).replace("Rp", "").trim()}</span>
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
                          <span className="block text-xs font-bold text-[#30009F] border-b pb-1">CentraPot Baru</span>
                          
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-550 uppercase mb-1">Nama CentraPot</label>
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
                            className="w-full py-2 bg-[#30009F] text-white text-xs font-bold rounded-lg active:scale-95 mt-1"
                          >
                            Simpan CentraPot
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
                        <div className="p-3 bg-[#30009F]/5 border border-[#30009F]/10 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Estimasi Bunga Kotor/Bulan:</span>
                            <span className="font-bold font-mono text-[#30009F]">{formatRupiah(formInputs.interest)}</span>
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
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
                        className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                      >
                        Proses Pembayaran
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* 2B. BUKA REKENING (REGISTRATION FLOW) */}
            {currentScreen === "buka_rekening" && (
              <div className="flex-1 flex flex-col justify-between p-6 phone-brand-bg animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-[#E3CDFF]/30 pb-3 mt-4">
                  {regStep < 5 && (
                    <button 
                      onClick={() => {
                        playSound("click");
                        if (regStep > 1) {
                          setRegStep(regStep - 1);
                        } else {
                          setCurrentScreen("login");
                        }
                      }}
                      className="text-[#30009F] font-black text-lg p-1 bg-white/50 hover:bg-white/80 rounded-lg w-8 h-8 flex items-center justify-center transition-all cursor-pointer"
                    >
                      &larr;
                    </button>
                  )}
                  <div>
                    <h3 className="text-base font-extrabold text-[#30009F]">Buka Rekening Baru</h3>
                    <p className="text-[10px] text-slate-500 font-bold">PT Centurion Bank Tbk.</p>
                  </div>
                </div>

                {/* Step Indicator (Progress Bar) */}
                {regStep < 5 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black text-[#30009F] uppercase tracking-wider">
                      <span>Langkah {regStep} dari 4</span>
                      <span>
                        {regStep === 1 && "Verifikasi Identitas"}
                        {regStep === 2 && "Pembuatan Akun"}
                        {regStep === 3 && "Keamanan & Setoran"}
                        {regStep === 4 && "Verifikasi OTP"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#30009F] to-[#FFCDF7] transition-all duration-300"
                        style={{ width: `${(regStep / 4) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Form Container */}
                <div className="flex-1 my-4 flex flex-col justify-center">
                  
                  {/* STEP 1: PERSONAL DETAILS */}
                  {regStep === 1 && (
                    <div className="space-y-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white shadow-xl card-shadow">
                      <div className="text-center pb-2 border-b border-slate-100">
                        <span className="text-2xl">📝</span>
                        <h4 className="text-sm font-black text-slate-800 mt-1">Data Diri Lengkap</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-tight">Harap isi sesuai KTP asli Anda demi kelancaran verifikasi sistem perbankan</p>
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Nama Lengkap</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: BUDI HARIANTO"
                            value={regInputs.name}
                            onChange={(e) => setRegInputs({ ...regInputs, name: e.target.value.toUpperCase() })}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-655 mb-1">Nomor NIK (KTP - 16 Digit)</label>
                          <input 
                            type="text" 
                            maxLength={16}
                            placeholder="Masukkan 16 digit NIK Anda"
                            value={regInputs.nik}
                            onChange={(e) => setRegInputs({ ...regInputs, nik: e.target.value.replace(/[^0-9]/g, "") })}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800 font-mono tracking-wider"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-655 mb-1">Tanggal Lahir</label>
                          <input 
                            type="date" 
                            value={regInputs.birthDate}
                            onChange={(e) => setRegInputs({ ...regInputs, birthDate: e.target.value })}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          playSound("click");
                          if (!regInputs.name.trim()) {
                            pushNotification("Nama lengkap wajib diisi!");
                            return;
                          }
                          if (regInputs.nik.length !== 16) {
                            pushNotification("NIK harus tepat 16 digit!");
                            return;
                          }
                          if (!regInputs.birthDate) {
                            pushNotification("Tanggal lahir wajib diisi!");
                            return;
                          }
                          setRegStep(2);
                        }}
                        className="w-full h-11 rounded-xl bg-[#30009F] text-white font-black text-xs hover:bg-[#1e0064] transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-md mt-4"
                      >
                        Lanjutkan Ke Langkah 2
                      </button>
                    </div>
                  )}

                  {/* STEP 2: ACCESS CREDENTIALS */}
                  {regStep === 2 && (
                    <div className="space-y-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white shadow-xl card-shadow">
                      <div className="text-center pb-2 border-b border-slate-100">
                        <span className="text-2xl">🔑</span>
                        <h4 className="text-sm font-black text-slate-800 mt-1">Buat Akun M-Banking</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-tight">Buat User ID dan password unik untuk mengakses Centra Mobile Anda</p>
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-655 mb-1">User ID / Kode Akses</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: BUDI99"
                            value={regInputs.userId}
                            onChange={(e) => setRegInputs({ ...regInputs, userId: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800"
                          />
                          <span className="text-[9px] text-slate-450 font-bold mt-1 block leading-tight">Hanya huruf dan angka. Disimpan dalam huruf besar.</span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-655 mb-1">Kata Sandi (Password)</label>
                          <input 
                            type="password" 
                            placeholder="Min 6 karakter"
                            value={regInputs.passcode}
                            onChange={(e) => setRegInputs({ ...regInputs, passcode: e.target.value })}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-4">
                        <button 
                          onClick={() => { playSound("click"); setRegStep(1); }}
                          className="w-1/3 h-11 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                        >
                          Kembali
                        </button>
                        <button 
                          onClick={() => {
                            playSound("click");
                            if (regInputs.userId.length < 4) {
                              pushNotification("User ID minimal 4 karakter!");
                              return;
                            }
                            if (regInputs.passcode.length < 6) {
                              pushNotification("Password minimal 6 karakter!");
                              return;
                            }
                            setRegStep(3);
                          }}
                          className="flex-1 h-11 rounded-xl bg-[#30009F] text-white font-black text-xs hover:bg-[#1e0064] transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-md"
                        >
                          Lanjutkan Ke Langkah 3
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SECURITY & DEPOSIT */}
                  {regStep === 3 && (
                    <div className="space-y-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white shadow-xl card-shadow">
                      <div className="text-center pb-2 border-b border-slate-100">
                        <span className="text-2xl">💰</span>
                        <h4 className="text-sm font-black text-slate-800 mt-1">Keamanan &amp; Setoran</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-tight">Buat PIN 6 digit untuk transaksi dan tentukan setoran awal Anda</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-655 mb-1.5">PIN Transaksi (6 Digit Angka)</label>
                          <input 
                            type="password" 
                            maxLength={6}
                            placeholder="••••••"
                            value={regInputs.pin}
                            onChange={(e) => setRegInputs({ ...regInputs, pin: e.target.value.replace(/[^0-9]/g, "") })}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800 font-mono tracking-widest text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-655 mb-2.5">Pilihan Setoran Awal</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[100000, 250000, 500000].map((amount) => (
                              <button
                                key={amount}
                                type="button"
                                onClick={() => { playSound("click"); setRegInputs({ ...regInputs, initialDeposit: amount }); }}
                                className={`py-3.5 rounded-xl border font-black text-[11px] transition-all flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer ${
                                  regInputs.initialDeposit === amount 
                                    ? "bg-[#30009F] border-[#30009F] text-white shadow-md"
                                    : "bg-white border-slate-200 hover:border-[#E3CDFF] text-[#30009F]"
                                }`}
                              >
                                <span>Rp</span>
                                <span>{amount === 100000 ? "100.000" : amount === 250000 ? "250.000" : "500.000"}</span>
                              </button>
                            ))}
                          </div>
                          <span className="text-[9px] text-[#30009F] font-bold mt-2 block text-center leading-tight">Biaya pembuatan rekening &amp; kartu debit Rp 0 (FREE!)</span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-4">
                        <button 
                          onClick={() => { playSound("click"); setRegStep(2); }}
                          className="w-1/3 h-11 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                        >
                          Kembali
                        </button>
                        <button 
                          onClick={() => {
                            playSound("click");
                            if (regInputs.pin.length !== 6) {
                              pushNotification("PIN transaksi harus tepat 6 digit angka!");
                              return;
                            }
                            // Transition to OTP verification step
                            setRegOtpTimer(30);
                            setRegOtpSentVia("SMS");
                            setRegOtpInput("");
                            setRegStep(4);
                            pushNotification("Kode OTP berhasil dikirim via SMS!");
                          }}
                          className="flex-1 h-11 rounded-xl bg-[#30009F] text-white font-black text-xs hover:bg-[#1e0064] transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-md"
                        >
                          Lanjutkan (Verifikasi OTP)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: OTP VERIFICATION */}
                  {regStep === 4 && (
                    <div className="space-y-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-white shadow-xl card-shadow">
                      <div className="text-center pb-2 border-b border-slate-100">
                        <span className="text-2xl">🛡️</span>
                        <h4 className="text-sm font-black text-slate-800 mt-1">Verifikasi OTP</h4>
                        <p className="text-[10px] text-slate-505 font-semibold leading-tight">
                          Kode verifikasi telah dikirim ke nomor Anda melalui <span className="font-extrabold text-[#30009F]">{regOtpSentVia}</span>
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-655 mb-1.5 text-center">Masukkan Kode OTP (6 Digit)</label>
                          <input 
                            type="text" 
                            maxLength={6}
                            placeholder="Contoh: 123456"
                            value={regOtpInput}
                            onChange={(e) => setRegOtpInput(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800 font-mono tracking-widest text-center"
                          />
                        </div>

                        <div className="text-center text-xs font-semibold text-slate-500">
                          {regOtpTimer > 0 ? (
                            <span>Kirim ulang kode dalam <span className="font-bold text-[#30009F]">{regOtpTimer} detik</span></span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => {
                                  playSound("click");
                                  setRegOtpTimer(30);
                                  pushNotification(`OTP dikirim ulang via ${regOtpSentVia}!`);
                                }}
                                className="text-xs font-black text-[#30009F] underline cursor-pointer"
                              >
                                Kirim Ulang OTP (SMS)
                              </button>
                              
                              <button
                                onClick={() => {
                                  playSound("click");
                                  setRegOtpSentVia("WhatsApp");
                                  setRegOtpTimer(30);
                                  pushNotification("OTP dialihkan dan dikirim via WhatsApp!");
                                }}
                                className="text-xs font-black text-emerald-600 hover:text-emerald-700 underline cursor-pointer flex items-center justify-center gap-1"
                              >
                                💬 Kirim OTP via WhatsApp (Fallback Jaringan)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-4">
                        <button 
                          onClick={() => { playSound("click"); setRegStep(3); }}
                          className="w-1/3 h-11 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                        >
                          Kembali
                        </button>
                        <button 
                          onClick={async () => {
                            playSound("click");
                            if (regOtpInput.length !== 6) {
                              pushNotification("Kode OTP harus 6 digit angka!");
                              return;
                            }
                            
                            setIsLoading(true);
                            try {
                              const res = await registerUserAction(regInputs);
                              if (res.success && res.accountNo) {
                                playSound("success");
                                setRegResult({ accountNo: res.accountNo, userId: res.userId });
                                setRegStep(5);
                                pushNotification("Rekening Baru Berhasil Dibuka!");
                              } else {
                                playSound("error");
                                pushNotification(res.error || "Gagal membuka rekening.");
                              }
                            } catch (err: any) {
                              console.error(err);
                              playSound("error");
                              pushNotification("Terjadi kesalahan jaringan atau database.");
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          className="flex-1 h-11 rounded-xl bg-[#30009F] text-white font-black text-xs hover:bg-[#1e0064] transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-md"
                        >
                          Verifikasi &amp; Buka Akun
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* STEP 5: SUCCESS REGISTRATION SCREEN */}
                {regStep === 5 && regResult && (
                  <div className="flex-1 flex flex-col justify-between my-4 animate-fade-in">
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                      
                      {/* Success Badge */}
                      <div className="w-20 h-20 rounded-full bg-[#E3CDFF]/30 border-2 border-[#E3CDFF] flex items-center justify-center mb-6 shadow-md animate-bounce">
                        <span className="text-3xl">🎉</span>
                      </div>

                      <h4 className="text-xl font-black text-slate-900 leading-tight">Rekening Berhasil Dibuka!</h4>
                      <p className="text-xs text-slate-655 mt-1.5 font-bold leading-normal">Selamat datang di keluarga PT Centurion Bank Tbk. Berikut adalah detail akun Anda:</p>

                      {/* Details Box */}
                      <div className="w-full mt-6 bg-white/90 border border-[#E3CDFF]/40 rounded-3xl p-5 shadow-lg space-y-4 text-left card-shadow">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">Nama Nasabah</span>
                          <span className="text-xs font-black text-slate-800">{regInputs.name}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">Nomor Rekening</span>
                          <span className="text-sm font-black text-[#30009F] font-mono tracking-wider">{regResult.accountNo}</span>
                        </div>

                        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">M-Banking User ID</span>
                          <span className="text-xs font-black text-slate-800 font-mono tracking-wider">{regResult.userId}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">Saldo Setoran Awal</span>
                          <span className="text-xs font-black text-emerald-600 font-mono">{formatRupiah(regInputs.initialDeposit)}</span>
                        </div>
                      </div>

                      <div className="mt-5 p-3.5 bg-[#FFCDF7]/10 border border-[#FFCDF7]/35 rounded-2xl text-[10px] text-[#30009F] font-bold text-center leading-relaxed">
                        💡 Catatan Keamanan: Jangan pernah membagikan kata sandi atau PIN Anda kepada siapa pun, termasuk pihak Bank Centra.
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        playSound("click");
                        // Populate login screen inputs so the user can easily log in
                        setFormInputs({ 
                          ...formInputs, 
                          loginUserId: regResult.userId 
                        });
                        setCurrentScreen("login");
                      }}
                      className="w-full h-12 rounded-xl bg-[#30009F] hover:bg-[#1e0064] text-white font-black text-sm flex items-center justify-center active:scale-95 cursor-pointer shadow-md"
                    >
                      Masuk Rekening Baru
                    </button>
                  </div>
                )}

                {/* Footer brand info */}
                {regStep < 5 && (
                  <div className="text-center text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-3">
                    Centra Mobile Onboarding System &bull; &copy; 2026 PT Centurion Bank Tbk.
                  </div>
                )}
              </div>
            )}

            {/* E-STATEMENT LEDGER DETAILED VIEW SCREEN */}
            {currentScreen === "estatement_view" && statementData && (
              <div className="flex-1 flex flex-col p-5 animate-fade-in space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <button 
                    onClick={() => { playSound("click"); setCurrentScreen("feature_detail"); }}
                    className="text-lg p-1 font-bold text-[#30009F]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-base font-bold text-[#30009F]">E-Statement Ledger</h3>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-[10px] font-sans">
                  <div className="flex justify-between items-start border-b pb-2">
                    <div>
                      <span className="font-extrabold text-[#30009F] block text-xs">LAPORAN MUTASI REKENING KORAN</span>
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

            {/* DEDICATED ACTIVITY LEDGER / CASHFLOW SCREEN */}
            {currentScreen === "riwayat_view" && (
              <div className="flex-1 flex flex-col bg-[#F5F6FA] text-slate-800 animate-fade-in h-full overflow-hidden">
                {/* Fixed Header */}
                <div className="p-5 pb-3 border-b border-slate-200/80 space-y-4 shrink-0 bg-white z-20 shadow-xs">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all cursor-pointer text-slate-700 font-bold"
                      >
                        &larr;
                      </button>
                      <h3 className={`font-black tracking-wide text-slate-900 ${forceElderlyMode ? "text-2xl" : "text-base"}`}>Riwayat Transaksi</h3>
                    </div>
                    
                    <button 
                      onClick={handleDownloadRiwayat}
                      className={`flex items-center gap-1.5 bg-[#30009F] hover:bg-[#1e0064] text-white rounded-full font-black tracking-wider uppercase transition-all active:scale-95 cursor-pointer ${forceElderlyMode ? "px-4 py-2 text-xs" : "px-3 py-1.5 text-[9px]"}`}
                    >
                      {isDownloadingRiwayat ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span className="text-[11px]">📥</span>
                      )}
                      <span>Unduh</span>
                    </button>
                  </div>

                  {/* Filter pills row */}
                  <div className={`flex gap-2 relative ${forceElderlyMode ? "text-xs" : "text-[10px]"}`}>
                    
                    {/* Filter Tanggal */}
                    <div className="relative">
                      <button 
                        onClick={() => { playSound("click"); setActiveFilterDropdown(activeFilterDropdown === "Tanggal" ? null : "Tanggal"); }}
                        className={`rounded-full font-black uppercase tracking-wider border transition-all flex items-center gap-1 cursor-pointer ${riwayatFilterTanggal !== "Semua" ? "bg-[#30009F] text-[#FFCDF7] border-[#30009F]" : "bg-slate-100 border-slate-250 text-slate-700 hover:bg-slate-200/50"} ${forceElderlyMode ? "px-4 py-2" : "px-3 py-1.5"}`}
                      >
                        <span>Tgl: {riwayatFilterTanggal}</span>
                        <span className="text-[8px] opacity-75">▼</span>
                      </button>
                      {activeFilterDropdown === "Tanggal" && (
                        <div className="absolute top-9 left-0 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-40 space-y-0.5 font-bold">
                          {["Semua", "Hari Ini", "Kemarin", "7 Hari Terakhir", "30 Hari Terakhir"].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => { playSound("click"); setRiwayatFilterTanggal(opt); setActiveFilterDropdown(null); }}
                              className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer ${riwayatFilterTanggal === opt ? "bg-[#30009F] text-[#FFCDF7]" : "text-slate-700 hover:bg-slate-100"} ${forceElderlyMode ? "text-xs" : "text-[10px]"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Filter Layanan */}
                    <div className="relative">
                      <button 
                        onClick={() => { playSound("click"); setActiveFilterDropdown(activeFilterDropdown === "Layanan" ? null : "Layanan"); }}
                        className={`rounded-full font-black uppercase tracking-wider border transition-all flex items-center gap-1 cursor-pointer ${riwayatFilterLayanan !== "Semua" ? "bg-[#30009F] text-[#FFCDF7] border-[#30009F]" : "bg-slate-100 border-slate-250 text-slate-700 hover:bg-slate-200/50"} ${forceElderlyMode ? "px-4 py-2" : "px-3 py-1.5"}`}
                      >
                        <span>Layanan: {riwayatFilterLayanan}</span>
                        <span className="text-[8px] opacity-75">▼</span>
                      </button>
                      {activeFilterDropdown === "Layanan" && (
                        <div className="absolute top-9 left-0 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-40 space-y-0.5 font-bold">
                          {["Semua", "Transfer", "Keuangan", "Cardless", "Tagihan", "Lainnya"].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => { playSound("click"); setRiwayatFilterLayanan(opt); setActiveFilterDropdown(null); }}
                              className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer ${riwayatFilterLayanan === opt ? "bg-[#30009F] text-[#FFCDF7]" : "text-slate-700 hover:bg-slate-100"} ${forceElderlyMode ? "text-xs" : "text-[10px]"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Filter Metode */}
                    <div className="relative">
                      <button 
                        onClick={() => { playSound("click"); setActiveFilterDropdown(activeFilterDropdown === "Metode" ? null : "Metode"); }}
                        className={`rounded-full font-black uppercase tracking-wider border transition-all flex items-center gap-1 cursor-pointer ${riwayatFilterMetode !== "Semua" ? "bg-[#30009F] text-[#FFCDF7] border-[#30009F]" : "bg-slate-100 border-slate-250 text-slate-700 hover:bg-slate-200/50"} ${forceElderlyMode ? "px-4 py-2" : "px-3 py-1.5"}`}
                      >
                        <span>Arus: {riwayatFilterMetode === "Semua" ? "Semua" : riwayatFilterMetode === "Uang Masuk" ? "Masuk" : "Keluar"}</span>
                        <span className="text-[8px] opacity-75">▼</span>
                      </button>
                      {activeFilterDropdown === "Metode" && (
                        <div className="absolute top-9 right-0 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-40 space-y-0.5 font-bold">
                          {["Semua", "Uang Masuk", "Uang Keluar"].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => { playSound("click"); setRiwayatFilterMetode(opt); setActiveFilterDropdown(null); }}
                              className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer ${riwayatFilterMetode === opt ? "bg-[#30009F] text-[#FFCDF7]" : "text-slate-700 hover:bg-slate-100"} ${forceElderlyMode ? "text-xs" : "text-[10px]"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 bg-[#F5F6FA]">
                  
                  {/* Jago style Promo Card */}
                  <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-blue-700 via-indigo-900 to-purple-950 text-white flex items-center justify-between border border-white/10 shadow-lg card-shadow">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFCDF7]/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="z-10 flex-1 pr-4 space-y-1">
                      <h4 className={`font-black tracking-tight leading-snug uppercase text-[#FFCDF7] ${forceElderlyMode ? "text-sm" : "text-xs"}`}>Keuangan aman, gak boncos lagi</h4>
                      <p className={`opacity-80 leading-normal font-semibold ${forceElderlyMode ? "text-xs" : "text-[9.5px]"}`}>Sekarang kamu bisa pantau uangmu kepake buat apa aja secara praktis.</p>
                    </div>
                    <button 
                      onClick={() => {
                        playSound("click");
                        pushNotification("Budgeting CentraPot aktif memantau keuangan Anda.");
                      }}
                      className={`rounded-full bg-white text-[#30009F] flex items-center justify-center cursor-pointer shrink-0 z-10 hover:bg-slate-100 active:scale-95 transition-all text-xs font-black ${forceElderlyMode ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs"}`}
                    >
                      &rarr;
                    </button>
                  </div>

                  {/* Transaction Ledger List */}
                  <div className="space-y-4">
                    {Object.keys(groupedTxs).length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 italic font-semibold bg-white border border-slate-200/80 rounded-2xl">
                        Tidak ditemukan riwayat transaksi untuk filter ini.
                      </div>
                    ) : (
                      Object.keys(groupedTxs).map((dateGroup) => (
                        <div key={dateGroup} className="space-y-2">
                          <span className={`font-black uppercase tracking-widest text-[#30009F]/80 block mt-2 ${forceElderlyMode ? "text-xs" : "text-[10px]"}`}>{dateGroup}</span>
                          <div className="space-y-2">
                            {groupedTxs[dateGroup].map((tx) => {
                              // Assign icon & colors
                              let icon = "💸";
                              let bgColor = "bg-slate-100 border border-slate-200 text-slate-700";
                              if (tx.title.toLowerCase().includes("hadiah") || tx.title.toLowerCase().includes("bonus")) {
                                icon = "🎁";
                                bgColor = "bg-emerald-50 border border-emerald-100 text-emerald-700";
                              } else if (tx.category === "Transfer") {
                                icon = "👥";
                                bgColor = "bg-blue-50 border border-blue-150 text-blue-700";
                              } else if (tx.category === "Cardless") {
                                icon = "🏧";
                                bgColor = "bg-purple-50 border border-purple-150 text-purple-700";
                              } else if (tx.category === "Tagihan") {
                                icon = "⚡";
                                bgColor = "bg-amber-50 border border-amber-150 text-amber-700";
                              } else if (tx.type === "credit") {
                                icon = "📥";
                                bgColor = "bg-emerald-50 border border-emerald-100 text-emerald-700";
                              }

                              return (
                                <div key={tx.id} className={`flex justify-between items-center bg-white border border-slate-200/50 shadow-xs hover:bg-slate-50 transition-all ${forceElderlyMode ? "p-4.5 rounded-3xl" : "p-3 rounded-2xl"}`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`rounded-xl ${bgColor} flex items-center justify-center shrink-0 ${forceElderlyMode ? "w-12 h-12 text-lg" : "w-9 h-9 text-sm"}`}>
                                      {icon}
                                    </div>
                                    <div>
                                      <span className={`font-bold text-slate-800 block leading-tight ${forceElderlyMode ? "text-sm" : "text-xs"}`}>{tx.title}</span>
                                      <span className={`font-black uppercase mt-0.5 block tracking-wide text-[#30009F] ${forceElderlyMode ? "text-[10px]" : "text-[9px]"}`}>{tx.category}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`font-black font-mono block ${tx.type === "credit" ? "text-emerald-600" : "text-slate-800"} ${forceElderlyMode ? "text-sm" : "text-xs"}`}>
                                      {tx.type === "credit" ? "+" : "-"}{formatRupiah(tx.amount)}
                                    </span>
                                    <span className={`text-slate-400 font-semibold block leading-none mt-0.5 ${forceElderlyMode ? "text-[9.5px]" : "text-[8px]"}`}>Tabungan Centra</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* STANDARD M-BANKING SETTINGS SCREEN */}
            {currentScreen === "settings_view" && (
              <div className="flex-1 flex flex-col bg-[#F8F9FA] text-slate-800 animate-fade-in h-full overflow-hidden">
                {/* Fixed Header */}
                <div className="p-5 pb-4 border-b border-slate-200 shrink-0 bg-white shadow-xs z-20">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { 
                        playSound("click"); 
                        setCurrentScreen("dashboard"); 
                        setActiveSettingsForm(null);
                        setPinChangeError(null);
                        setPinChangeSuccess(false);
                        setPasscodeChangeError(null);
                        setPasscodeChangeSuccess(false);
                      }}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all cursor-pointer text-slate-700 font-bold"
                    >
                      &larr;
                    </button>
                    <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">Pengaturan M-Banking</h3>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
                  
                  {/* Category 1: Security */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black tracking-widest text-[#30009F] uppercase block">Keamanan & Akses Akun</span>
                    
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-2xs">
                      {/* Ubah PIN */}
                      <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <button 
                          onClick={() => { playSound("click"); setActiveSettingsForm(activeSettingsForm === "pin" ? null : "pin"); }}
                          className="w-full flex justify-between items-center text-left cursor-pointer"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Ubah PIN Transaksi</span>
                            <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">Diperlukan untuk memproses kirim uang & bayar tagihan</span>
                          </div>
                          <span className="text-xs text-[#30009F] font-black">{activeSettingsForm === "pin" ? "▲" : "▼"}</span>
                        </button>
                        
                        {activeSettingsForm === "pin" && (
                          <div className="mt-4 pt-4 border-t border-dashed border-slate-150 space-y-3 animate-fade-in text-[10px]">
                            <div>
                              <label className="block font-black text-slate-600 mb-1 uppercase tracking-wider">PIN Transaksi Lama</label>
                              <input 
                                type="password" 
                                maxLength={6}
                                placeholder="••••••"
                                value={settingsInputs.oldPin || ""}
                                onChange={(e) => setSettingsInputs({ ...settingsInputs, oldPin: e.target.value })}
                                className="w-full h-9 px-3 rounded-lg border border-slate-350 font-bold focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-850"
                              />
                            </div>
                            <div>
                              <label className="block font-black text-slate-600 mb-1 uppercase tracking-wider">PIN Transaksi Baru (6 Digit Angka)</label>
                              <input 
                                type="password" 
                                maxLength={6}
                                placeholder="••••••"
                                value={settingsInputs.newPin || ""}
                                onChange={(e) => setSettingsInputs({ ...settingsInputs, newPin: e.target.value })}
                                className="w-full h-9 px-3 rounded-lg border border-slate-350 font-bold focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-850"
                              />
                            </div>
                            
                            {pinChangeError && <span className="block text-red-500 font-bold text-[9px]">{pinChangeError}</span>}
                            {pinChangeSuccess && <span className="block text-emerald-600 font-bold text-[9px]">✔ PIN Transaksi berhasil diperbarui!</span>}

                            <button 
                              onClick={handleUpdatePin}
                              className="w-full py-2 bg-[#30009F] hover:bg-[#1e0064] text-white font-black uppercase tracking-widest rounded-lg active:scale-95 transition-all cursor-pointer text-xs"
                            >
                              Perbarui PIN
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Ubah Passcode */}
                      <div className="pt-1">
                        <button 
                          onClick={() => { playSound("click"); setActiveSettingsForm(activeSettingsForm === "passcode" ? null : "passcode"); }}
                          className="w-full flex justify-between items-center text-left cursor-pointer"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Ubah Kata Sandi (Passcode)</span>
                            <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">Digunakan untuk login masuk aplikasi</span>
                          </div>
                          <span className="text-xs text-[#30009F] font-black">{activeSettingsForm === "passcode" ? "▲" : "▼"}</span>
                        </button>
                        
                        {activeSettingsForm === "passcode" && (
                          <div className="mt-4 pt-4 border-t border-dashed border-slate-150 space-y-3 animate-fade-in text-[10px]">
                            <div>
                              <label className="block font-black text-slate-600 mb-1 uppercase tracking-wider">Kata Sandi Lama</label>
                              <input 
                                type="password" 
                                placeholder="••••••••"
                                value={settingsInputs.oldPasscode || ""}
                                onChange={(e) => setSettingsInputs({ ...settingsInputs, oldPasscode: e.target.value })}
                                className="w-full h-9 px-3 rounded-lg border border-slate-350 font-bold focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-800"
                              />
                            </div>
                            <div>
                              <label className="block font-black text-slate-600 mb-1 uppercase tracking-wider">Kata Sandi Baru (Min. 6 Karakter)</label>
                              <input 
                                type="password" 
                                placeholder="••••••••"
                                value={settingsInputs.newPasscode || ""}
                                onChange={(e) => setSettingsInputs({ ...settingsInputs, newPasscode: e.target.value })}
                                className="w-full h-9 px-3 rounded-lg border border-slate-350 font-bold focus:outline-none focus:ring-2 focus:ring-[#30009F] text-slate-850"
                              />
                            </div>
                            
                            {passcodeChangeError && <span className="block text-red-500 font-bold text-[9px]">{passcodeChangeError}</span>}
                            {passcodeChangeSuccess && <span className="block text-emerald-600 font-bold text-[9px]">✔ Kata Sandi berhasil diperbarui!</span>}

                            <button 
                              onClick={handleUpdatePasscode}
                              className="w-full py-2 bg-[#30009F] hover:bg-[#1e0064] text-white font-black uppercase tracking-widest rounded-lg active:scale-95 transition-all cursor-pointer text-xs"
                            >
                              Perbarui Kata Sandi
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Card & Limit */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black tracking-widest text-[#30009F] uppercase block">Pengaturan Kartu & Limit</span>
                    
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4.5 shadow-2xs text-xs">
                      
                      {/* Block card toggle */}
                      <div className="flex justify-between items-center">
                        <div className="max-w-[80%] pr-2">
                          <span className="font-bold text-slate-800 block">Blokir Kartu Debit</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 block leading-tight">Blokir sementara akses kartu ATM Anda demi keamanan</span>
                        </div>
                        
                        <button 
                          onClick={() => {
                            playSound("click");
                            const nextVal = !settingsInputs.isCardBlocked;
                            setSettingsInputs({ ...settingsInputs, isCardBlocked: nextVal });
                            pushNotification(nextVal ? "Kartu Utama Centra berhasil diblokir sementara." : "Blokir kartu utama berhasil dibuka.");
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settingsInputs.isCardBlocked ? "bg-rose-500" : "bg-slate-300"}`}
                        >
                          <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all shadow-xs ${settingsInputs.isCardBlocked ? "right-1" : "left-1"}`} />
                        </button>
                      </div>

                      {/* Transaction limit dropdown */}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 block">Limit Harian Transaksi</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 block">Membatasi nominal transfer maksimal per hari</span>
                        </div>
                        
                        <select
                          value={settingsInputs.dailyLimit}
                          onChange={(e) => {
                            playSound("click");
                            const limit = Number(e.target.value);
                            setSettingsInputs({ ...settingsInputs, dailyLimit: limit });
                            pushNotification(`Limit harian transaksi diubah menjadi ${formatRupiah(limit)}`);
                          }}
                          className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] font-black text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#30009F] cursor-pointer"
                        >
                          <option value={10000000}>Rp 10.000.000</option>
                          <option value={25000000}>Rp 25.000.000</option>
                          <option value={50000000}>Rp 50.000.000</option>
                          <option value={100000000}>Rp 100.000.000</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Category 3: Notifications & Preferences */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black tracking-widest text-[#30009F] uppercase block">Notifikasi & Biometrik</span>
                    
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-4.5 shadow-2xs text-xs">
                      
                      {/* Biometric toggle */}
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800 block">Login Sidik Jari (Biometrik)</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 block">Gunakan sensor biometrik perangkat untuk masuk cepat</span>
                        </div>
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSettingsInputs({ ...settingsInputs, biometrics: !settingsInputs.biometrics });
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settingsInputs.biometrics ? "bg-[#30009F]" : "bg-slate-300"}`}
                        >
                          <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all shadow-xs ${settingsInputs.biometrics ? "right-1" : "left-1"}`} />
                        </button>
                      </div>

                      {/* SMS Notifications */}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 block">Notifikasi SMS Transaksi</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 block">Kirim pesan teks SMS instan saat saldo berubah</span>
                        </div>
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSettingsInputs({ ...settingsInputs, smsNotif: !settingsInputs.smsNotif });
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settingsInputs.smsNotif ? "bg-[#30009F]" : "bg-slate-300"}`}
                        >
                          <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all shadow-xs ${settingsInputs.smsNotif ? "right-1" : "left-1"}`} />
                        </button>
                      </div>

                      {/* Email Notifications */}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 block">Notifikasi E-Statement Email</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 block">Kirim rincian struk transfer ke alamat email terdaftar</span>
                        </div>
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSettingsInputs({ ...settingsInputs, emailNotif: !settingsInputs.emailNotif });
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settingsInputs.emailNotif ? "bg-[#30009F]" : "bg-slate-300"}`}
                        >
                          <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all shadow-xs ${settingsInputs.emailNotif ? "right-1" : "left-1"}`} />
                        </button>
                      </div>

                      {/* Push Notifications */}
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 block">Notifikasi Push Aplikasi</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold mt-0.5 block">Pop-up notifikasi langsung di layar atas ponsel Anda</span>
                        </div>
                        <button 
                          onClick={() => {
                            playSound("click");
                            setSettingsInputs({ ...settingsInputs, pushNotif: !settingsInputs.pushNotif });
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${settingsInputs.pushNotif ? "bg-[#30009F]" : "bg-slate-300"}`}
                        >
                          <div className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all shadow-xs ${settingsInputs.pushNotif ? "right-1" : "left-1"}`} />
                        </button>
                      </div>

                    </div>
                  </div>

                  <div className="text-center text-[9px] text-slate-400 font-semibold">
                    Centra M-Banking Pengaturan Keamanan Tervalidasi &bull; &copy; 2026 PT Centurion Bank Tbk.
                  </div>

                </div>
              </div>
            )}

            {/* CUSTOMER SERVICE CHATBOT SCREEN */}
            {currentScreen === "cs_chat_view" && (
              <div className="flex-1 flex flex-col bg-[#F5F6FA] text-slate-850 animate-fade-in h-full overflow-hidden">
                {/* Fixed Header */}
                <div className="p-4 border-b border-slate-200 shrink-0 bg-white shadow-xs z-20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all cursor-pointer text-slate-700 font-bold"
                    >
                      &larr;
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-[#E3CDFF] border border-[#30009F]/20 flex items-center justify-center text-lg shadow-2xs font-sans">
                        🤖
                      </div>
                      <div>
                        <h4 className={`font-black text-slate-900 leading-tight ${forceElderlyMode ? "text-base" : "text-xs"}`}>Asisten Centra Care</h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mode accessibility tag in header */}
                  {forceElderlyMode && (
                    <span className="text-[8px] font-black bg-[#FFCDF7] text-[#30009F] px-2 py-0.5 rounded border border-[#FFCDF7] shadow-2xs">TEKS BESAR</span>
                  )}
                </div>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5 bg-slate-50/50">
                  {csMessages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    return (
                      <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
                        <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-2xs leading-relaxed ${isUser ? "bg-[#30009F] text-white rounded-br-none" : "bg-[#E3CDFF]/30 border border-[#E3CDFF]/60 text-slate-800 rounded-bl-none"} ${forceElderlyMode ? "text-sm font-bold" : "text-[11px] font-semibold"}`}>
                          {!isUser && <span className="block text-[8px] font-black uppercase tracking-wider text-[#30009F] mb-1">Centra Bot</span>}
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing bubble */}
                  {csLoading && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-[#E3CDFF]/30 border border-[#E3CDFF]/60 p-3 rounded-2xl rounded-bl-none text-slate-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-2xs">
                        <span className="w-1.5 h-1.5 bg-[#30009F] rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-[#30009F] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#30009F] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        <span>Centra sedang mengetik...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* FAQ suggestion chips & Input area */}
                <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-3 z-20 shadow-md">
                  
                  {/* Suggestion Chips */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 text-[9.5px] font-bold">
                    {[
                      "Bagaimana cek saldo?",
                      "Bagaimana ubah PIN?",
                      "Blokir kartu debit",
                      "Transaksi gagal QRIS"
                    ].map((faq) => (
                      <button
                        key={faq}
                        disabled={csLoading}
                        onClick={() => handleSendMessage(faq)}
                        className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-[#E3CDFF]/25 border border-slate-200 hover:border-[#E3CDFF] text-slate-700 hover:text-[#30009F] active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {faq}
                      </button>
                    ))}
                  </div>

                  {/* Text Input Row */}
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      disabled={csLoading}
                      placeholder="Ketik pertanyaan perbankan Anda di sini..."
                      value={csInputText}
                      onChange={(e) => setCsInputText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
                      className={`flex-1 h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-[#30009F] focus:border-transparent text-slate-800 disabled:opacity-50 ${forceElderlyMode ? "text-xs" : "text-[11px]"}`}
                    />
                    
                    <button
                      disabled={csLoading || !csInputText.trim()}
                      onClick={() => handleSendMessage()}
                      className="w-10 h-10 rounded-xl bg-[#30009F] hover:bg-[#1e0064] disabled:bg-slate-200 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                    >
                      <span className="text-base">➔</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. PIN TRANSKEYPAD MODAL */}
            {currentScreen === "pin_modal" && (
              <div className="flex-1 flex flex-col justify-between p-6 animate-fade-in bg-gradient-to-b from-[#30009F] to-[#1e0064] text-white">
                <div className="text-center mt-6">
                  <h3 className="text-lg font-black tracking-widest text-[#FFCDF7]">PIN Transaksi</h3>
                  <p className="text-[11px] text-[#E3CDFF] mt-1 font-semibold">Masukkan 6 digit PIN transaksi Centra Anda</p>
                  
                  <div className="flex justify-center gap-3.5 mt-8">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={`w-4 h-4 rounded-full border-2 border-[#FFCDF7] transition-all duration-200 ${pinInput.length > i ? "bg-[#FFCDF7] scale-110 shadow-[0_0_10px_rgba(255,205,247,0.8)]" : "bg-transparent"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto mb-8 font-semibold">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button 
                      key={num} 
                      onClick={() => handlePinPress(num)}
                      className="w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white font-mono font-bold text-2xl flex items-center justify-center pin-btn cursor-pointer transition-all hover:bg-white/20"
                    >
                      {num}
                    </button>
                  ))}
                  <button 
                    onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                    className="w-16 h-16 rounded-full text-[#FFCDF7] text-xs font-black flex items-center justify-center hover:text-white cursor-pointer active:scale-90 transition-transform"
                  >
                    BATAL
                  </button>
                  <button 
                    onClick={() => handlePinPress("0")}
                    className="w-16 h-16 rounded-full bg-white/10 border border-white/20 text-white font-mono font-bold text-2xl flex items-center justify-center pin-btn cursor-pointer transition-all hover:bg-white/20"
                  >
                    0
                  </button>
                  <button 
                    onClick={handlePinBackspace}
                    className="w-16 h-16 rounded-full text-[#FFCDF7] text-lg font-bold flex items-center justify-center hover:text-white cursor-pointer active:scale-90 transition-transform"
                  >
                    &larr;
                  </button>
                </div>
              </div>
            )}

            {/* 7. DIGITAL RECEIPT (SUCCESS VIEW) */}
            {currentScreen === "receipt" && lastTxResult && (
              <div className="flex-1 flex flex-col justify-between p-6 phone-brand-bg animate-fade-in">
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
                  
                  {/* Glowing success checkmark */}
                  <div className="w-18 h-18 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/35 animate-laser-pulse">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider block inline-block">Transaksi Sukses</span>
                    <h4 className="text-2xl font-black text-slate-900 mt-3 font-mono">{formatRupiah(lastTxResult.amount)}</h4>
                  </div>

                  {/* Digital Receipt Card (Paper Receipt style) */}
                  <div className="w-full bg-white rounded-3xl border border-slate-150 p-5 text-left text-xs font-semibold text-slate-700 space-y-3.5 shadow-xl relative overflow-hidden card-shadow">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#30009F]"></div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Tujuan</span>
                      <span className="text-slate-850 font-black text-right">{lastTxResult.title}</span>
                    </div>
                    {lastTxResult.recipient && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">No. Penerima/Ref</span>
                        <span className="text-slate-850 font-mono font-black">{lastTxResult.recipient}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Nomor Resi</span>
                      <span className="text-slate-850 font-mono font-bold">{lastTxResult.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Tanggal</span>
                      <span className="text-slate-850 font-black">
                        {new Date(lastTxResult.date).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    
                    {lastTxResult.note && lastTxResult.note.includes("ATM") && (
                      <div className="p-3.5 rounded-2xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/75 text-center mt-2.5 space-y-1.5 shadow-2xs">
                        <span className="block text-[9px] text-[#30009F] uppercase font-black tracking-widest">Kode Penarikan ATM</span>
                        <span className="block text-3xl font-black font-mono text-[#30009F] tracking-widest leading-none">
                          {Math.floor(100000 + Math.random() * 900000)}
                        </span>
                        <span className="block text-[9px] text-slate-500 font-semibold">Tunjukkan di mesin ATM Centurion terdekat, berlaku 5 menit</span>
                      </div>
                    )}
                    
                    <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center font-black">
                      <span className="text-slate-500 text-xs">Total Transaksi</span>
                      <span className="text-[#30009F] font-mono text-sm">{formatRupiah(lastTxResult.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button 
                    onClick={() => { playSound("click"); pushNotification("Resi PDF berhasil disimpan!"); }}
                    className="py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black active:scale-95 cursor-pointer shadow-xs"
                  >
                    Simpan Resi
                  </button>
                  <button 
                    onClick={() => {
                      playSound("click");
                      setScannedCard(null);
                      setCurrentScreen("dashboard");
                    }}
                    className="py-3.5 rounded-xl bg-[#30009F] hover:bg-[#1e0064] text-white text-xs font-black active:scale-95 cursor-pointer shadow-md glow-violet"
                  >
                    Kembali Ke Beranda
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
                    className="text-lg p-1 font-bold text-[#30009F]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-base font-bold text-[#30009F]">Layanan QRIS</h3>
                </div>

                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                  {["Scan", "Pay", "Transfer", "Tap"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => { playSound("click"); setFormInputs({ ...formInputs, qrisMode: mode }); }}
                      className={`py-1.5 text-[9px] font-extrabold rounded-lg transition-all ${
                        (formInputs.qrisMode || "Scan") === mode ? "bg-[#30009F] text-white shadow" : "text-slate-500"
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
                          className="p-3 text-left rounded-xl bg-slate-50 border border-slate-250 active:scale-95 cursor-pointer"
                        >
                          <span className="text-xs font-bold block text-slate-800">Kopi Kenangan</span>
                          <span className="text-[9px] text-[#30009F] font-mono block mt-0.5">Rp 32.000</span>
                        </button>
                        <button 
                          onClick={() => triggerDemoQRScan("Super Indo", 145000)}
                          className="p-3 text-left rounded-xl bg-slate-50 border border-slate-250 active:scale-95 cursor-pointer"
                        >
                          <span className="text-xs font-bold block text-slate-800">Super Indo</span>
                          <span className="text-[9px] text-[#30009F] font-mono block mt-0.5">Rp 145.000</span>
                        </button>
                        
                        <button 
                          onClick={() => triggerDemoQRScanFailed("Warung Padang (Simulasi Gagal)", 25000)}
                          className="p-3 text-left rounded-xl bg-rose-50 border border-rose-250 active:scale-95 col-span-2 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="text-xs font-bold block text-rose-800">⚠️ Warung Padang (Simulasi Koneksi Buruk)</span>
                            <span className="text-[9px] text-rose-600 block mt-0.5">Saldo terproteksi dari pemotongan ganda</span>
                          </div>
                          <span className="text-[10px] font-mono font-black text-rose-800 bg-rose-200/50 px-2 py-1 rounded">Rp 25.000</span>
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
                      className="w-full h-10 rounded-lg bg-[#30009F] text-white text-xs font-bold flex items-center justify-center active:scale-95"
                    >
                      Kirim Saldo QRIS
                    </button>
                  </div>
                )}

                {/* QRIS TAP MODE (NFC PAY TERMINAL) */}
                {formInputs.qrisMode === "Tap" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                    <div className="relative w-28 h-28 rounded-full bg-[#30009F]/5 flex items-center justify-center">
                      <span className="text-3xl">🛜</span>
                      <div className="absolute inset-0 rounded-full border-2 border-[#30009F]/40 animate-nfc-pulse"></div>
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
                      className="w-full py-2.5 rounded-lg bg-[#30009F] text-white text-xs font-bold active:scale-95"
                    >
                      Dekatkan Ke Terminal Pembayaran
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* NOTIFICATION CENTER SCREEN */}
            {currentScreen === "notifications_list" && loggedInUser && (
              <div className="flex-1 flex flex-col p-5 animate-fade-in space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <button 
                    onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                    className="text-lg p-1 font-bold text-[#30009F]"
                  >
                    &larr;
                  </button>
                  <h3 className="text-base font-black text-[#30009F]">Notifikasi</h3>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                  <div className="p-3.5 bg-[#E3CDFF]/15 border border-[#E3CDFF]/40 rounded-2xl flex gap-3">
                    <img src="/asset/notification-violet.png" className="w-6 h-6 shrink-0" alt="Notification" />
                    <div>
                      <span className="text-[11px] font-black text-[#30009F]">Sistem Keamanan Terverifikasi</span>
                      <p className="text-xs text-slate-700 font-semibold mt-1">Akun Anda tersinkronisasi aman dengan database PostgreSQL Neon.</p>
                      <span className="text-[9px] text-slate-450 font-mono block mt-1.5">Hari ini, Baru saja</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#E3CDFF]/15 border border-[#E3CDFF]/40 rounded-2xl flex gap-3">
                    <img src="/asset/notification-violet.png" className="w-6 h-6 shrink-0" alt="Notification" />
                    <div>
                      <span className="text-[11px] font-black text-[#30009F]">Promo Kenangan Bulan Ini</span>
                      <p className="text-xs text-slate-700 font-semibold mt-1">Gunakan QRIS Centra untuk mendapatkan diskon 50% di Kopi Kenangan terdekat.</p>
                      <span className="text-[9px] text-slate-450 font-mono block mt-1.5">Kemarin, 14:22</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3 opacity-60">
                    <img src="/asset/notification-violet.png" className="w-6 h-6 shrink-0" alt="Notification" />
                    <div>
                      <span className="text-[11px] font-black text-slate-700">Registrasi Berhasil</span>
                      <p className="text-xs text-slate-700 mt-1">Selamat bergabung di Centra Mobile Banking oleh PT Centurion Bank.</p>
                      <span className="text-[9px] text-slate-450 font-mono block mt-1.5">22 Juni 2026, 09:15</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE VIEW SCREEN */}
            {currentScreen === "profile_view" && loggedInUser && (
              <div className="flex-1 flex flex-col p-5 animate-fade-in justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <button 
                      onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                      className="text-lg p-1 font-bold text-[#30009F]"
                    >
                      &larr;
                    </button>
                    <h3 className="text-base font-black text-[#30009F]">Profil Saya</h3>
                  </div>

                  {/* Profile Card details */}
                  <div className="p-5 rounded-3xl bg-[#E3CDFF]/30 border border-[#E3CDFF]/70 text-slate-800 space-y-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-[#30009F] text-white font-black text-3xl flex items-center justify-center mx-auto shadow-md border-3 border-white">
                      {loggedInUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">{loggedInUser.name}</h4>
                      <span className="text-[10px] font-black text-[#30009F] bg-[#E3CDFF] px-2.5 py-0.5 rounded-full border border-[#E3CDFF]/60 uppercase tracking-widest mt-1 inline-block">Nasabah Platinum</span>
                    </div>
                    <div className="text-left space-y-2 border-t border-[#E3CDFF]/65 pt-3 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span>User ID:</span>
                        <span className="font-bold text-slate-900">{loggedInUser.userId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>No. Rekening:</span>
                        <span className="font-mono font-bold text-slate-900">{loggedInUser.accountNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Usia:</span>
                        <span className="font-bold text-slate-900">{loggedInUser.age} tahun</span>
                      </div>
                    </div>
                  </div>

                  {/* Accessibility settings */}
                  <div className="p-4 bg-white border border-slate-150 rounded-2xl space-y-3.5 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-455 block">Pengaturan Aksesibilitas</span>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-750">
                      <span>Mode Lansia (Teks Besar & Mudah):</span>
                      <button 
                        onClick={() => {
                          playSound("click");
                          setForceElderlyMode(!forceElderlyMode);
                          pushNotification(forceElderlyMode ? "Mode Lansia dinonaktifkan." : "Mode Lansia diaktifkan.");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase border transition-all cursor-pointer ${
                          forceElderlyMode 
                            ? "bg-[#FFCDF7] text-[#30009F] border-[#FFCDF7]" 
                            : "bg-slate-100 text-slate-650 border-slate-200"
                        }`}
                      >
                        {forceElderlyMode ? "AKTIF" : "NONAKTIF"}
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    playSound("click");
                    setLoggedInUser(null);
                    setCurrentScreen("login");
                    pushNotification("Sesi Anda ditutup.");
                  }}
                  className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <img src="/asset/logout-pink.png" className="w-4.5 h-4.5" alt="Logout" />
                  <span>KELUAR DARI REKENING</span>
                </button>
              </div>
            )}

          </div>

          {/* Bottom Navigation */}
          {currentScreen !== "splash" && currentScreen !== "login" && currentScreen !== "biometric_modal" && currentScreen !== "pin_modal" && loggedInUser && (
            <div className="h-16 px-2 border-t border-slate-100 bg-white grid grid-cols-5 gap-1 items-center z-30 shrink-0 shadow-lg">
              
              {/* Beranda */}
              <button 
                onClick={() => { playSound("click"); setCurrentScreen("dashboard"); }}
                className="flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <img 
                  src={currentScreen === "dashboard" ? "/asset/beranda-violet.png" : "/asset/beranda-lilac.png"} 
                  className="w-6.5 h-6.5" 
                  alt="Beranda" 
                />
                <span className={`text-[10px] font-black tracking-tight ${currentScreen === "dashboard" ? "text-[#30009F]" : "text-slate-400"}`}>Beranda</span>
              </button>
              
              {/* Riwayat Transaksi */}
              <button 
                onClick={() => { 
                  playSound("click"); 
                  setCurrentScreen("riwayat_view"); 
                }}
                className="flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <img 
                  src={currentScreen === "riwayat_view" ? "/asset/riwayat-violet.png" : "/asset/riwayat-lilac.png"} 
                  className="w-6.5 h-6.5" 
                  alt="Riwayat" 
                />
                <span className={`text-[10px] font-black tracking-tight ${currentScreen === "riwayat_view" ? "text-[#30009F]" : "text-slate-400"}`}>Riwayat</span>
              </button>

              {/* QRIS Scanner */}
              <button 
                onClick={() => { playSound("click"); setFormInputs({ qrisMode: "Scan" }); setCurrentScreen("qris"); }}
                className="flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <img 
                  src={currentScreen === "qris" ? "/asset/qris-violet.png" : "/asset/qris-lilac.png"} 
                  className="w-6.5 h-6.5" 
                  alt="QRIS" 
                />
                <span className={`text-[10px] font-black tracking-tight ${currentScreen === "qris" ? "text-[#30009F]" : "text-slate-400"}`}>QRIS</span>
              </button>

              {/* Notifikasi */}
              <button 
                onClick={() => { playSound("click"); setCurrentScreen("notifications_list"); }}
                className="flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <img 
                  src={currentScreen === "notifications_list" ? "/asset/notification-violet.png" : "/asset/notification-lilac.png"} 
                  className="w-6.5 h-6.5" 
                  alt="Notifikasi" 
                />
                <span className={`text-[10px] font-black tracking-tight ${currentScreen === "notifications_list" ? "text-[#30009F]" : "text-slate-400"}`}>Notifikasi</span>
              </button>
              
              {/* Profil */}
              <button 
                onClick={() => { playSound("click"); setCurrentScreen("profile_view"); }}
                className="flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <img 
                  src={currentScreen === "profile_view" ? "/asset/profil-violet.png" : "/asset/profil-lilac.png"} 
                  className="w-6.5 h-6.5" 
                  alt="Profil" 
                />
                <span className={`text-[10px] font-black tracking-tight ${currentScreen === "profile_view" ? "text-[#30009F]" : "text-slate-400"}`}>Profil</span>
              </button>

            </div>
          )}

          {/* Interactive Walkthrough / Guide for Elderly Users (Rendered on App Shell level to float on top of Bottom Navigation) */}
          {currentScreen === "dashboard" && loggedInUser && forceElderlyMode && lansiaGuideStep > 0 && lansiaGuideStep <= 3 && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-45 flex flex-col justify-end p-6 pb-24">
              <div className="bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-[#E3CDFF] animate-fade-in text-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-[#30009F] tracking-wide uppercase bg-[#E3CDFF]/45 px-2.5 py-1 rounded-full">
                    💡 Panduan Langkah {lansiaGuideStep} dari 3
                  </span>
                  <button 
                    onClick={() => { playSound("click"); setLansiaGuideStep(0); }}
                    className="text-xs text-slate-450 hover:text-slate-650 font-bold cursor-pointer"
                  >
                    Lewati
                  </button>
                </div>
                
                <div className="space-y-1.5 text-left">
                  <h4 className="text-sm font-black text-slate-850">
                    {lansiaGuideStep === 1 && "Selamat Datang di Mode Lansia"}
                    {lansiaGuideStep === 2 && "Kirim Uang dengan Mudah"}
                    {lansiaGuideStep === 3 && "Hubungi CS Darurat Lansia"}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    {lansiaGuideStep === 1 && "Mode ini dirancang khusus untuk mempermudah Ibu/Bapak mengakses layanan perbankan dengan teks yang besar dan navigasi sederhana."}
                    {lansiaGuideStep === 2 && "Tombol di sebelah kiri memiliki gambar dan tulisan yang besar untuk mempermudah pengiriman uang tanpa perlu mencari menu yang rumit."}
                    {lansiaGuideStep === 3 && "Jika Ibu/Bapak mengalami kesulitan, cukup klik tombol merah di bawah untuk langsung terhubung dengan bantuan darurat kami."}
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  {lansiaGuideStep > 1 && (
                    <button 
                      onClick={() => { playSound("click"); setLansiaGuideStep(lansiaGuideStep - 1); }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black cursor-pointer active:scale-95 transition-transform"
                    >
                      Kembali
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      playSound("click");
                      if (lansiaGuideStep < 3) {
                        setLansiaGuideStep(lansiaGuideStep + 1);
                      } else {
                        setLansiaGuideStep(0);
                        pushNotification("Panduan selesai. Anda siap menggunakan Mode Lansia!");
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-[#30009F] hover:bg-[#1e0064] text-white text-xs font-black shadow-md cursor-pointer active:scale-95 transition-transform"
                  >
                    {lansiaGuideStep === 3 ? "Selesai & Mulai" : "Lanjut"}
                  </button>
                </div>
              </div>
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
