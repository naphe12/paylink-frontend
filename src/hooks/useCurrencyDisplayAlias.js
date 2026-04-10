import { useEffect } from "react";

const EUR_TOKEN_REGEX = /\bEUR\b/g;

function shouldSkipNode(node) {
  if (!node || !node.parentElement) return true;
  const parent = node.parentElement;
  const tag = String(parent.tagName || "").toUpperCase();
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return true;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "OPTION") return true;
  if (parent.isContentEditable) return true;
  return false;
}

function replaceEurInTextNode(node) {
  if (shouldSkipNode(node)) return;
  const value = String(node.nodeValue || "");
  if (!value || !EUR_TOKEN_REGEX.test(value)) return;
  node.nodeValue = value.replace(EUR_TOKEN_REGEX, "€");
}

function transformSubtree(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    replaceEurInTextNode(walker.currentNode);
  }
}

export default function useCurrencyDisplayAlias() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    transformSubtree(document.body);

    let scheduled = false;
    const observer = new MutationObserver((mutations) => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        for (const mutation of mutations) {
          if (mutation.type === "characterData") {
            replaceEurInTextNode(mutation.target);
            continue;
          }
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                replaceEurInTextNode(node);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                transformSubtree(node);
              }
            });
          }
        }
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);
}
