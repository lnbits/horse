/* globals chrome */

import { validateEvent, getEventHash } from 'nostr-tools'
import {
  callMethodOnDevice,
  METHOD_PUBLIC_KEY,
  METHOD_SIGN_MESSAGE,
  METHOD_SHARED_SECRET
} from './serial'

import { decrypt, encrypt, xOnlyToXY } from './utils'

// inject the script that will provide window.nostr
let script = document.createElement('script')
script.setAttribute('async', 'false')
script.setAttribute('type', 'text/javascript')
script.setAttribute('src', chrome.runtime.getURL('nostr-provider.js'))
document.head.appendChild(script)

// listen for messages from that script
window.addEventListener('message', async message => {
  if (message.source !== window) return
  if (!message.data) return
  if (!message.data.params) return
  if (message.data.ext !== 'horse') return

  // if we need the serial connection, handle it here (background.js doesn't have access)
  const response = await handleMessage(message)

  // return response
  window.postMessage(
    { id: message.data.id, ext: 'horse', response },
    message.origin
  )
})

const handleMessage = async (message) => {
  try {
    switch (message.data.type) {
      case 'getPublicKey': {
        return await callMethodOnDevice(
          METHOD_PUBLIC_KEY,
          [],
          connectionCallbacks
        )
      }
      case 'signEvent': {
        let { event } = message.data.params

        if (!event.pubkey)
          event.pubkey = await callMethodOnDevice(
            METHOD_PUBLIC_KEY,
            [],
            connectionCallbacks
          )
        if (!event.created_at) event.created_at = Math.round(Date.now() / 1000)
        if (!event.id) event.id = getEventHash(event)
        if (!validateEvent(event)) return { error: { message: 'invalid event' } }

        event.sig = await callMethodOnDevice(
          METHOD_SIGN_MESSAGE,
          [event.id],
          connectionCallbacks
        )
        return event
      }
      case 'nip04.encrypt': {
        const { peer, plaintext } = message.data.params
        if (!peer) {
          throw new Error('Cannot encrypt message!')
        }
        const sharedSecret = await callMethodOnDevice(
          METHOD_SHARED_SECRET,
          [xOnlyToXY(peer)],
          connectionCallbacks
        )
        console.log('### peer', peer)
        console.log('### plaintext', plaintext)
        console.log('### sharedSecret', sharedSecret)
        const ecnryptedText = await encrypt(sharedSecret, plaintext)
        console.log('### ecnryptedText', ecnryptedText)
        // throw new Error('not implemented, nip04.encrypt')
        return ecnryptedText
      }
      case 'nip04.decrypt': {
        const { peer, ciphertext } = message.data.params
        if (!peer || !ciphertext) {
          throw new Error('Cannot decrypt message!')
        }
        const sharedSecret = await callMethodOnDevice(
          METHOD_SHARED_SECRET,
          [xOnlyToXY(peer)],
          connectionCallbacks
        )
        console.log('### peer', peer)
        console.log('### plaintext', ciphertext)
        console.log('### sharedSecret', sharedSecret)
        const plainText = await decrypt(sharedSecret, ciphertext)
        console.log('### ecnryptedText', plainText)
        return plainText
      }
      default: {
        // pass on to background
        return await chrome.runtime.sendMessage({
          type: message.data.type,
          params: message.data.params,
          host: location.host,
          cs: true
        })
      }
    }
  } catch (error) {
    return { error }
  }
}

const connectionCallbacks = {
  onConnect() {
    chrome.runtime.sendMessage({ connect: true, serial: true })
  },
  onDisconnect() {
    chrome.runtime.sendMessage({ disconnect: true, serial: true })
  },
  onDone() {
    chrome.runtime.sendMessage({ done: true, serial: true })
  },
  onError(error) {
    chrome.runtime.sendMessage({ error, serial: true })
  }
}
