import assert from 'assert';

export async function getComputed(page, selector, propNames = []) {
  return await page.evaluate((sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const style = window.getComputedStyle(el);
    const result = {};
    for (const p of props) {
      result[p] = style.getPropertyValue(p) || style[p];
    }
    return result;
  }, selector, propNames);
}

export async function getBoundingBox(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      offsetHeight: el.offsetHeight,
      offsetWidth: el.offsetWidth
    };
  }, selector);
}

export async function elementExists(page, selector) {
  return await page.evaluate((sel) => {
    return document.querySelector(sel) !== null;
  }, selector);
}

export async function countElements(page, selector) {
  return await page.evaluate((sel) => {
    return document.querySelectorAll(sel).length;
  }, selector);
}

export async function getElementText(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.innerText.trim() : null;
  }, selector);
}

export async function getAllElementTexts(page, selector) {
  return await page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel)).map(el => el.innerText.trim());
  }, selector);
}

export function assertWithinTolerance(actual, expected, tolerance = 1.0, msg = '') {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`${msg ? msg + ': ' : ''}Expected ${expected} ±${tolerance}px, got ${actual}px (diff: ${diff.toFixed(2)}px)`);
  }
}

export function assertStyle(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ': ' : ''}Expected style "${expected}", got "${actual}"`);
  }
}

export function assertColor(actual, expectedHexOrRgb, msg = '') {
  if (actual.toLowerCase() !== expectedHexOrRgb.toLowerCase()) {
    throw new Error(`${msg ? msg + ': ' : ''}Expected color "${expectedHexOrRgb}", got "${actual}"`);
  }
}
