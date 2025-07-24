// ==UserScript==
// @name         Vinted Buybox
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add a custom 'Buybox' to the product details page on Vinted
// @author       duckyb
// @match        https://www.vinted.it/items/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vinted.it
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/duckyb/UserScripts/main/vinted__buybox.user.js
// @updateURL    https://raw.githubusercontent.com/duckyb/UserScripts/main/vinted__buybox.user.js
// ==/UserScript==

// --- Constants ---
const SIDEBAR_CONTAINER = '.item-page-sidebar-content';
const BUYBOX_CARD_STYLE = `
  .custom-buybox-card {
    margin-bottom: 16px;
  }
`;

(function () {
  'use strict';

  // Utility: wait for an element to appear in the DOM
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout waiting for ' + selector));
      }, timeout);
    });
  }

  // Function to create the buybox card element
  function createBuyboxCard({
    content = '<em>Qui ci sarà il metadata che ti interessa.</em>',
  } = {}) {
    const card = document.createElement('div');
    card.className =
      'web_ui__Card__card web_ui__Card__overflowAuto custom-buybox-card';
    card.style.cssText = BUYBOX_CARD_STYLE;
    card.innerHTML = `
      <div style="padding: 16px;">
        <div class="buybox-content">
          ${content}
        </div>
      </div>
    `;
    return card;
  }

  // Utility: parse euro price string (e.g. "26,94 €") to float
  function parseEuro(str) {
    if (!str) return 0;
    return parseFloat(
      str
        .replace(/\./g, '')
        .replace(/,/, '.')
        .replace(/[^\d.]/g, '')
    );
  }

  // Map Vinted-available country names (in Italian) to ISO country codes
  const COUNTRY_CODE = {
    Italia: 'it',
    Francia: 'fr',
    Germania: 'de',
    Spagna: 'es',
    'Paesi Bassi': 'nl',
    Belgio: 'be',
    Lituania: 'lt',
    Polonia: 'pl',
    'Repubblica Ceca': 'cz',
    Slovacchia: 'sk',
    Lussemburgo: 'lu',
    Portogallo: 'pt',
    Finlandia: 'fi',
    Estonia: 'ee',
    Austria: 'at',
    Ungheria: 'hu',
    Slovenia: 'si',
    Grecia: 'gr',
    'Regno Unito': 'gb',
    Irlanda: 'ie',
    Romania: 'ro',
    Croazia: 'hr',
    Lettonia: 'lv',
    Bulgaria: 'bg',
  };

  // Find the sidebar card container (parent of all sidebar cards)
  async function insertBuyboxCard() {
    // Traverse up to find the container holding multiple cards
    let containers = document.querySelectorAll(SIDEBAR_CONTAINER);
    if (!containers) return;
    containers.forEach((container) => {
      // Avoid duplicate insertion
      if (container.querySelector('.custom-buybox-card')) return;

      // --- Extract item price and shipping cost ---
      const basePriceEl = document
        .querySelector('[data-testid="item-sidebar-price-container"]')
        .querySelector('p.web_ui__Text__text');
      const priceEl = document
        .querySelector('[data-testid="item-sidebar-price-container"]')
        .querySelector('div.web_ui__Text__text');
      const shippingEl = document.querySelector(
        '[data-testid="item-shipping-banner"]'
      );
      // Extract the product title (currently selected element)
      const titleEl = document.querySelector(
        'h1.web_ui__Text__text.web_ui__Text__title.web_ui__Text__left'
      );
      const title = titleEl ? titleEl.textContent.trim() : '';
      const basePrice = basePriceEl ? parseEuro(basePriceEl.textContent) : 0;
      const price = priceEl ? parseEuro(priceEl.textContent) : 0;
      // Protezione acquisti = priceEl - basePriceEl
      const protection = price - basePrice;
      // Try to extract euro value from shipping banner
      let shipping = 0;
      if (shippingEl) {
        const match = shippingEl.textContent.match(/([\d,.]+)\s*€/);
        if (match) shipping = parseEuro(match[1]);
      }
      const total = price + shipping;
      // Format as euro strings
      const totalStr = total
        ? total.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
        : '-';
      const basePriceStr = basePrice
        ? basePrice.toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR',
          })
        : '-';
      const protectionStr = protection
        ? protection.toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR',
          })
        : '-';
      const shippingStr = shipping
        ? shipping.toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR',
          })
        : '-';

      // Extract the product description
      const descEl = document.querySelector('[itemprop="description"]');
      const description = descEl ? descEl.textContent.trim() : '';

      // Extract seller name and rating
      const sellerEl = document.querySelector(
        '[data-testid="profile-username"]'
      );
      let sellerName = '';
      let sellerRatingHTML = '';
      let sellerProfileHref = '';
      let sellerFlagImg = '';
      if (sellerEl) {
        sellerName = sellerEl.textContent.trim();
        sellerProfileHref =
          [...document.querySelectorAll('a[href*="/member/"]')]
            .map((a) => a.href.match(/\/member\/\d+/))
            .filter(Boolean)[0] || '';
        // Find the rating div inside the seller block or globally
        const ratingDiv = document.querySelector(
          'div.web_ui__Rating__rating.web_ui__Rating__small'
        );
        if (ratingDiv) {
          sellerRatingHTML = ratingDiv.outerHTML;
        }
        // Extract country from div[role=presentation]
        const countryDiv = sellerEl
          .closest('div.web_ui__Card__card')
          ?.querySelector('div.u-flexbox.u-align-items-baseline');
        if (countryDiv) {
          const countryMatch = countryDiv.textContent.match(
            /(, )?([A-Za-zÀ-ÿ\s]+)$/
          );
          console.log('countryMatch', countryMatch);
          if (countryMatch) {
            const country = countryMatch[1].trim();
            console.log('country', country);
            const code = COUNTRY_CODE[country];
            if (code) {
              sellerFlagImg = `<img src="https://flagcdn.com/w20/${code}.webp" width="20" style="vertical-align:middle">`;
            }
          }
        }
      }

      // Create our custom card with total, breakdown, divider, description, and action buttons
      const card = createBuyboxCard({
        content: `
          <h1 class="web_ui__Text__text web_ui__Text__title web_ui__Text__left" style="margin-bottom: 8px;">${title}</h1>
          <button id="custom-buybox-buy-btn" type="button" class="web_ui__Button__button web_ui__Button__filled web_ui__Button__default web_ui__Button__primary web_ui__Button__truncated" style="width:100%;margin:12px 0 0 0;">
            <span class="web_ui__Button__content"><span class="web_ui__Button__label">Acquista a ${totalStr}</span></span>
          </button>
          <div style="margin-top: 8px; font-size: 0.98em;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Prezzo base</span>
              <span class="web_ui__Text__text">${basePriceStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Protezione acquisti</span>
              <span class="web_ui__Text__text">${protectionStr}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Spedizione</span>
              <span class="web_ui__Text__text">da: ${shippingStr}</span>
            </div>
          </div>
          <div class="web_ui__Divider__divider" style="margin: 12px 0;"></div>
          <span class="web_ui__Text__text web_ui__Text__body web_ui__Text__left web_ui__Text__format"><span>${description}</span></span>
          <div class="web_ui__Divider__divider" style="margin: 16px 0 16px 0;"></div>
          <button id="custom-buybox-offer-btn" type="button" class="web_ui__Button__button web_ui__Button__outlined web_ui__Button__default web_ui__Button__primary web_ui__Button__truncated" style="width:100%;margin-bottom:8px;">
            <span class="web_ui__Button__content"><span class="web_ui__Button__label">Fai un'offerta</span></span>
          </button>
          <button id="custom-buybox-info-btn" type="button" class="web_ui__Button__button web_ui__Button__outlined web_ui__Button__default web_ui__Button__primary web_ui__Button__truncated" style="width:100%;">
            <span class="web_ui__Button__content"><span class="web_ui__Button__label">Chiedi info</span></span>
          </button>
          <div class="web_ui__Divider__divider" style="margin: 16px 0 8px 0;"></div>
          <a href="${sellerProfileHref}" class="web_ui__Cell__cell web_ui__Cell__default web_ui__Cell__navigating web_ui__Cell__with-chevron web_ui__Cell__link" style="width:100%;height:40px;gap:10px;">
            <span class="web_ui__Text__text web_ui__Text__body web_ui__Text__left">${sellerFlagImg}</span>
            <span class="web_ui__Text__text web_ui__Text__body web_ui__Text__left" style="flex:1;">${sellerName}</span>
            ${sellerRatingHTML}
          </a>
        `,
      });
      // Add click handler to simulate click on the real buy button
      const customBtn = card.querySelector('#custom-buybox-buy-btn');
      if (customBtn) {
        customBtn.addEventListener('click', () => {
          const realBtn = document.querySelector(
            '[data-testid="item-buy-button"]'
          );
          if (realBtn) realBtn.click();
        });
      }
      // Add click handler for offer button
      const offerBtn = card.querySelector('#custom-buybox-offer-btn');
      if (offerBtn) {
        offerBtn.addEventListener('click', () => {
          const realOfferBtn = document.querySelector(
            '[data-testid="item-buyer-offer-button"]'
          );
          if (realOfferBtn) realOfferBtn.click();
        });
      }
      // Add click handler for info button
      const infoBtn = card.querySelector('#custom-buybox-info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', () => {
          const realInfoBtn = document.querySelector(
            '[data-testid="ask-seller-button"]'
          );
          if (realInfoBtn) realInfoBtn.click();
        });
      }
      // Insert at the top
      container.insertBefore(card, container.firstChild);
      console.log('Buybox card inserted', {
        container,
        card,
        price,
        shipping,
        total,
      });

      // --- Add toggle switch inside the sidebar container, after the custom card ---
      let toggle = container.querySelector('#custom-buybox-toggle');
      if (!toggle) {
        toggle = document.createElement('label');
        toggle.id = 'custom-buybox-toggle';
        toggle.style.display = 'flex';
        toggle.style.alignItems = 'center';
        toggle.style.gap = '8px';
        toggle.style.margin = '16px 0 0 0';
        toggle.innerHTML = `
          <input type="checkbox" id="custom-buybox-toggle-checkbox" style="accent-color:#007782;width:18px;height:18px;">
          <span class="web_ui__Text__text web_ui__Text__body web_ui__Text__left">Mostra card originali</span>
        `;
        // Insert after the custom card
        if (card.nextSibling) {
          container.insertBefore(toggle, card.nextSibling);
        } else {
          container.appendChild(toggle);
        }
        // Add toggle logic with localStorage
        const checkbox = toggle.querySelector('input');
        // Initialize from localStorage
        const saved = localStorage.getItem('customBuyboxShowOriginalCards');
        const show = saved === null ? true : saved === 'true';
        checkbox.checked = show;
        container
          .querySelectorAll(
            '.web_ui__Card__card.web_ui__Card__overflowAuto:not(.custom-buybox-card)'
          )
          .forEach((card) => {
            card.style.display = show ? '' : 'none';
          });
        checkbox.addEventListener('change', (e) => {
          const show = checkbox.checked;
          localStorage.setItem('customBuyboxShowOriginalCards', show);
          container
            .querySelectorAll(
              '.web_ui__Card__card.web_ui__Card__overflowAuto:not(.custom-buybox-card)'
            )
            .forEach((card) => {
              card.style.display = show ? '' : 'none';
            });
        });
      }
    });
  }

  // Run on page load and on SPA navigation
  function run() {
    insertBuyboxCard();
    // Observe for SPA navigation/content changes
    const observer = new MutationObserver(() => {
      insertBuyboxCard();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Wait for sidebar to appear, then run
  waitForElement('.web_ui__Card__card.web_ui__Card__overflowAuto').then(run);
})();
