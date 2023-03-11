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
  }, [])

  return (
    <>
      <h2>horse</h2>
      <p>nostr serial event signer</p>
      <div>{error || (connected ? 'connected' : 'disconnected')}</div>
    </>
  )
}

render(<Popup />, document.getElementById('main'))
