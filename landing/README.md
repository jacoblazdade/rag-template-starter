# Landing Page Deployment

The landing page is a static HTML file designed for validation and email collection.

## Local Testing

```bash
# Serve locally with Python
cd landing
python3 -m http.server 8080

# Or with Node.js
npx serve .
```

Then open http://localhost:8080

## Deployment Options

### Option 1: Vercel (Recommended - Free)

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to landing folder: `cd landing`
3. Deploy: `vercel`
4. Follow prompts to connect your GitHub account

### Option 2: Netlify Drop

1. Go to https://app.netlify.com/drop
2. Drag and drop the `landing` folder
3. Done! You'll get a URL like `https://random-name.netlify.app`

### Option 3: GitHub Pages

1. Create a new branch: `git checkout -b gh-pages`
2. Move `landing/index.html` to root: `mv landing/index.html .`
3. Push: `git push origin gh-pages`
4. Enable GitHub Pages in repo settings
5. URL: `https://your-username.github.io/rag-template-starter`

### Option 4: Azure Static Web Apps

```bash
# Install Azure CLI
az login

# Create static web app
az staticwebapp create \
  --name rag-template-landing \
  --resource-group your-rg \
  --source landing \
  --location "West Europe" \
  --branch main
```

## Email Collection Setup

Replace the Formspree form action in `index.html`:

```html
<form class="signup-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

### Get Formspree ID

1. Go to https://formspree.io
2. Sign up for free (50 submissions/month)
3. Create a new form
4. Copy your form endpoint URL
5. Replace `YOUR_FORM_ID` in index.html

### Alternatives to Formspree

- **EmailOctopus**: Free tier with 2,500 subscribers
- **Mailchimp**: Free tier with 500 subscribers
- **ConvertKit**: Free for up to 1,000 subscribers
- **Custom backend**: Build your own with Azure Functions

## Analytics (Optional)

Add to `<head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

Or use privacy-focused alternatives:
- Plausible Analytics
- Fathom Analytics
- Simple Analytics

## Custom Domain

After deploying, add a custom domain:

1. Buy domain (Namecheap, Cloudflare, etc.)
2. Add CNAME record pointing to your deployment
3. Configure SSL (usually automatic)

Example: `ragtemplate.dev` → points to Vercel/Netlify deployment

## Goal

Target: **50 email signups** before building full product

This validates market demand before investing more time in development.
