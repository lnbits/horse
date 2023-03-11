/* globals chrome */

import {Mutex} from 'async-mutex'

import {
  PERMISSIONS_REQUIRED,
  readPermissionLevel,
  updatePermission
} from './common'

let openPrompt = null
let promptMutex = new Mutex()
let releasePromptMutex = () => {}

chrome.runtime.onInstalled.addListener((_, __, reason) => {
  if (reason === 'install') chrome.runtime.openOptionsPage()
})

chrome.runtime.onMessage.addListener(async (req, sender) => {
  let {prompt, popup} = req

  if (prompt) {
    return handlePromptMessage(req)
  } else if (popup) {
    // forward to content script
    let tabs = await chrome.tabs.query({active: true})
    if (tabs.length) {
      chrome.tabs.sendMessage(tabs[0].id, req)
    }
  } else {
    return handleContentScriptMessage(req)
  }
})

chrome.runtime.onMessageExternal.addListener(async ({type, params}, sender) => {
  let extensionId = new URL(sender.url).host
  return handleContentScriptMessage({type, params, host: extensionId})
})

chrome.windows.onRemoved.addListener(windowId => {
  if (openPrompt) {
    handlePromptMessage({condition: 'no'}, null)
  }
})

async function handleContentScriptMessage({type, params, host}) {
  let level = await readPermissionLevel(host)

  if (level >= PERMISSIONS_REQUIRED[type]) {
    // authorized, proceed
  } else {
    // ask for authorization
    try {
      await promptPermission(host, PERMISSIONS_REQUIRED[type], params)
      // authorized, proceed
    } catch (_) {
      // not authorized, stop here
      return {
        error: `insufficient permissions, required ${PERMISSIONS_REQUIRED[type]}`
      }
    }
  }

  try {
    switch (type) {
      case 'getRelays': {
        let results = await chrome.storage.local.get('relays')
        return results.relays || {}
      }
    }
  } catch (error) {
    return {error: {message: error.message, stack: error.stack}}
  }
}

function handlePromptMessage({id, condition, host, level}, sender) {
  switch (condition) {
    case 'forever':
    case 'expirable':
      openPrompt?.resolve?.()
      updatePermission(host, {
        level,
        condition
      })
      break
    case 'single':
      openPrompt?.resolve?.()
      break
    case 'no':
      openPrompt?.reject?.()
      break
  }

  openPrompt = null
  releasePromptMutex()

  if (sender) {
    chrome.windows.remove(sender.tab.windowId)
  }
}

async function promptPermission(host, level, params) {
  releasePromptMutex = await promptMutex.acquire()

  let id = Math.random().toString().slice(4)
  let qs = new URLSearchParams({
    host,
    level,
    id,
    params: JSON.stringify(params)
  })

  return new Promise((resolve, reject) => {
    openPrompt = {resolve, reject}

    chrome.windows.create({
      url: `${chrome.runtime.getURL('prompt.html')}?${qs.toString()}`,
      type: 'popup',
      width: 340,
      height: 330
    })
  })
}
