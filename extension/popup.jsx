import browser from 'webextension-polyfill'
import {render} from 'react-dom'
import {getPublicKey, nip19} from 'nostr-tools'
import React, {useState, useRef, useEffect} from 'react'
import QRCode from 'react-qr-code'

function Popup() {
  return (
    <>
      <h2>horse - nostr serial event signer</h2>
    </>
  )
}

render(<Popup />, document.getElementById('main'))
