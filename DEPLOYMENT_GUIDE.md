# Deployment Guide - Wing Shack Arcade

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `wing-shack-arcade` (or your preferred name)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Copy the repository URL (e.g., `https://github.com/yourusername/wing-shack-arcade.git`)

## Step 2: Connect Local Repository to GitHub

Run these commands (replace with your actual GitHub URL):

```bash
git remote add origin https://github.com/yourusername/wing-shack-arcade.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"
6. Your site will be live in ~2 minutes!

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

Follow the prompts to deploy.

## Important Notes

- ✅ The project is already configured for Vercel (Next.js auto-detection)
- ✅ All dependencies are in `package.json`
- ✅ Build script is configured: `npm run build`
- ✅ `.gitignore` excludes `node_modules` and build files
- ✅ Public assets (images, audio, fonts) are included

## After Deployment

Your site will be available at: `https://your-project-name.vercel.app`

You can also add a custom domain in Vercel settings.


