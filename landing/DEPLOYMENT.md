# Landing Page Deployment Guide

## Quick Deploy Options (Pick One)

### Option 1: Netlify (Recommended) - 2 Minutes

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   cd landing
   netlify deploy --prod --dir=.
   ```

3. **Get your URL** (e.g., `rag-template-starter-abc123.netlify.app`)

4. **Custom domain** (optional):
   ```bash
   netlify deploy --prod --dir=. --site=your-custom-domain.com
   ```

### Option 2: Vercel - 2 Minutes

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd landing
   vercel --prod
   ```

3. **Follow prompts** to create account/link project

### Option 3: GitHub Pages - 5 Minutes

1. **Push landing folder to GitHub:**
   ```bash
   git add landing/
   git commit -m "Add landing page"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repo Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

3. **Your site:** `https://your-username.github.io/rag-template-starter`

### Option 4: Surge.sh - 1 Minute (No Account)

1. **Install Surge:**
   ```bash
   npm install -g surge
   ```

2. **Deploy:**
   ```bash
   cd landing
   surge
   # Enter email/password when prompted
   # Domain: rag-template-starter.surge.sh
   ```

---

## Formspree Email Capture Setup

### 1. Create Account (Free)
- Go to https://formspree.io
- Sign up with your email
- Verify email

### 2. Create Form
- Click "New Form"
- Name: "RAG Template Waitlist"
- You'll get a form endpoint like:
  ```
  https://formspree.io/f/xnqkvnzp
  ```

### 3. Update Landing Pages

Edit ALL `index.html`, `de.html`, `fr.html`, `nl.html`, `es.html`:

```html
<!-- Replace YOUR_FORM_ID with your actual ID -->
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

### 4. Test
- Open deployed site
- Enter test email
- Submit
- Check Formspree dashboard for submission

### 5. Configure Notifications
- Formspree → Your Form → Notifications
- Add your email
- Set up auto-responder (optional)

---

## Post-Deploy Checklist

- [ ] Site loads at custom URL
- [ ] Email signup works (test with your email)
- [ ] All 5 languages accessible (EN/DE/FR/NL/ES)
- [ ] Mobile responsive (test on phone)
- [ ] Google Analytics added (optional)

## Custom Domain Setup (Optional)

### Netlify Custom Domain:
1. Buy domain (Namecheap, Cloudflare)
2. Netlify Dashboard → Domain Settings
3. Add custom domain
4. Update DNS records

### Recommended Domains:
- ragtemplate.dev
- ragstarter.io
- documentai-kit.com

---

## Troubleshooting

### Form not working?
- Check Formspree dashboard for form ID
- Verify form action URL is correct
- Test with browser dev tools open

### Site not loading?
- Check deployment logs
- Verify all files uploaded
- Test with `curl -I your-site-url`

### Images/assets broken?
- Use relative paths: `./image.png` not `/image.png`
- Check case sensitivity (Linux servers are case-sensitive)

---

## Next Steps After Deploy

1. **Share URL** with 10 friends for feedback
2. **Post on Twitter** with screenshots
3. **Submit to BetaList** for early exposure
4. **Set up Google Analytics** for tracking
5. **Create Product Hunt teaser** 2 weeks before launch

**Goal: 50 email signups before building more features!**
