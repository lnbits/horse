import browser from 'webextension-polyfill'

import React, {useEffect, useState} from 'react'
import {render} from 'react-dom'

function Popup() {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    browser.runtime
      .sendMessage({
        popup: true,
        method: 'isConnected'
      })
      .then(setConnected)
      .catch(err => {
        setError(err.message)
      })

    browser.runtime.onMessage.addListener(async req => {
      if (req.isConnected === true) setConnected(true)
      else if (req.isConnected === false) setConnected(false)
      else if (req.serialError) setError(req.serialError)
    })
  }, [])

  return (
    <>
      <h2>horse</h2>
      <p>nostr serial event signer</p>
      <div>{error || (connected ? 'connected' : 'disconnected')}</div>
      {!connected && <button onClick={handleConnect}>connect</button>}
    </>
  )

  function handleConnect(e) {
    e.preventDefault()
    browser.runtime.sendMessage({
      popup: true,
      method: 'connect'
    })
  }
}

render(<Popup />, document.getElementById('main'))
