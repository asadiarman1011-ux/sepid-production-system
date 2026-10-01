/**
 * چاپ تمیز یک نود از صفحه: داخل iframe مخفی با همان استایل‌های صفحه رندر می‌شود
 * تا خروجی چاپ دقیقا همان برگه خوشگل باشد — مستقل از تم/دارک‌مود و بقیه صفحه.
 *
 * نکته مهم: استایل‌های صفحه اصلی شامل قانون چاپ «body * { visibility: hidden }» است؛
 * داخل iframe این قانون را خنثی می‌کنیم وگرنه برگه خالی چاپ می‌شود!
 */

/** استایل‌های لازم را از صفحه می‌گیریم تا iframe همان ظاهر را داشته باشد */
function collectStyles(): string {
  const out: string[] = [];
  for (const el of document.querySelectorAll('style, link[rel="stylesheet"]')) {
    out.push(el.outerHTML);
  }
  return out.join("\n");
}

/** عنصر را داخل iframe مخفی رندر و همان iframe را چاپ می‌کند */
export function printElement(element: HTMLElement, docTitle = "فاکتور") {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px"; // عرض A4 در 96dpi
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc || !iframe.contentWindow) {
    iframe.remove();
    window.print(); // fallback
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
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  /* خنثی‌کردن قانون چاپ صفحه اصلی (body * { visibility: hidden }) */
  @media print {
    body, body * { visibility: visible !important; }
  }
  .inv-page {
    width: 190mm !important;
    margin: 0 auto !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
</style>
</head>
<body></body>
</html>`);
  doc.close();

  const win = iframe.contentWindow;

  // منتظر استایل‌ها و فونت‌ها می‌مانیم (با سقف زمانی) تا چاپ ناقص نشود
  const fontLink = doc.querySelector('link[rel="stylesheet"]');
  const linkReady: Promise<void> = fontLink
    ? new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };
        fontLink.addEventListener("load", finish);
        fontLink.addEventListener("error", finish);
        setTimeout(finish, 1500);
      })
    : Promise.resolve();

  const fontsReady: Promise<void> = (
    win.document.fonts?.ready as unknown as Promise<void>
  ) ?? Promise.resolve();

  Promise.race([Promise.all([linkReady, fontsReady]), new Promise((r) => setTimeout(r, 2000))]).then(
    () => {
      try {
        const clone = doc.importNode(element, true) as HTMLElement;
        clone.removeAttribute("id");
        doc.body.appendChild(clone);
        // اجازه رفرش-لایوت قبل از چاپ
        void doc.body.offsetHeight;

        const cleanup = () => {
          setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 500);
        };

        // بعضی مرورگرها یک فریم برای رندر نهایی لازم دارند
        win.requestAnimationFrame(() => {
          win.focus();
          win.print();
          cleanup();
        });
      } catch {
        iframe.remove();
        window.print();
      }
    },
  );
}
