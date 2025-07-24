// ==UserScript==
// @name        Vinted Real Titles
// @namespace   Violentmonkey Scripts
// @match       https://www.vinted.it/catalog*
// @grant       none
// @version     1.0
// @author      -
// @description Add a real title to the product details page on Vinted
// @downloadURL  https://raw.githubusercontent.com/duckyb/UserScripts/main/vinted__real-titles.user.js
// @updateURL    https://raw.githubusercontent.com/duckyb/UserScripts/main/vinted__real-titles.user.js
// ==/UserScript==

const BOX_CONTAINER = '.new-item-box__container';
const DISPLAYED_TITLE = '.new-item-box__description > .web_ui__Text__text';
const ACTUAL_TITLE = '.new-item-box__overlay';
const HIJACK_CLASS = 'hijacked';

function updateTitle() {
  const boxContainers = document.querySelectorAll(BOX_CONTAINER);
  boxContainers.forEach((box) => {
    const displayedTitle = box.querySelector(DISPLAYED_TITLE);
    // Remove truncated class if present
    if (displayedTitle.classList.contains('web_ui__Text__truncated')) {
      displayedTitle.classList.remove('web_ui__Text__truncated');
    }
    const actualTitleLong = box
      .querySelector(ACTUAL_TITLE)
      ?.getAttribute('title');
    // Extract only the real title before "Condizioni:"
    const actualTitle = actualTitleLong
      ? actualTitleLong.match(/^(.*?)\s*, condizioni:/i)?.[1].trim() ||
        actualTitleLong.trim()
      : '';
    if (
      displayedTitle.textContent !== actualTitle &&
      !displayedTitle.classList.contains(HIJACK_CLASS)
    ) {
      const styledElement = box.querySelector(DISPLAYED_TITLE);
      styledElement.classList.add(HIJACK_CLASS);
      const realTitle = document.createElement('p');
      realTitle.setAttribute(
        'class',
        'web_ui__Text__text web_ui__Text__caption web_ui__Text__left hijacked'
      );
      realTitle.setAttribute(
        'style',
        'text-decoration-line: underline!important; text-decoration-color: tomato!important; text-decoration-style: dotted!important; white-space: wrap!important;'
      );
      realTitle.innerHTML = `✍️ ${actualTitle}`;
      styledElement.innerHTML = '';
      styledElement.appendChild(realTitle);
    }
  });
}

(function () {
  'use strict';

  // Inject CSS to override white-space: nowrap
  const style = document.createElement('style');
  style.innerHTML = `
    .new-item-box__description {
      white-space: normal !important;
    }
  `;
  document.head.appendChild(style);

  // Initial run
  updateTitle();

  // Use MutationObserver for dynamic content
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.addedNodes.length > 0) {
        updateTitle();
        break; // Only need to update once per batch
      }
    }
  });

  // Observe the main container (adjust selector if needed)
  const mainContainer = document.querySelector('main') || document.body;
  observer.observe(mainContainer, { childList: true, subtree: true });
})();
