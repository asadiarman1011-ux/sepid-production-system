/**
 * چاپ تمیز یک نود از صفحه: داخل iframe مخفی با همان استایل‌های صفحه رندر می‌شود
 * تا خروجی چاپ دقیقا همان برگه خوشگل باشد — مستقل از تم/دارک‌مود و بقیه صفحه.
 */

/** استایل‌های لازم را از صفحه می‌گیریم تا iframe همان ظاهر را داشته باشد */
function collectStyles(): string {
  const out: string[] = [];
  for (const el of document.querySelectorAll('style, link[rel="stylesheet"]')) {
    out.push(el.outerHTML);
  }
  return out.join("\n");
}

/**
 * element را در iframe مخفی چاپ می‌کند.
 * لازم نیست عنصر داخل DOM باشد؛ هر HTMLElement (حتی از قالب react) پاس می‌شود.
 */
export function printElement(element: HTMLElement, docTitle = "فاکتور") {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "-9999px";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8" />
<title>${docTitle.replace(/[<>&"]/g, "")}</title>
${collectStyles()}
<style>
  @page { size: A4 portrait; margin: 10mm; }
  html, body { margin: 0; padding: 0; background: #ffffff !important; }
  body > * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .inv-page { width: 190mm !important; margin: 0 auto !important; box-shadow: none !important; border-radius: 0 !important; }
</style>
</head>
<body></body>
</html>`);
  doc.close();

  // منتظر می‌مانیم استایل‌ها (فونت گوگل) داخل iframe لود شوند
  const fontLink = doc.querySelector('link[rel="stylesheet"]');
  const ready: Promise<void> =
    fontLink && iframe.contentWindow
      ? new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          fontLink.addEventListener("load", finish);
          setTimeout(finish, 1200); // سقف انتظار فونت
        })
      : Promise.resolve();

  ready.then(() => {
    const win = iframe.contentWindow;
    if (!win) return;
    // کلون کردن نود داخل iframe — استایل‌های کلاس‌محور از همان CSS لودشده اعمال می‌شود
    const clone = doc.importNode(element, true) as HTMLElement;
    clone.removeAttribute("id");
    doc.body.appendChild(clone);

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 300);
    };

    win.focus();
    if (win.matchMedia("print").matches === false) {
      // برخی مرورگرها قبل از چاپ به reflow نیاز دارند
      void doc.body.offsetHeight;
    }
    win.print();
    cleanup();
  });
}
