require('dotenv').config()
require("./setting.js")
const { default: makeWASocket, useMultiFileAuthState, makeInMemoryStore, jidDecode, delay, proto } = require("@dappaoffc/baileys")
const chalk = require('chalk')
const readline = require('readline')
const pino = require('pino')
const fs = require("fs")
const figlet = require("figlet")
const moment = require('moment-timezone')

const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve) => {
    rl.question(text, resolve)
  })
}

// Helper function: smsg (simplified message object)
function smsg(conn, m, store) {
  if (!m) return m
  let M = proto.WebMessageInfo
  var message = M.fromObject(m)
  if (message.key) {
    message.id = message.key.id
    message.isBaileys = message.id.startsWith('BAE5') && message.id.length === 16
    message.chat = message.key.remoteJid
    message.fromMe = message.key.fromMe
    message.isGroup = message.chat.endsWith('@g.us')
    message.sender = conn.decodeJid(message.fromMe && conn.user.id || message.participant || message.key.participant || message.chat || '')
    if (message.isGroup) message.participant = conn.decodeJid(message.key.participant) || ''
  }
  if (message.message) {
    message.mtype = Object.keys(message.message)[0]
    message.msg = message.message[message.mtype]
    message.text = message.msg?.text || message.msg?.caption || message.message?.conversation || message.msg?.contentText || message.msg?.selectedDisplayText || message.msg?.title || ''
    message.pushName = m.pushName || 'No Name'
  }
  return message
}

async function startBot() {
  console.log(chalk.bold.green(figlet.textSync('Bot Hidetag', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
    whitespaceBreak: false
  })))
  
  console.log(chalk.yellow('🤖 Bot Hidetag'))
  console.log(chalk.cyan('📝 Send message without mentions'))
  console.log(chalk.green('✨ Simple WhatsApp Bot\n'))
  
  delay(100)
  
  const store = makeInMemoryStore({
    logger: pino().child({
      level: 'silent',
      stream: 'store'
    })
  })

  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const ronzz = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: !pairingCode,
    auth: state,
    browser: ['Hidetag Bot', 'Chrome', '20.0.04']
  })

  if (pairingCode && !ronzz.authState.creds.registered) {
    const phoneNumber = await question(chalk.magenta('\n\nSilahkan masukkan nomor WhatsApp bot anda, awali dengan 62:\n'));
    const code = await ronzz.requestPairingCode(phoneNumber.trim())
    console.log(chalk.yellow(`⚠︎ Phone number:`), chalk.white(`${phoneNumber}`))
    console.log(chalk.yellow(`⚠︎ Pairing code:`), chalk.white(`${code}`))
  }

  ronzz.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      console.log(chalk.green("✅ CONNECTION OPEN") + chalk.cyan(` ( +${ronzz.user?.["id"]["split"](":")[0]} || ${ronzz.user?.["name"]} )`))
    }
    if (connection === "close") {
      console.log(chalk.red("❌ Connection closed, tolong hapus folder session dan scan ulang"));
      startBot()
    }
    if (connection === "connecting") {
      if (ronzz.user) {
        console.log(chalk.yellow("🔄 CONNECTING...") + chalk.cyan(` ( +${ronzz.user?.["id"]["split"](":")[0]} || ${ronzz.user?.["name"]} )`))
      }
    }
  })

  store.bind(ronzz.ev)

  ronzz.ev.on('messages.upsert', async chatUpdate => {
    try {
      for (let mek of chatUpdate.messages) {
        if (!mek.message) return
        mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
        const m = smsg(ronzz, mek, store)
        if (mek.key && mek.key.remoteJid === 'status@broadcast') return
        if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
        require('./index')(ronzz, m, mek, store)
      }
    } catch (err) {
      console.error(chalk.red('❌ Message handler error:'), err)
    }
  })

  ronzz.ev.process(async (events) => {
    if (events['presence.update']) {
      await ronzz.sendPresenceUpdate('available')
    }
    if (events['messages.upsert']) {
      const upsert = events['messages.upsert']
      for (let msg of upsert.messages) {
        if (msg.key.remoteJid === 'status@broadcast') return
      }
    }
    if (events['creds.update']) {
      await saveCreds()
    }
  })

  ronzz.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {}
      return decode.user && decode.server && decode.user + '@' + decode.server || jid
    } else return jid
  }

  // Silence incoming call offers
  ronzz.ws.on('CB:call', async (json) => {
    try {
      const tag = json?.content?.[0]?.tag
      if (tag !== 'offer') return
      // intentionally do nothing
    } catch {}
  })

  return ronzz
}

startBot()
