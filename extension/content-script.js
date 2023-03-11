/* globals chrome */

import {validateEvent, getEventHash} from 'nostr-tools'
import {
  callMethodOnDevice,
  initDevice,
  METHOD_PUBLIC_KEY,
  METHOD_SIGN_MESSAGE,
  isConnected
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

  console.log('### addEventListener', message)
  // if we need the serial connection, handle it here (background.js doesn't have access)
  switch (message.data.type) {
    case 'getPublicKey': {
      const publicKey = await callMethodOnDevice(METHOD_PUBLIC_KEY, [], connectionCallbacks)
      const xOnlyPublicKey = publicKey.substring(0, 64)
      console.log('### case: xOnlyPublicKey', xOnlyPublicKey)
      window.postMessage(
        {
          ext: 'horse',
          id: message.data.id,
          response: xOnlyPublicKey
        },
        '*'
      )
      return publicKey
    }
    case 'signEvent': {
      let {event} = message.data.params

      if (!event.pubkey) event.pubkey = callMethodOnDevice(METHOD_PUBLIC_KEY)
      if (!event.id) event.id = getEventHash(event)
      if (!validateEvent(event)) return {error: {message: 'invalid event'}}

      event.sig = await callMethodOnDevice(METHOD_SIGN_MESSAGE, [event.id])
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
          host: location.host
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

chrome.runtime.onMessage.addListener(async (req, sender) => {
  if (req.popup) {
    return handlePopupMessage(req, sender)
  }
})

const connectionCallbacks = {
  onConnect() {
    console.log('### chrome.action', chrome.action)
    // chrome.action.setBadgeBackgroundColor({color: 'green'})
    // chrome.action.setBadgeText({text: 'on'})
    // chrome.runtime.sendMessage({isConnected: true})
  },
  onDisconnect() {
    console.log('### onDisconnect')
    // chrome.action.setBadgeText({text: ''})
    // chrome.runtime.sendMessage({isConnected: false})
  },
  onDone() {
    console.log('### onDone')
    // chrome.action.setBadgeBackgroundColor({color: 'black'})
    // chrome.action.setBadgeText({text: 'done'})
    // chrome.runtime.sendMessage({isConnected: false})
  },
  onError(error) {
    console.log('### onError', error)
    // chrome.action.setBadgeBackgroundColor({color: 'red'})
    // chrome.action.setBadgeText({text: 'err'})
    // chrome.runtime.sendMessage({isConnected: false})
    // chrome.runtime.sendMessage({serialError: error})
  }
}

async function handlePopupMessage({method}) {
  switch (method) {
    case 'isConnected':
      return isConnected()
    case 'connect':
      return initDevice(connectionCallbacks)
  }
}
