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
