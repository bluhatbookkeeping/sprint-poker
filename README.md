# 🃏 Sprint Poker

A fun, casino-themed planning poker app built for agile scrum teams.

## Features

- 🎰 Casino / poker night aesthetic with felt green table
- 👨👩 Emoji avatars seated around an oval table
- 🧠 Browser remembers returning players (no login needed)
- 🃏 Fibonacci voting (1, 2, 3, 5, 8, 13, 21, ?)
- 🔍 Dramatic card flip reveal with spread analysis
- 📊 Sprint history saved across sessions
- 👑 Facilitator mode to control deal, reveal, and final points

## How To Use

1. Everyone navigates to the app URL
2. Enter your name and pick an avatar — the browser will remember you next time
3. The facilitator toggles **👑 Facilitator** mode in the top right
4. When ready to vote on a story, facilitator hits **🎲 DEAL**
5. Everyone picks their card secretly from the Fibonacci row
6. Facilitator hits **🔍 REVEAL** once all votes are in
7. Discuss, then facilitator locks in the final point value
8. Repeat for each story
9. Hit **🏁 End Session & Save** when refinement is done

## Deploy to Vercel (Free)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **Add New Project** → import your repo
4. Click **Deploy** — no config needed
5. Share the URL with your team

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [React 18](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript
- localStorage for persistence (no database needed)
