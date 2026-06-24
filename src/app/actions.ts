"use server";

import { sql } from "@/lib/db";

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

// 1. Authenticate user & check age
export async function loginAction(userIdInput: string, passcode: string) {
  try {
    const formattedId = userIdInput.trim().toUpperCase();
    const rows = await sql`
      SELECT * FROM users WHERE user_id = ${formattedId}
    `;

    if (rows.length === 0) {
      return { success: false, error: "User ID tidak ditemukan" };
    }

    const user = rows[0];
    if (user.passcode !== passcode) {
      return { success: false, error: "Kata sandi salah" };
    }

    // Calculate age to check if user is 55+ (for future elderly layout trigger)
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
        birthDate: user.birth_date.toISOString().split("T")[0],
        age: age,
        isElderly: age >= 55,
        pin: user.pin
      }
    };
  } catch (err: any) {
    console.error("LoginAction failed:", err);
    return { success: false, error: "Terjadi kesalahan pada server database." };
  }
}

// 2. Fetch User balance, transaction ledger, and saving pockets
export async function fetchUserDataAction(userId: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    
    // Balance
    const userRows = await sql`
      SELECT balance FROM users WHERE user_id = ${formattedId}
    `;
    if (userRows.length === 0) {
      return { success: false, error: "User tidak ditemukan" };
    }
    const balance = Number(userRows[0].balance);

    // Transactions
    const txRows = await sql`
      SELECT id, type, title, category, amount, date, note, recipient, bank_name 
      FROM transactions 
      WHERE user_id = ${formattedId} 
      ORDER BY date DESC
    `;
    const transactions = txRows.map((t) => ({
      id: t.id,
      type: t.type as "debit" | "credit",
      title: t.title,
      category: t.category,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      note: t.note || undefined,
      recipient: t.recipient || undefined,
      bankName: t.bank_name || undefined
    }));

    // CentraPots
    const potRows = await sql`
      SELECT id, title, target, current, category, date 
      FROM centra_pots 
      WHERE user_id = ${formattedId} 
      ORDER BY date ASC
    `;
    const centraPots = potRows.map((p) => ({
      id: p.id,
      title: p.title,
      target: Number(p.target),
      current: Number(p.current),
      category: p.category,
      date: p.date.toISOString().split("T")[0]
    }));

    return {
      success: true,
      balance,
      transactions,
      centraPots
    };
  } catch (err: any) {
    console.error("FetchUserDataAction failed:", err);
    return { success: false, error: "Gagal mengambil data dari database." };
  }
}

// 3. Process new transaction & mutate balance
export async function createTransactionAction(userId: string, tx: TxPayload) {
  try {
    const formattedId = userId.trim().toUpperCase();
    
    const userRows = await sql`
      SELECT balance FROM users WHERE user_id = ${formattedId}
    `;
    if (userRows.length === 0) {
      return { success: false, error: "User tidak ditemukan" };
    }
    
    const currentBalance = Number(userRows[0].balance);
    const fee = tx.fee || 0;

    if (tx.type === "debit") {
      const totalDeduction = tx.amount + fee;
      if (currentBalance < totalDeduction) {
        return { success: false, error: "Saldo Anda tidak mencukupi." };
      }
      // Deduct balance
      await sql`
        UPDATE users 
        SET balance = balance - ${totalDeduction} 
        WHERE user_id = ${formattedId}
      `;
    } else {
      // Credit (e.g. Setor Tunai)
      await sql`
        UPDATE users 
        SET balance = balance + ${tx.amount} 
        WHERE user_id = ${formattedId}
      `;
    }

    // Insert transaction
    await sql`
      INSERT INTO transactions (id, user_id, type, title, category, amount, date, note, recipient, bank_name)
      VALUES (
        ${tx.id}, 
        ${formattedId}, 
        ${tx.type}, 
        ${tx.title}, 
        ${tx.category}, 
        ${tx.amount}, 
        NOW(), 
        ${tx.note || null}, 
        ${tx.recipient || null}, 
        ${tx.bankName || null}
      )
    `;

    return { success: true };
  } catch (err) {
    console.error("CreateTransactionAction failed:", err);
    return { success: false, error: "Gagal memproses transaksi di database." };
  }
}

// 4. Create saving pocket (CentraPot)
export async function createPotAction(userId: string, pot: PotPayload) {
  try {
    const formattedId = userId.trim().toUpperCase();
    
    await sql`
      INSERT INTO centra_pots (id, user_id, title, target, current, category, date)
      VALUES (${pot.id}, ${formattedId}, ${pot.title}, ${pot.target}, 0, ${pot.category}, ${pot.date})
    `;
    
    return { success: true };
  } catch (err) {
    console.error("CreatePotAction failed:", err);
    return { success: false, error: "Gagal membuat CentraPot di database." };
  }
}

// 5. Process E-Money cardless Top Up
export async function topUpEMoneyAction(userId: string, amount: number, cardNo: string, cardType: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    
    const userRows = await sql`
      SELECT balance FROM users WHERE user_id = ${formattedId}
    `;
    if (userRows.length === 0) {
      return { success: false, error: "User tidak ditemukan" };
    }

    const currentBalance = Number(userRows[0].balance);
    if (currentBalance < amount) {
      return { success: false, error: "Saldo Anda tidak mencukupi." };
    }

    const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    // Deduct balance
    await sql`
      UPDATE users 
      SET balance = balance - ${amount} 
      WHERE user_id = ${formattedId}
    `;

    // Insert transaction
    await sql`
      INSERT INTO transactions (id, user_id, type, title, category, amount, date, note, recipient)
      VALUES (
        ${txId}, 
        ${formattedId}, 
        'debit', 
        ${`Top Up ${cardType}`}, 
        'Keuangan', 
        ${amount}, 
        NOW(), 
        ${`NFC Top Up ${cardNo}`}, 
        ${cardNo}
      )
    `;

    return { success: true };
  } catch (err) {
    console.error("TopUpEMoneyAction failed:", err);
    return { success: false, error: "Gagal memproses top up e-money di database." };
  }
}

