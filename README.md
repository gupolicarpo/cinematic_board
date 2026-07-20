# Cinematic Board

## Setup

```bash
# 1. install
npm install

# 2. configure keys
cp .env.example .env
# edit .env and fill in your keys

# 3. terminal 1 — API proxy
node server.js

# 4. terminal 2 — app
npm start
# opens at http://localhost:3000
```

## .env

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza-...
SEEDANCE_API_KEY=...
```

Only set the keys for providers you want to use.

Seedance uses BytePlus ModelArk by default. If your access uses a custom endpoint or model ID, also set `SEEDANCE_API_BASE_URL` and `SEEDANCE_MODEL_ID` in Railway.

## Shot generation models

Select in top bar: Claude Sonnet 4.6 · GPT-5.4 · GPT-5.4 mini · GPT-5.4 nano

## Canvas controls

- **Pan** — Alt + drag, or middle mouse
- **Zoom** — scroll wheel
- **Move nodes** — drag node body
- **Link scene → shot** — drag the colored port on the right edge of a Scene Node onto a Shot Node
- **Unlink** — click ✕ on the link pill in the Shot Node header
