const { spawn } = require("child_process");
const net = require("net");

const processes = [];


// =========================================================
// RUN COMMAND
// =========================================================

function run(command, args, cwd) {
  console.log(`\n▶ ${command} ${args.join(" ")}\n`);

  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
  });

  processes.push(child);

  return child;
}


// =========================================================
// WAIT FOR PORT
// =========================================================

function waitForPort(
  host,
  port,
  timeout = 30000
) {
  return new Promise((resolve, reject) => {

    const start = Date.now();

    function check() {

      const socket = new net.Socket();

      socket.setTimeout(1000);

      socket.once("connect", () => {
        socket.destroy();

        console.log(
          `\n✅ ${host}:${port} is ready.\n`
        );

        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - start > timeout) {
          reject(
            new Error(
              `Timed out waiting for ${host}:${port}`
            )
          );
        } else {
          setTimeout(check, 500);
        }
      });

      socket.once("timeout", () => {
        socket.destroy();

        if (Date.now() - start > timeout) {
          reject(
            new Error(
              `Timed out waiting for ${host}:${port}`
            )
          );
        } else {
          setTimeout(check, 500);
        }
      });

      socket.connect(port, host);
    }

    check();
  });
}


// =========================================================
// RUN COMMAND AND WAIT FOR COMPLETION
// =========================================================

function runAndWait(command, args, cwd) {
  return new Promise((resolve, reject) => {

    const child = run(command, args, cwd);

    child.once("exit", (code) => {

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} failed with exit code ${code}`
          )
        );
      }

    });

    child.once("error", reject);
  });
}


// =========================================================
// MAIN STARTUP
// =========================================================

async function startProject() {

  console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║     🎓 DECENTRALIZED CREDENTIAL VERIFICATION        ║
║                                                      ║
║              Starting complete system...             ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);


  try {

    // =====================================================
    // 1. START HARDHAT
    // =====================================================

    console.log("⛓️  Starting Hardhat blockchain...");

    run(
      "npx",
      [ 
        "hardhat",
        "node",
        "--hostname",
        "0.0.0.0",
      ],
      "blockchain"
    );

    await waitForPort(
      "127.0.0.1",
      8545
    );


    // =====================================================
    // 2. DEPLOY SMART CONTRACT
    // =====================================================

    console.log(
      "\n📜 Deploying smart contract..."
    );

    await runAndWait(
      "npx",
      [
        "hardhat",
        "ignition",
        "deploy",
        "ignition/modules/CredentialVerification.ts",
        "--network",
        "localhost",
        "--reset",
      ],
      "blockchain"
    );

    console.log(
      "\n✅ Smart contract deployed."
    );


    // =====================================================
    // 3. AUTHORIZE UNIVERSITY
    // =====================================================

    console.log(
      "\n🏫 Authorizing university..."
    );

    await runAndWait(
      "npx",
      [
        "hardhat",
        "run",
        "scripts/authorizeUniversity.ts",
        "--network",
        "localhost",
      ],
      "blockchain"
    );

    console.log(
      "\n✅ University authorized."
    );


    // =====================================================
    // 4. START BACKEND
    // =====================================================

    console.log(
      "\n📡 Starting IPFS + OTP backend..."
    );

    run(
      "node",
      ["server.js"],
      "server"
    );

    await waitForPort(
      "127.0.0.1",
      5050
    );


    // =====================================================
    // 5. START FRONTEND
    // =====================================================

    console.log(
      "\n💻 Starting React frontend..."
    );

    run(
      "npm",
      ["run", "dev"],
      "frontend"
    );


    // =====================================================
    // COMPLETE
    // =====================================================

    console.log(`

╔══════════════════════════════════════════════════════╗
║                                                      ║
║              🚀 PROJECT IS RUNNING                  ║
║                                                      ║
║  ⛓️  Blockchain : http://127.0.0.1:8545             ║
║  📡 Backend    : http://localhost:5050              ║
║  💻 Frontend   : http://localhost:5173              ║
║                                                      ║
║  🏫 University  : Authorized                        ║
║  🔐 OTP        : Ready                              ║
║  📄 IPFS       : Ready                              ║
║  🔗 Blockchain : Ready                              ║
║                                                      ║
║  Open: http://localhost:5173                        ║
║                                                      ║
║  Press Ctrl + C to stop everything.                 ║
║                                                      ║
╚══════════════════════════════════════════════════════╝

    `);

  } catch (error) {

    console.error(
      "\n❌ PROJECT STARTUP FAILED\n"
    );

    console.error(error.message);

    shutdown();
  }
}


// =========================================================
// SHUTDOWN EVERYTHING
// =========================================================

function shutdown() {

  console.log(
    "\n\n🛑 Stopping Decentralized Credential Verification...\n"
  );

  for (const child of processes) {

    if (
      child &&
      !child.killed
    ) {
      child.kill();
    }

  }

  process.exit(0);
}


// =========================================================
// HANDLE CTRL + C
// =========================================================

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);


// =========================================================
// START
// =========================================================

startProject();