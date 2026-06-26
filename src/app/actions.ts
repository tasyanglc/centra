interface TxPayload {
  id: string;
  type: "debit" | "credit";
  title: string;
  category: string;
  amount: number;
  fee?: number;
  note?: string;
  recipient?: string;
  bankName?: string;
}

interface PotPayload {
  id: string;
  title: string;
  target: number;
  category: string;
  date: string;
}

interface RegisterPayload {
  userId: string;
  name: string;
  passcode: string;
  pin: string;
  birthDate: string;
  initialDeposit: number;
}

// Helper to fetch and save data in browser's localStorage
function getLocalData() {
  if (typeof window === "undefined") {
    return {
      users: [],
      transactions: [],
      centra_pots: []
    };
  }

  // Seed default data if not present
  if (!window.localStorage.getItem("centra_users")) {
    const defaultUsers = [
      {
        id: 1,
        user_id: "AMINAH28",
        name: "Aminah",
        passcode: "2hanima8*",
        pin: "789632",
        birth_date: "2006-05-28",
        balance: 500000,
        account_no: "2410512131"
      }
    ];
    window.localStorage.setItem("centra_users", JSON.stringify(defaultUsers));
  }

  if (!window.localStorage.getItem("centra_transactions")) {
    const defaultTransactions = [
      {
        id: "TX-INIT-001",
        user_id: "AMINAH28",
        type: "credit",
        title: "Setoran Awal",
        category: "Lainnya",
        amount: 500000,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        note: "Pembukaan Rekening Centra"
      }
    ];
    window.localStorage.setItem("centra_transactions", JSON.stringify(defaultTransactions));
  }

  if (!window.localStorage.getItem("centra_pots")) {
    window.localStorage.setItem("centra_pots", JSON.stringify([]));
  }

  return {
    users: JSON.parse(window.localStorage.getItem("centra_users") || "[]"),
    transactions: JSON.parse(window.localStorage.getItem("centra_transactions") || "[]"),
    centra_pots: JSON.parse(window.localStorage.getItem("centra_pots") || "[]")
  };
}

function saveLocalData(data: { users?: any[]; transactions?: any[]; centra_pots?: any[] }) {
  if (typeof window === "undefined") return;
  if (data.users) window.localStorage.setItem("centra_users", JSON.stringify(data.users));
  if (data.transactions) window.localStorage.setItem("centra_transactions", JSON.stringify(data.transactions));
  if (data.centra_pots) window.localStorage.setItem("centra_pots", JSON.stringify(data.centra_pots));
}

