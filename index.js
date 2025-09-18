const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require("@adiwajshing/baileys");
const fs = require("fs");
const path = require("path");
const { state, saveState } = useSingleFileAuthState("auth_info.json");

async function startBot() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // kita pakai pairing code
    });

    sock.ev.on("creds.update", saveState);

    // Generate pairing code jika pertama kali
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (connection === "open") {
            console.log("Bot tersambung!");
        }
        if (connection === "close") {
            if ((lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot();
            } else {
                console.log("Terputus permanen, butuh login ulang.");
            }
        }
        if (qr) {
            console.log("Gunakan QR ini untuk pairing device:");
            console.log(qr); // bisa scan di WhatsApp untuk pairing
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const msg = messages[0];
        if (!msg.message) return;
        const sender = msg.key.remoteJid;

        // Ping
        if (msg.message.conversation === "!ping") {
            await sock.sendMessage(sender, { text: "Pong!" });
        }

        // Reply view once
        if (msg.message.conversation === ".rvo") {
            if (msg.message?.viewOnceMessage) {
                const media = msg.message.viewOnceMessage.message;
                await sock.sendMessage(sender, media);
            }
        }

        // Broadcast
        if (msg.message.conversation.startsWith("!broadcast ")) {
            const text = msg.message.conversation.replace("!broadcast ", "");
            for (let jid of Object.keys(sock.store.contacts)) {
                if (!jid.endsWith("@s.whatsapp.net")) continue;
                await sock.sendMessage(jid, { text });
            }
        }

        // Music
        if (msg.message.conversation === "!music") {
            const audioPath = path.join(__dirname, "music.mp3");
            if (fs.existsSync(audioPath)) {
                await sock.sendMessage(sender, { audio: fs.readFileSync(audioPath), mimetype: "audio/mpeg" });
            }
        }

        // Welcome
        if (msg.message.conversation === "!welcome") {
            const imgPath = path.join(__dirname, "welcome.jpg");
            if (fs.existsSync(imgPath)) {
                await sock.sendMessage(sender, { image: fs.readFileSync(imgPath), caption: "Selamat datang!" });
            }
        }
    });
}

startBot();
