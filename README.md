# Wyze ECE AI Simulator - Render Backend Deployment Guide

This backend script orchestrates continuous simulated customer conversations on Render (`https://my-ai-backend-i1n0.onrender.com`).

## 1. Quick Deploy to Render

1. Create a GitHub repo with the files inside `/render-backend/`:
   - `server.js`
   - `package.json`
2. In your Render Dashboard:
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. In **Environment Variables** on Render:
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API key)*
   - `PORT`: `10000` (Render sets this automatically)
4. Click **Deploy Web Service**.

## 2. Real-Time Logging Verification
Once running, every single agent message and conversation turn will print in your Render Web Service live logs with:
```
[2026-10-27T...] [RENDER INCOMING] POST /api/chat
[2026-10-27T...] [PAYLOAD PREVIEW] Turn: 2 Customer: Marcus Vance
[RENDER AI SUCCESS] Gemini generated response: "Yes, my name is Marcus Vance..."
```