// 1. Authenticate user & check age
export async function loginAction(userIdInput: string, passcode: string) {
  try {
    const formattedId = userIdInput.trim().toUpperCase();
    const { users } = getLocalData();
    const user = users.find((u: any) => u.user_id === formattedId);

    if (!user) {
      return { success: false, error: "User ID tidak ditemukan" };
    }

    if (user.passcode !== passcode) {
      return { success: false, error: "Kata sandi salah" };
    }

    // Calculate age to check if user is 55+
    const birthDate = new Date(user.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return {
      success: true,
      user: {
        userId: user.user_id,
        name: user.name,
        accountNo: user.account_no,
        balance: Number(user.balance),
        birthDate: new Date(user.birth_date).toISOString().split("T")[0],
        age: age,
        isElderly: age >= 55,
        pin: user.pin
      }
    };
  } catch (err: any) {
    console.error("LoginAction failed:", err);
    return { success: false, error: "Terjadi kesalahan pada server lokal." };
  }
}

// 2. Fetch User balance, transaction ledger, and saving pockets
export async function fetchUserDataAction(userId: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const { users, transactions: allTx, centra_pots: allPots } = getLocalData();
    
    const user = users.find((u: any) => u.user_id === formattedId);
    if (!user) {
      return { success: false, error: "User tidak ditemukan" };
    }
    const balance = Number(user.balance);

    // Transactions sorted by date DESC
    const transactions = allTx
      .filter((t: any) => t.user_id === formattedId)
      .map((t: any) => ({
        id: t.id,
        type: t.type as "debit" | "credit",
        title: t.title,
        category: t.category,
        amount: Number(t.amount),
        date: new Date(t.date).toISOString(),
        note: t.note || undefined,
        recipient: t.recipient || undefined,
        bankName: t.bank_name || undefined
      }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // CentraPots sorted by date ASC
    const centraPots = allPots
      .filter((p: any) => p.user_id === formattedId)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        target: Number(p.target),
        current: Number(p.current),
        category: p.category,
        date: new Date(p.date).toISOString().split("T")[0]
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      success: true,
      balance,
      transactions,
      centraPots
    };
  } catch (err: any) {
    console.error("FetchUserDataAction failed:", err);
    return { success: false, error: "Gagal mengambil data dari penyimpanan lokal." };
  }
}

// 3. Process new transaction & mutate balance
export async function createTransactionAction(userId: string, tx: TxPayload) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const { users, transactions } = getLocalData();
    
    const userIndex = users.findIndex((u: any) => u.user_id === formattedId);
    if (userIndex === -1) {
      return { success: false, error: "User tidak ditemukan" };
    }
    
    const currentBalance = Number(users[userIndex].balance);
    const fee = tx.fee || 0;

    if (tx.type === "debit") {
      const totalDeduction = tx.amount + fee;
      if (currentBalance < totalDeduction) {
        return { success: false, error: "Saldo Anda tidak mencukupi." };
      }
      users[userIndex].balance = currentBalance - totalDeduction;
    } else {
      users[userIndex].balance = currentBalance + tx.amount;
    }

    const newTx = {
      id: tx.id,
      user_id: formattedId,
      type: tx.type,
      title: tx.title,
      category: tx.category,
      amount: tx.amount,
      date: new Date().toISOString(),
      note: tx.note || null,
      recipient: tx.recipient || null,
      bank_name: tx.bankName || null
    };

    transactions.push(newTx);

    saveLocalData({ users, transactions });
    return { success: true };
  } catch (err) {
    console.error("CreateTransactionAction failed:", err);
    return { success: false, error: "Gagal memproses transaksi di penyimpanan lokal." };
  }
}

// 4. Create saving pocket (CentraPot)
export async function createPotAction(userId: string, pot: PotPayload) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const { centra_pots } = getLocalData();
    
    const newPot = {
      id: pot.id,
      user_id: formattedId,
      title: pot.title,
      target: pot.target,
      current: 0,
      category: pot.category,
      date: pot.date
    };

    centra_pots.push(newPot);

    saveLocalData({ centra_pots });
    return { success: true };
  } catch (err) {
    console.error("CreatePotAction failed:", err);
    return { success: false, error: "Gagal membuat CentraPot di penyimpanan lokal." };
  }
}

// 5. Process E-Money cardless Top Up
export async function topUpEMoneyAction(userId: string, amount: number, cardNo: string, cardType: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const { users, transactions } = getLocalData();
    
    const userIndex = users.findIndex((u: any) => u.user_id === formattedId);
    if (userIndex === -1) {
      return { success: false, error: "User tidak ditemukan" };
    }

    const currentBalance = Number(users[userIndex].balance);
    if (currentBalance < amount) {
      return { success: false, error: "Saldo Anda tidak mencukupi." };
    }

    const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    users[userIndex].balance = currentBalance - amount;

    const newTx = {
      id: txId,
      user_id: formattedId,
      type: "debit",
      title: `Top Up ${cardType}`,
      category: "Keuangan",
      amount: amount,
      date: new Date().toISOString(),
      note: `NFC Top Up ${cardNo}`,
      recipient: cardNo,
      bank_name: null
    };

    transactions.push(newTx);

    saveLocalData({ users, transactions });
    return { success: true };
  } catch (err) {
    console.error("TopUpEMoneyAction failed:", err);
    return { success: false, error: "Gagal memproses top up e-money di penyimpanan lokal." };
  }
}