// 6. Fetch monthly E-statement history & compute totals
export async function fetchEstatementAction(userId: string, month: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    
    const txRows = await sql`
      SELECT type, title, category, amount, date, note, recipient 
      FROM transactions 
      WHERE user_id = ${formattedId} 
      ORDER BY date DESC
    `;

    const monthLower = month.toLowerCase();
    const filteredTxs = txRows.filter((t) => {
      const d = new Date(t.date);
      const monthNames = [
        "januari", "februari", "maret", "april", "mei", "juni", 
        "juli", "agustus", "september", "oktober", "november", "desember"
      ];
      const nameMatch = monthNames[d.getMonth()];
      const yearMatch = d.getFullYear().toString();
      return monthLower.includes(nameMatch) && monthLower.includes(yearMatch);
    });

    const transactions = filteredTxs.map((t) => ({
      type: t.type as "debit" | "credit",
      title: t.title,
      category: t.category,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      note: t.note || undefined,
      recipient: t.recipient || undefined
    }));

    let totalDebit = 0;
    let totalCredit = 0;
    transactions.forEach((t) => {
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
    return { success: false, error: "Gagal memproses e-statement dari database." };
  }
}

// 7. Register a new user and generate a unique account number
interface RegisterPayload {
  userId: string;
  name: string;
  passcode: string;
  pin: string;
  birthDate: string;
  initialDeposit: number;
}

export async function registerUserAction(payload: RegisterPayload) {
  try {
    const formattedId = payload.userId.trim().toUpperCase();
    
    // Check if user_id already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE user_id = ${formattedId}
    `;
    if (existingUser.length > 0) {
      return { success: false, error: "User ID / Kode Akses sudah digunakan." };
    }

    // Generate a unique 10-digit account number (starting with 8029 like other Centra accounts)
    let accountNo = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 15) {
      const randDigits = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      accountNo = `8029 ${randDigits.slice(0, 3)} ${randDigits.slice(3)}`;
      
      const checkAcc = await sql`
        SELECT id FROM users WHERE account_no = ${accountNo}
      `;
      if (checkAcc.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return { success: false, error: "Gagal membuat nomor rekening unik. Silakan coba lagi." };
    }

    // Insert new user into database
    await sql`
      INSERT INTO users (user_id, name, passcode, pin, birth_date, balance, account_no)
      VALUES (
        ${formattedId},
        ${payload.name},
        ${payload.passcode},
        ${payload.pin},
        ${payload.birthDate},
        ${payload.initialDeposit},
        ${accountNo}
      )
    `;

    // Create an initial deposit transaction
    const txId = `TX-REG-${Math.floor(100000 + Math.random() * 900000)}`;
    await sql`
      INSERT INTO transactions (id, user_id, type, title, category, amount, date, note)
      VALUES (
        ${txId},
        ${formattedId},
        'credit',
        'Setoran Awal Buka Rekening',
        'Lainnya',
        ${payload.initialDeposit},
        NOW(),
        'Pembukaan Rekening Baru Centra Mobile'
      )
    `;

    return { 
      success: true, 
      accountNo, 
      userId: formattedId 
    };
  } catch (err: any) {
    console.error("RegisterUserAction failed:", err);
    return { success: false, error: "Gagal membuka rekening baru di database." };
  }
}

// 8. Update User PIN in PostgreSQL
export async function updateUserPinAction(userId: string, oldPin: string, newPin: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const rows = await sql`
      SELECT pin FROM users WHERE user_id = ${formattedId}
    `;
    if (rows.length === 0) {
      return { success: false, error: "User tidak ditemukan" };
    }
    if (rows[0].pin !== oldPin) {
      return { success: false, error: "PIN lama salah!" };
    }
    await sql`
      UPDATE users SET pin = ${newPin} WHERE user_id = ${formattedId}
    `;
    return { success: true };
  } catch (err) {
    console.error("UpdateUserPinAction failed:", err);
    return { success: false, error: "Gagal memperbarui PIN di database." };
  }
}

// 9. Update User Passcode (Kata Sandi) in PostgreSQL
export async function updateUserPasscodeAction(userId: string, oldPasscode: string, newPasscode: string) {
  try {
    const formattedId = userId.trim().toUpperCase();
    const rows = await sql`
      SELECT passcode FROM users WHERE user_id = ${formattedId}
    `;
    if (rows.length === 0) {
      return { success: false, error: "User tidak ditemukan" };
    }
    if (rows[0].passcode !== oldPasscode) {
      return { success: false, error: "Kata sandi lama salah!" };
    }
    await sql`
      UPDATE users SET passcode = ${newPasscode} WHERE user_id = ${formattedId}
    `;
    return { success: true };
  } catch (err) {
    console.error("UpdateUserPasscodeAction failed:", err);
    return { success: false, error: "Gagal memperbarui kata sandi di database." };
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
