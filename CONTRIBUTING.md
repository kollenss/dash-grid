# Contributing to Dash Grid

Thanks for your interest! Contributions are welcome — bug fixes, new features, plugin cards, or documentation improvements.

## Getting started

```bash
git clone https://github.com/kollenss/dash-grid.git
cd dash-grid
npm install
npm run dev
```

See [README.md](README.md) for full setup instructions.

## How to contribute

1. **Open an issue first** for anything beyond a trivial fix — describe what you want to build or change
2. Fork the repo and create a branch: `git checkout -b my-feature`
3. Make your changes
4. Open a Pull Request against `main` with a clear description of what and why

## Plugin cards

Plugin cards live in a separate repo: [dash-grid-cards](https://github.com/kollenss/dash-grid-cards).
If you want to build a new card, that's the right place to start — see [CARD_DEVELOPMENT.md](CARD_DEVELOPMENT.md) for the full API.

## Code style

- TypeScript throughout — no `any` unless unavoidable
- No comments explaining *what* the code does, only *why* when it's non-obvious
- Keep PRs focused — one thing per PR

## Reporting bugs

Open a GitHub Issue with:
- What you did
- What you expected
- What actually happened
- Browser and OS
