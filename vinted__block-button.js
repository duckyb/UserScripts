// ==UserScript==
// @name         Vinted Block User on Product Page
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add a 'Blocca utente' button to block the seller directly from the product details page on Vinted
// @author       -
// @match        https://www.vinted.it/items/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/duckyb/UserScripts/main/vinted__block-button.js
// @updateURL    https://raw.githubusercontent.com/duckyb/UserScripts/main/vinted__block-button.js
// ==/UserScript==

// --- Constants ---
const BLOCK_BTN = {
  class:
    'block-user-btn web_ui__Button__button web_ui__Button__filled web_ui__Button__default web_ui__Button__warning web_ui__Button__truncated',
  text: 'Blocca utente',
  dataTestId: 'user-block-modal--block',
};
const UNBLOCK_BTN = {
  class:
    'block-user-btn web_ui__Button__button web_ui__Button__filled web_ui__Button__default web_ui__Button__primary web_ui__Button__truncated',
  text: 'Sblocca utente',
  dataTestId: 'unblock-user-button',
};

// --- Main logic ---
(function () {
  'use strict';

  // --- Utility functions ---
  function getCsrfToken() {
    const html = document.documentElement.innerHTML;
    const match = html.match(
      /CSRF_TOKEN.{0,30}?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
    );
    const token = match ? match[1] : '';
    if (!token) console.warn('CSRF token not found');
    return token;
  }

  function getMyUserId() {
    const html = document.documentElement.innerHTML;
    const match = html.match(/member\/(\d+)-/);
    if (match) {
      return match[1];
    }
    console.warn('User ID not found');
    return null;
  }

  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `<span class="vinted-spinner" style="display:inline-block;width:20px;height:20px;vertical-align:middle;border:2px solid #ccc;border-top:2px solid #ffffff;border-radius:50%;animation:vinted-spin 0.7s linear infinite;"></span>`;
    } else {
      btn.disabled = false;
    }
  }
  // Add spinner animation CSS
  if (!document.getElementById('vinted-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'vinted-spinner-style';
    style.textContent = `@keyframes vinted-spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`;
    document.head.appendChild(style);
  }

  function blockUserOnVinted(myUserId, hatedUserId, csrfToken, btn) {
    setButtonLoading(btn, true);
    fetch(`https://www.vinted.it/api/v2/users/${myUserId}/user_hates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ hated_user_id: Number(hatedUserId) }),
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data || data.error) {
          alert('Blocco fallito.');
          setButtonLoading(btn, false);
        } else {
          // Success: turn button into Sblocca
          btn.innerHTML = `<span class="web_ui__Button__content"><span class="web_ui__Button__label">${UNBLOCK_BTN.text}</span></span>`;
          btn.className = UNBLOCK_BTN.class;
          btn.disabled = false;
          btn.onclick = function (e) {
            e.stopPropagation();
            unblockUserOnVinted(myUserId, hatedUserId, csrfToken, btn);
          };
        }
      })
      .catch((err) => {
        alert('Errore: ' + err);
        setButtonLoading(btn, false);
      });
  }

  function unblockUserOnVinted(myUserId, hatedUserId, csrfToken, btn) {
    setButtonLoading(btn, true);
    fetch(
      `https://www.vinted.it/api/v2/users/${myUserId}/user_hates?hated_user_id=${hatedUserId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      }
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data || data.error) {
          alert('Sblocco fallito.');
          setButtonLoading(btn, false);
        } else {
          // Success: turn button back into Blocca
          btn.innerHTML = `<span class="web_ui__Button__content"><span class="web_ui__Button__label">${BLOCK_BTN.text}</span></span>`;
          btn.className = BLOCK_BTN.class;
          btn.disabled = false;
          btn.onclick = async function (e) {
            e.stopPropagation();
            const myUserId = getMyUserId();
            const csrfToken = getCsrfToken();
            const sellerId = getSellerIdFromPage();
            console.log({ myUserId, csrfToken, sellerId });
            if (!myUserId || !csrfToken || !sellerId) {
              alert(
                "Impossibile trovare il tuo ID utente, il token CSRF o l'ID del venditore."
              );
              return;
            }
            blockUserOnVinted(myUserId, sellerId, csrfToken, btn);
          };
        }
      })
      .catch((err) => {
        alert('Errore: ' + err);
        setButtonLoading(btn, false);
      });
  }

  // --- Main logic ---
  function getSellerIdFromPage() {
    // Robust: Find all /member/ links and extract the first numeric ID
    return (
      [...document.querySelectorAll('a[href*="/member/"]')]
        .map((a) => a.href.match(/\/member\/(\d+)/)?.[1])
        .filter(Boolean)[0] || null
    );
  }

  function insertBlockButton() {
    console.log('insertBlockButton');
    var askSellerList = document.querySelectorAll(
      '[data-testid="ask-seller-button"]'
    );
    console.log('Found', askSellerList.length, 'ask-seller buttons');

    askSellerList.forEach((askSellerBtn, index) => {
      console.log('Processing ask-seller button', index, askSellerBtn);

      // Check if our button already exists next to this ask-seller-button
      const existingBtn = askSellerBtn.nextElementSibling;
      if (existingBtn && existingBtn.classList.contains('block-user-btn')) {
        console.log(
          'Button already exists next to ask-seller button',
          index,
          'skipping'
        );
        return;
      }

      const btn = document.createElement('button');
      btn.innerHTML = `<span class="web_ui__Button__content"><span class="web_ui__Button__label">${BLOCK_BTN.text}</span></span>`;
      btn.className = BLOCK_BTN.class;
      btn.type = 'button';
      btn.onclick = async function (e) {
        e.stopPropagation();
        const myUserId = getMyUserId();
        const csrfToken = getCsrfToken();
        const sellerId = getSellerIdFromPage();
        if (!myUserId || !csrfToken || !sellerId) {
          alert(
            "Impossibile trovare il tuo ID utente, il token CSRF o l'ID del venditore."
          );
          return;
        }
        blockUserOnVinted(myUserId, sellerId, csrfToken, btn);
      };
      askSellerBtn.insertAdjacentElement('afterend', btn);
      console.log('Added block button after ask-seller button', index);
    });
  }

  // Observe for page changes (SPA navigation)
  let isProcessing = false;
  const observer = new MutationObserver(() => {
    if (isProcessing) return;
    isProcessing = true;

    // Add a break to prevent infinite loading
    if (document.querySelector('.block-user-btn')) {
      isProcessing = false;
      return;
    }

    console.group('Vinted Block User on Product Page');
    insertBlockButton();
    console.groupEnd();
    isProcessing = false;
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

// NOTE: Due to Vinted API limitations, it is not possible to determine
// if a user is already blocked. The button always starts as "Blocca".
// The state is only toggled locally after a user action.
