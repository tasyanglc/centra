const { neon } = require("@neondatabase/serverless");

const dbUrl = "postgresql://neondb_owner:npg_Cz0gJnM6fBro@ep-proud-fog-aiszyh92-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(dbUrl);

async function run() {
  console.log("Connecting to Neon database...");
  try {
    console.log("Creating database tables if they do not exist...");
    
    // Create Users table using tagged template literals
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        passcode VARCHAR(100) NOT NULL,
        pin VARCHAR(6) NOT NULL,
        birth_date DATE NOT NULL,
        balance BIGINT NOT NULL DEFAULT 0,
        account_no VARCHAR(20) UNIQUE NOT NULL
      )
    `;

    // Create Transactions table using tagged template literals
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
        title VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount BIGINT NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        note TEXT,
        recipient VARCHAR(50),
        bank_name VARCHAR(50)
      )
    `;

    // Create CentraPots table using tagged template literals
    await sql`
      CREATE TABLE IF NOT EXISTS centra_pots (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        target BIGINT NOT NULL,
        current BIGINT NOT NULL DEFAULT 0,
        category VARCHAR(50) NOT NULL,
        date DATE NOT NULL
      )
    `;

    console.log("Seeding user Aminah...");
    await sql`
      INSERT INTO users (user_id, name, passcode, pin, birth_date, balance, account_no)
      VALUES ('AMINAH28', 'Aminah', '2hanima8*', '789632', '2006-05-28', 500000, '2410512131')
      ON CONFLICT (user_id) DO UPDATE 
      SET name = EXCLUDED.name, 
          passcode = EXCLUDED.passcode, 
          pin = EXCLUDED.pin, 
          birth_date = EXCLUDED.birth_date, 
          balance = EXCLUDED.balance, 
          account_no = EXCLUDED.account_no
    `;

    console.log("Seeding initial transactions for Aminah...");
    await sql`
      INSERT INTO transactions (id, user_id, type, title, category, amount, date, note)
      VALUES 
      ('TX-INIT-001', 'AMINAH28', 'credit', 'Setoran Awal', 'Lainnya', 500000, NOW() - INTERVAL '1 day', 'Pembukaan Rekening Centra')
      ON CONFLICT (id) DO NOTHING
    `;

    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

run();
