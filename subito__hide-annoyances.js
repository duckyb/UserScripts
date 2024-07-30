// ==UserScript==
// @name         Subito.it improvements
// @namespace    http://subito.it/
// @version      2024-07-30
// @description  try to take over the world!
// @author       Kyek
// @match        https://www.subito.it/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=subito.it
// @grant        none
// ==/UserScript==

const AD_WRAPPER = '[id^="ad_wrapper_"]';
const PAGINATION = '[class^="ItemListContainer_container__"]';
const SNACKBAR = '[class^="styles_snackbar-wrapper__"]';
const CARD = '[class^="SmallCard-module_card__"]';
const SOLD_BADGE = '.item-sold-badge';

function hideAdWrappers() {
  const adWrappers = document.querySelectorAll(AD_WRAPPER);
  adWrappers.forEach((wrapper) => {
    wrapper.remove();
  });
}

function hideSnackBar() {
  const snackBar = document.querySelector(SNACKBAR);
  if (!snackBar) return;
  snackBar.setAttribute('style', 'display: none !important');
}

function hideSoldItems() {
  const cards = document.querySelectorAll(CARD);
  if (!cards) return;
  cards.forEach((card) => {
    const soldBadge = card.querySelector(SOLD_BADGE);
    if (!soldBadge) return;
    card.setAttribute('style', 'display: none !important');
  });
}

function hideAnnoyances() {
  hideAdWrappers();
  hideSnackBar();
  hideSoldItems();
}

(function () {
  'use strict';

  setInterval(() => {
    hideAnnoyances();
  }, 150);
})();
