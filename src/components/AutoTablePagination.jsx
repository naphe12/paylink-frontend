import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZES = [10, 25, 50, 100];

function collectionItems(collection) {
  if (collection.tagName === "TABLE") {
    return Array.from(collection.tBodies || []).flatMap((body) => Array.from(body.rows || []));
  }
  return Array.from(collection.children).filter(
    (child) => child.tagName === "LI" || child.getAttribute("role") === "listitem"
  );
}

function observedContainers(collection) {
  return collection.tagName === "TABLE" ? Array.from(collection.tBodies || []) : [collection];
}

function buildButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40";
  button.addEventListener("click", onClick);
  return button;
}

/**
 * Adds consistent client-side pagination to every data table and semantic list.
 * Collections that already fetch one server-side page (25 items or fewer) are untouched.
 * Set data-no-auto-pagination on a collection to opt out explicitly.
 */
export default function AutoTablePagination() {
  const location = useLocation();

  useEffect(() => {
    const cleanups = [];
    let scheduled = false;

    const enhance = (collection) => {
      if (
        collection.dataset.noAutoPagination !== undefined ||
        collection.dataset.autoPagination === "true"
      ) return;

      const items = collectionItems(collection);
      if (items.length <= DEFAULT_PAGE_SIZE) return;

      collection.dataset.autoPagination = "true";
      let page = 1;
      let pageSize = DEFAULT_PAGE_SIZE;

      const controls = document.createElement("nav");
      controls.setAttribute("aria-label", "Pagination du tableau");
      controls.className = "mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600";

      const summary = document.createElement("span");
      summary.setAttribute("aria-live", "polite");

      const actions = document.createElement("div");
      actions.className = "flex items-center gap-2";
      const previous = buildButton("Précédent", () => {
        page = Math.max(1, page - 1);
        render();
      });
      const next = buildButton("Suivant", () => {
        page += 1;
        render();
      });
      const size = document.createElement("select");
      size.setAttribute("aria-label", "Lignes par page");
      size.className = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700";
      PAGE_SIZES.forEach((value) => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = `${value} / page`;
        option.selected = value === pageSize;
        size.appendChild(option);
      });
      size.addEventListener("change", () => {
        pageSize = Number(size.value) || DEFAULT_PAGE_SIZE;
        page = 1;
        render();
      });

      actions.append(size, previous, next);
      controls.append(summary, actions);
      collection.insertAdjacentElement("afterend", controls);

      const render = () => {
        const currentItems = collectionItems(collection);
        const total = currentItems.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        page = Math.min(page, totalPages);
        const start = (page - 1) * pageSize;
        const end = Math.min(start + pageSize, total);

        currentItems.forEach((item, index) => {
          item.hidden = index < start || index >= end;
        });
        summary.textContent = `${total === 0 ? 0 : start + 1}-${end} sur ${total} lignes · Page ${page}/${totalPages}`;
        previous.disabled = page === 1;
        next.disabled = page === totalPages;
      };

      render();
      const bodyObserver = new MutationObserver(render);
      observedContainers(collection).forEach((container) => bodyObserver.observe(container, { childList: true }));

      cleanups.push(() => {
        bodyObserver.disconnect();
        collectionItems(collection).forEach((item) => {
          item.hidden = false;
        });
        controls.remove();
        delete collection.dataset.autoPagination;
      });
    };

    const scan = () => {
      scheduled = false;
      document
        .querySelectorAll(
          "main table, [role='main'] table, main ul:not([role]), main ol:not([role]), main [role='list'], [role='main'] ul:not([role]), [role='main'] ol:not([role]), [role='main'] [role='list']"
        )
        .forEach(enhance);
    };
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(scan);
    });

    scan();
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [location.pathname, location.search]);

  return null;
}
