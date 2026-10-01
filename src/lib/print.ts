/**
 * چاپ تمیز یک نود از صفحه: داخل iframe مخفی با همان استایل‌های صفحه رندر می‌شود
 * تا خروجی چاپ دقیقا همان برگه خوشگل باشد — مستقل از تم/دارک‌مود و بقیه صفحه.
 *
 * نکته مهم ۱ (باگ چاپ بعد از پابلیش): در نسخه پروداکشن، CSS به‌صورت یک فایل جدا
 * (`<link rel="stylesheet">`) لود می‌شود؛ اگر همان تگ را داخل iframe کپی کنیم،
 * چاپ قبل از رسیدن فایل CSS اجرا می‌شود و برگه «بی‌استایل» چاپ می‌شود
 * (لوگوی غول‌آسا، جدول و سربرگ بی‌رنگ). پس متن CSS را از CSSOM
 * (قوانین پارس‌شده) می‌خوانیم و به‌صورت <style> داخل iframe می‌نویسیم؛
 * این‌طوری بدون هیچ انتظار شبکه‌ای، استایل‌ها از همان لحظه آماده‌اند.
 *
 * نکته مهم ۲: استایل‌های صفحه شامل قانون چاپ «body * { visibility: hidden }» است؛
 * داخل iframe این قانون را خنثی می‌کنیم وگرنه برگه خالی چاپ می‌شود!
 */

/** متن قوانین یک استایل‌شیت؛ اگر cross-origin باشد null برمی‌گرداند */
function sheetCssText(sheet: CSSStyleSheet): string | null {
  try {
    const rules = sheet.cssRules;
    let out = "";
    for (let i = 0; i < rules.length; i++) {
      out += `${rules[i].cssText}\n`;
    }
    return out;
  } catch {
    return null; // شیت cross-origin (مثل فونت گوگل) قابل خواندن نیست
  }
}

/** استایل‌های لازم را از صفحه می‌گیریم تا iframe همان ظاهر را داشته باشد */
function collectStyles(): string {
  const out: string[] = [];

  // ۱) تگ‌های <style> صفحه (نسخه dev / استایل‌های inline) — عینا کپی
  document.querySelectorAll("style").forEach((el) => {
    out.push(el.outerHTML);
  });

  // ۲) فایل‌های CSS لینک‌شده: متن قوانین پارس‌شده را inline می‌کنیم
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    .forEach((link) => {
      const css = link.sheet ? sheetCssText(link.sheet) : null;
      if (css && css.trim()) out.push(`<style>${css}</style>`);
      else out.push(link.outerHTML); // cross-origin → با همان لینک لود شود
    });

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
    overflow: visible !important; /* جدول طولانی در چند صفحه ادامه یابد، نه این که بریده شود */
  }
</style>
</head>
<body></body>
</html>`);
  doc.close();

  const win = iframe.contentWindow;

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 500);
  };

  /** افزودن نسخه کپی‌شده و چاپ */
  const renderAndPrint = () => {
    try {
      const clone = doc.importNode(element, true) as HTMLElement;
      clone.removeAttribute("id");
      doc.body.appendChild(clone);
      // اجازه رفرش-لایوت قبل از چاپ
      void doc.body.offsetHeight;

      const finish = () => {
        win.requestAnimationFrame(() => {
          win.focus();
          win.print();
          cleanup();
        });
      };

      // فونت‌ها تازه بعد از افزودن محتوا لود می‌شوند؛ با سقف زمانی کوتاه صبر می‌کنیم
      const fonts = win.document.fonts?.ready as unknown as Promise<void> | undefined;
      if (fonts) {
        let settled = false;
        const go = () => {
          if (settled) return;
          settled = true;
          finish();
        };
        fonts.then(go, go);
        setTimeout(go, 900);
      } else {
        finish();
      }
    } catch {
      iframe.remove();
      window.print();
    }
  };

  // فقط لینک‌های CSS باقی‌مانده (مثل فونت گوگل) را با سقف زمانی کوتاه منتظر می‌مانیم
  const links = Array.from(
    doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );
  const linksReady = Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.sheet) return resolve();
          link.addEventListener("load", () => resolve());
          link.addEventListener("error", () => resolve());
          setTimeout(resolve, 1200);
        }),
    ),
  );

  Promise.race([
    linksReady,
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]).then(renderAndPrint);
}