// 6. Fetch monthly E-statement history & compute totals
export async function fetchEstatementAction(userId: string, month: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const { transactions: allTx } = getLocalData();
    
    const txRows = allTx
      .filter((t: any) => t.user_id === formattedId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthLower = month.toLowerCase();
    const filteredTxs = txRows.filter((t: any) => {
      const d = new Date(t.date);
      const monthNames = [
        "januari", "februari", "maret", "april", "mei", "juni", 
        "juli", "agustus", "september", "oktober", "november", "desember"
      ];
      const nameMatch = monthNames[d.getMonth()];
      const yearMatch = d.getFullYear().toString();
      return monthLower.includes(nameMatch) && monthLower.includes(yearMatch);
    });

    const transactions = filteredTxs.map((t: any) => ({
      type: t.type as "debit" | "credit",
      title: t.title,
      category: t.category,
      amount: Number(t.amount),
      date: new Date(t.date).toISOString(),
      note: t.note || undefined,
      recipient: t.recipient || undefined
    }));

    let totalDebit = 0;
    let totalCredit = 0;
    transactions.forEach((t: any) => {
      if (t.type === "debit") {
        totalDebit += t.amount;
      } else {
        totalCredit += t.amount;
      }
    });

    return {
      success: true,
      transactions,
      totalDebit,
      totalCredit
    };
  } catch (err) {
    console.error("FetchEstatementAction failed:", err);
    return { success: false, error: "Gagal memproses e-statement." };
  }
}

