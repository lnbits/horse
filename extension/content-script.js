/* globals chrome */

import {validateEvent, getEventHash} from 'nostr-tools'
import {
  callMethodOnDevice,
  METHOD_PUBLIC_KEY,
  METHOD_SIGN_MESSAGE
} from './serial'

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
  switch (message.data.type) {
    case 'getPublicKey': {
      response = await callMethodOnDevice(
        METHOD_PUBLIC_KEY,
        [],
        connectionCallbacks
      )
      break
    }
    case 'signEvent': {
      let {event} = message.data.params

      if (!event.pubkey)
        event.pubkey = await callMethodOnDevice(
          METHOD_PUBLIC_KEY,
          [],
          connectionCallbacks
        )
      if (!event.created_at) event.created_at = Math.round(Date.now() / 1000)
      if (!event.id) event.id = getEventHash(event)
      if (!validateEvent(event)) return {error: {message: 'invalid event'}}

      event.sig = await callMethodOnDevice(
        METHOD_SIGN_MESSAGE,
        [event.id],
        connectionCallbacks
      )
      response = event
      break
    }
    case 'nip04.encrypt': {
      // let {peer, plaintext} = params
      throw new Error('not implemented')
    }
    case 'nip04.decrypt': {
      // let {peer, ciphertext} = params
      throw new Error('not implemented')
    }
    default: {
      // pass on to background
      var response
      try {
        response = await chrome.runtime.sendMessage({
          type: message.data.type,
          params: message.data.params,
          host: location.host,
          cs: true
        })
      } catch (error) {
        response = {error}
      }
    }
  }

  // return response
  window.postMessage(
    {id: message.data.id, ext: 'horse', response},
    message.origin
  )
})

const connectionCallbacks = {
  onConnect() {
    chrome.runtime.sendMessage({connect: true, serial: true})
  },
  onDisconnect() {
    chrome.runtime.sendMessage({disconnect: true, serial: true})
  },
  onDone() {
    chrome.runtime.sendMessage({done: true, serial: true})
  },
  onError(error) {
    chrome.runtime.sendMessage({error, serial: true})
  }
}
