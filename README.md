# GitHub Proxy Worker

یک **Cloudflare Worker** قدرتمند و سبک برای پروکسی امن و سریع محتوای GitHub:

- فایل‌های خام (Raw) از `raw.githubusercontent.com`
- صفحات GitHub پروژه‌ای (Project Pages: `owner.github.io/repo`)
- صفحات GitHub کاربری/سازمانی (User/Organization Pages: `username.github.io`)

با پشتیبانی کامل از **CORS**، **کشینگ هوشمند**، **User-Agent سفارشی** برای جلوگیری از محدودیت نرخ درخواست‌ها (rate-limit)، و مدیریت دقیق trailing slash برای بارگیری صحیح `index.html`.

---

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare-workers&logoColor=white)
![CORS Enabled](https://img.shields.io/badge/CORS-Enabled-brightgreen)
![Cache](https://img.shields.io/badge/Cache-1h-orange)
![GitHub Proxy](https://img.shields.io/badge/Type-GitHub%20Proxy-blue)
![License](https://img.shields.io/github/license/argh94/github-proxy-worker?color=informational)

---

## ویژگی‌ها

- **پروکسی برای Raw Files**: دسترسی به فایل‌های خام GitHub بدون محدودیت CORS.
- **پ��وکسی برای GitHub Pages**:
  - پشتیبانی کامل از Project Pages (با ساختار owner + repo).
  - پشتیبانی کامل از User/Organization Pages (ساختار username).
- **مدیریت هوشمند URL**:
  - اضافه کردن خودکار `/` در انتهای مسیر root برای بارگیری صحیح `index.html`.
  - حفظ ساختار زیردامنه‌ها و فایل‌های استاتیک (CSS, JS, تصاویر و ...).
- **کشینگ هوشمند**: ذخیره پاسخ‌های 200 و 404 برای مدت ۱ ساعت.
- **پشتیبانی از CORS کامل**: `Access-Control-Allow-Origin: *`.
- **امنیت بالا**: اعتبارسنجی مسیرهای owner/repo/branch.
- **استفاده از User-Agent سفارشی**: کاهش احتمال بلاک شدن درخواست‌ها توسط GitHub.
- **مدیریت Content-Type برای HTML**: تنظیم صحیح نوع محتوا.

---

## نحوه استقرار (Deployment)

### روش ۱: سریع با Cloudflare Dashboard (توصیه‌شده)

1. به [Cloudflare Dashboard](https://dash.cloudflare.com) مراجعه کنید.
2. مسیر: **Workers & Pages** → **Overview** → **Create application** → **Workers** → **Create Worker**.
3. یک نام انتخاب کنید (مثلاً `github-proxy`).
4. کد Worker را که در ادامه آورده شده جایگزین کد پیش‌فرض کنید.
5. تنظیمات را **Save and Deploy** کنید.

### روش ۲: با استفاده از Wrangler (CLI)

```bash
npm create cloudflare@latest github-proxy
cd github-proxy
# کد موجود در src/index.js را جایگزین کنید
wrangler deploy
```

### روش ۳: استفاده از Deploy Button

اگر این پروژه را عمومی روی GitHub قرار داده‌اید، می‌توانید دکمه زیر را قرار دهید:
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/)

---

## کد Worker

```javascript
export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    const url = new URL(request.url);
    let path = url.pathname.replace(/^\/+/, "");

    if (!path) {
      return new Response(
        "Usage:\n" +
        "/raw/owner/repo/branch[/filepath] → raw files\n" +
        "/pages/owner/repo[/subpath] → Project Pages\n" +
        "/gh-pages/owner/repo[/subpath] → همان Project Pages\n" +
        "/io/username[/subpath] → User/Organization Pages\n",
        { 
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }
      );
    }

    ...
  }
};
```

---

## مثال‌های استفاده

فرض کنید Worker شما روی دامنه `https://github-proxy.yourname.workers.dev` مستقر شده است. موارد زیر نمونه‌هایی از استفاده هستند:

| نوع محتوا               | آدرس پروکسی                                                            | آدرس اصلی GitHub                                                | توضیحات                |
|--------------------------|------------------------------------------------------------------------|------------------------------------------------------------------|------------------------|
| **User Pages (root)**    | `https://github-proxy.yourname.workers.dev/io/argh94`                 | `https://argh94.github.io/`                                     | صفحه اصلی کاربر        |
| **User Pages (subpath)** | `https://github-proxy.yourname.workers.dev/io/argh94/about`           | `https://argh94.github.io/about`                               | زیرمسیر               |
| **Project Pages (root)** | `https://github-proxy.yourname.workers.dev/pages/argh94/GitHub-Backup-Tool/` | `https://argh94.github.io/GitHub-Backup-Tool/`                 | ابزار بکاپ پروژه       |
| **Project Pages (file)** | `https://github-proxy.yourname.workers.dev/pages/argh94/GitHub-Backup-Tool/index.html` | `https://argh94.github.io/GitHub-Backup-Tool/index.html`        | فایل مشخص پروژه        |
| **Raw file**             | `https://github-proxy.yourname.workers.dev/raw/argh94/GitHub-Backup-Tool/main/index.html` | `https://raw.githubusercontent.com/argh94/GitHub-Backup-Tool/main/index.html` | فایل خام GitHub       |

**نکته:** برای روت صفحات، قرار دادن `/` در انتها مورد نیاز نیست؛ Worker خودش آن را مدیریت می‌کند.

---

## محدودیت‌ها

- **پشتیبانی فقط از محتوای عمومی GitHub**.
- **محدودیت Cloudflare Workers:** فایل‌های بزرگ‌تر از ۱۰۰ مگابایت ممکن است بارگیری نشوند.
- در صورت بروز rate-limit شدید از طرف GitHub، ممکن است نیاز به تنظیمات پیشرفته‌تر باشد.

---

## لایسنس

این پروژه تحت **MIT License** است — آزاد برای استفاده، تغییر و توزیع.

❤️ اگر این پروژه را روی GitHub قرار دادید، لطفاً به آن ستاره بدهید!  
❓ اگر سوالی، درخواست یا پیشنهادی دارید، می‌توانید [issue باز کنید](https://github.com/argh94/github-proxy-worker/issues) یا به من پیام بدهید.