// 7. Register a new user and generate a unique account number
export async function registerUserAction(payload: RegisterPayload) {
  try {
    const formattedId = payload.userId.trim().toUpperCase();
    const { users, transactions } = getLocalData();
    
    const existingUser = users.find((u: any) => u.user_id === formattedId);
    if (existingUser) {
      return { success: false, error: "User ID / Kode Akses sudah digunakan." };
    }

    let accountNo = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 15) {
      const randDigits = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      accountNo = `8029 ${randDigits.slice(0, 3)} ${randDigits.slice(3)}`;
      
      const checkAcc = users.find((u: any) => u.account_no === accountNo);
      if (!checkAcc) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return { success: false, error: "Gagal membuat nomor rekening unik. Silakan coba lagi." };
    }

    const newUser = {
      id: users.length + 1,
      user_id: formattedId,
      name: payload.name,
      passcode: payload.passcode,
      pin: payload.pin,
      birth_date: payload.birthDate,
      balance: payload.initialDeposit,
      account_no: accountNo
    };

    users.push(newUser);

    const txId = `TX-REG-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx = {
      id: txId,
      user_id: formattedId,
      type: "credit",
      title: "Setoran Awal Buka Rekening",
      category: "Lainnya",
      amount: payload.initialDeposit,
      date: new Date().toISOString(),
      note: "Pembukaan Rekening Baru Centra Mobile",
      recipient: null,
      bank_name: null
    };

    transactions.push(newTx);

    saveLocalData({ users, transactions });

    return { 
      success: true, 
      accountNo, 
      userId: formattedId 
    };
  } catch (err: any) {
    console.error("RegisterUserAction failed:", err);
    return { success: false, error: "Gagal membuka rekening baru." };
  }
}

// 8. Update User PIN
export async function updateUserPinAction(userId: string, oldPin: string, newPin: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const { users } = getLocalData();
    
    const userIndex = users.findIndex((u: any) => u.user_id === formattedId);
    if (userIndex === -1) {
      return { success: false, error: "User tidak ditemukan" };
    }
    if (users[userIndex].pin !== oldPin) {
      return { success: false, error: "PIN lama salah!" };
    }
    
    users[userIndex].pin = newPin;
    saveLocalData({ users });
    return { success: true };
  } catch (err) {
    console.error("UpdateUserPinAction failed:", err);
    return { success: false, error: "Gagal memperbarui PIN." };
  }
}

// 9. Update User Passcode (Kata Sandi)
export async function updateUserPasscodeAction(userId: string, oldPasscode: string, newPasscode: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const { users } = getLocalData();
    
    const userIndex = users.findIndex((u: any) => u.user_id === formattedId);
    if (userIndex === -1) {
      return { success: false, error: "User tidak ditemukan" };
    }
    if (users[userIndex].passcode !== oldPasscode) {
      return { success: false, error: "Kata sandi lama salah!" };
    }
    
    users[userIndex].passcode = newPasscode;
    saveLocalData({ users });
    return { success: true };
  } catch (err) {
    console.error("UpdateUserPasscodeAction failed:", err);
    return { success: false, error: "Gagal memperbarui kata sandi." };
  }
}

// 10. Customer Service Chatbot Action (calls Gemini Flash API with local Indonesian fallback)
export async function csChatAction(chatHistory: Array<{ role: "user" | "model"; content: string }>) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback response generator based on keywords
      const lastMessage = chatHistory[chatHistory.length - 1]?.content.toLowerCase() || "";
      let reply = "Maaf, Centra Care Chatbot saat ini dalam mode offline. Ada yang bisa kami bantu terkait layanan m-banking Anda?";

      if (lastMessage.includes("saldo") || lastMessage.includes("uang")) {
        reply = "Untuk melihat saldo, silakan cek pada kartu Platinum utama di Beranda M-banking Anda. Pastikan ikon 'mata' aktif untuk memperlihatkan nominal saldo.";
      } else if (lastMessage.includes("pin") || lastMessage.includes("sandi") || lastMessage.includes("password")) {
        reply = "Ibu/Bapak dapat memperbarui PIN transaksi atau kata sandi login secara berkala melalui menu Pengaturan (ikon gir di pojok kanan atas beranda).";
      } else if (lastMessage.includes("transfer") || lastMessage.includes("kirim")) {
        reply = "Menu Kirim Uang tersedia di Beranda. Ibu/Bapak dapat melakukan transfer antar-rekening Centra (gratis) maupun ke Bank lain dengan jaringan BI-Fast.";
      } else if (lastMessage.includes("qris") || lastMessage.includes("gagal")) {
        reply = "Sistem Centra Mobile dilengkapi fitur Auto-Reversal. Jika transaksi QRIS gagal karena masalah jaringan, saldo Anda dijamin tidak terpotong.";
      } else if (lastMessage.includes("pot") || lastMessage.includes("tabung")) {
        reply = "Gunakan menu CentraPot di Beranda untuk membuat pos-pos tabungan impian Ibu/Bapak dengan target nominal tertentu secara otomatis.";
      } else if (lastMessage.includes("blokir") || lastMessage.includes("kartu")) {
        reply = "Pemblokiran kartu ATM/Debit dapat diaktifkan sementara waktu lewat menu Pengaturan & Kartu untuk mencegah penyalahgunaan.";
      } else if (lastMessage.includes("halo") || lastMessage.includes("pagi") || lastMessage.includes("siang") || lastMessage.includes("sore")) {
        reply = "Halo! Selamat datang di layanan bantuan Centra Care. Saya adalah asisten virtual Anda. Apa ada yang bisa saya bantu hari ini?";
      }

      return { success: true, reply };
    }

    // Prepare contents formatted for Gemini API
    const contents = chatHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [
              {
                text: "You are Centra Bot, a helpful customer service AI chatbot for PT Centurion Bank (Centra Mobile). Keep responses friendly, professional, brief (max 3 sentences), in Indonesian, and directly address banking inquiries."
              }
            ]
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak dapat memahami permintaan Anda saat ini.";
    return { success: true, reply: replyText.trim() };
  } catch (err: any) {
    console.error("csChatAction failed:", err);
    return { success: false, error: "Gagal memproses pesan CS." };
  }
}
