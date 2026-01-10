require('./setting.js')
const { jidDecode } = require('@dappaoffc/baileys')

module.exports = async (ronzz, m, mek, store) => {
  try {
    if (m.fromMe) return
    const isGroup = m.isGroup
    if (!isGroup) return

    // Check if group is whitelisted and get metadata
    const allowedGroupNames = (process.env.BOT_GROUP_NAMES || '').split(',').map(g => g.trim()).filter(Boolean)
    const allowedGroupLinks = (process.env.BOT_GROUP_LINKS || '').split(',').map(g => g.trim()).filter(Boolean)
    
    let groupMetadata = null
    
    if (allowedGroupNames.length > 0 || allowedGroupLinks.length > 0) {
      let isWhitelisted = false
      
      try {
        groupMetadata = await ronzz.groupMetadata(m.chat)
        const groupName = (groupMetadata?.subject || '').trim()
        const groupInviteLink = groupMetadata?.inviteCode || ''
        
        // Check by group name
        if (allowedGroupNames.length > 0) {
          isWhitelisted = allowedGroupNames.some(allowed => 
            groupName.toLowerCase().includes(allowed.toLowerCase())
          )
        }
        
        // Check by group link (if name check failed or no names configured)
        if (!isWhitelisted && allowedGroupLinks.length > 0) {
          // Get full invite link
          const fullInviteLink = groupInviteLink ? `https://chat.whatsapp.com/${groupInviteLink}` : ''
          isWhitelisted = allowedGroupLinks.some(allowed => {
            // Extract invite code from allowed link
            const allowedCode = allowed.split('/').pop()?.split('?')[0]
            const currentCode = fullInviteLink.split('/').pop()?.split('?')[0]
            return allowedCode && currentCode && allowedCode === currentCode
          })
        }
        
        if (!isWhitelisted) {
          console.log(`[GROUP CHECK] Bot ignored message from non-whitelisted group: "${groupName}" (${m.chat})`)
          return
        }
        
        console.log(`[GROUP CHECK] Message from whitelisted group: "${groupName}"`)
      } catch (e) {
        console.log(`[GROUP CHECK] Failed to get group metadata: ${e.message}`)
        return
      }
    }

    // Handle text commands
    const text = (m.text || '').trim()
    const textLower = text.toLowerCase()

    // Debug: log semua pesan text
    if (text) {
      console.log('[DEBUG] Text received:', text, '| Lower:', textLower)
    }

    // Hidetag command - check if starts with hidetag
    const isHidetagCommand = textLower === 'hidetag' || 
                             textLower === '.hidetag' || 
                             textLower === '!hidetag' ||
                             textLower.startsWith('hidetag ') ||
                             textLower.startsWith('.hidetag ') ||
                             textLower.startsWith('!hidetag ')
    
    if (isHidetagCommand) {
      console.log('[HIDETAG] Command detected!')
      
      try {
        // Get group metadata if not already fetched
        if (!groupMetadata) {
          groupMetadata = await ronzz.groupMetadata(m.chat)
        }
        
        // Check if user is admin or creator
        const participants = groupMetadata.participants
        console.log('[HIDETAG] Total participants:', participants.length)
        console.log('[HIDETAG] Sender:', m.sender)
        
        // Log semua participant untuk debugging
        console.log('[HIDETAG] All participants:', participants.map(p => ({
          id: p.id,
          admin: p.admin
        })))
        console.log('[HIDETAG] m.participant:', m.participant)
        console.log('[HIDETAG] mek.key.participant:', mek.key?.participant)
        
        // Cari participant - gunakan participant dari message jika ada
        let senderParticipant = null
        
        // Method 1: Gunakan m.participant atau mek.key.participant (format LID)
        const participantId = m.participant || mek.key?.participant
        if (participantId) {
          senderParticipant = participants.find(p => p.id === participantId)
          console.log('[HIDETAG] Found via participant ID:', participantId, '->', senderParticipant ? 'Found' : 'Not found')
        }
        
        // Method 2: Jika tidak ketemu, cari dengan exact match
        if (!senderParticipant) {
          senderParticipant = participants.find(p => p.id === m.sender)
        }
        
        // Method 3: Jika masih tidak ketemu, coba decode dan match
        if (!senderParticipant) {
          try {
            const senderDecoded = jidDecode(m.sender)
            const senderUser = senderDecoded?.user
            if (senderUser) {
              // Cari participant yang memiliki user number yang sama
              senderParticipant = participants.find(p => {
                try {
                  const pDecoded = jidDecode(p.id)
                  return pDecoded?.user === senderUser
                } catch (e) {
                  // LID tidak bisa di-decode, skip
                  return false
                }
              })
            }
          } catch (e) {
            // Ignore decode errors
          }
        }
        
        console.log('[HIDETAG] Sender participant:', senderParticipant)
        
        // Check if user is owner (bypass admin check)
        const senderNumber = m.sender.replace('@s.whatsapp.net', '').replace('@c.us', '').split(':')[0]
        const isOwner = global.owner && global.owner.includes(senderNumber)
        console.log('[HIDETAG] Sender number:', senderNumber, '| Is Owner:', isOwner)
        
        const isAdmins = senderParticipant?.admin === 'admin'
        const isCreator = senderParticipant?.admin === 'superadmin'
        
        console.log('[HIDETAG] Is Admin:', isAdmins, '| Is Creator:', isCreator, '| Is Owner:', isOwner)
        
        // Allow if user is owner, admin, or creator
        if (!isAdmins && !isCreator && !isOwner) {
          console.log('[HIDETAG] User is not admin/creator/owner, sending error message')
          await ronzz.sendMessage(m.chat, { 
            text: 'Fitur Khusus Para Dewa' 
          }, { quoted: m })
          return
        }

        // Get text from quoted message, or from text after command, or empty string
        let tek = ''
        
        // First priority: quoted message
        let quoted = m.quoted
        if (!quoted) {
          // Try to get quoted from mek
          const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage || mek.message?.contextInfo?.quotedMessage
          if (quotedMsg) {
            quoted = {
              text: quotedMsg.conversation || 
                    quotedMsg.extendedTextMessage?.text || 
                    quotedMsg.imageMessage?.caption || 
                    quotedMsg.videoMessage?.caption || ''
            }
          }
        }
        
        if (quoted && quoted.text) {
          tek = quoted.text
        } else {
          // Second priority: text after command
          const textAfterCommand = text.replace(/^(hidetag|\.hidetag|!hidetag)\s+/i, '').trim()
          if (textAfterCommand) {
            tek = textAfterCommand
          }
        }
        
        console.log('[HIDETAG] Text to send:', tek || '(empty)')
        console.log('[HIDETAG] Mentions count:', participants.length)

        // Send message with mentions all participants
        await ronzz.sendMessage(m.chat, {
          text: tek,
          mentions: participants.map(a => a.id)
        })
        
        console.log('[HIDETAG] Message sent successfully!')
        
      } catch (err) {
        console.error('[HIDETAG] Error details:', err)
        console.error('[HIDETAG] Error stack:', err.stack)
        try {
          await ronzz.sendMessage(m.chat, { 
            text: '❌ Gagal melakukan hidetag: ' + err.message 
          }, { quoted: m })
        } catch (sendErr) {
          console.error('[HIDETAG] Failed to send error message:', sendErr)
        }
      }
      return
    }
  } catch (err) {
    console.error('[HIDETAG] ❌ Outer Error:', err)
    console.error('[HIDETAG] ❌ Error stack:', err.stack)
  }
}
