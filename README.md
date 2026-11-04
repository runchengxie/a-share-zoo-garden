# A-share Zoo and Plant Garden

[简体中文](README.zh-CN.md)

Find animal and plant terms in Chinese stock names and see how portfolios built with fixed rules perform over time.

[Open the website](https://a-share-zoo-garden.pages.dev/) · [Alternative website](https://runchengxie.github.io/a-share-zoo-garden/)

## What to look at first

The website shows each garden’s performance, current stocks, and portfolio changes. Strict portfolios use terms with clearer meanings, while extended portfolios include a wider range. You can switch the website between English and Chinese.

Both gardens are compared with a CSI 300 ETF. All start at a value of 1 at the close of January 4, 2021, with returns calculated from the next trading day. Results before the known rule versions replay rules compiled later. They do not show what could have been achieved with information available at the time.

This is a research project for curiosity and exploration, not investment advice. An animal or plant term in a company’s name does not imply that its business involves that theme.

## Learn about the rules or run it yourself

- [Selection rules and calculation methods](docs/methodology.md)
- [Setup, commands, and development checks](docs/development.md)
- [Data, deployment, and program structure](docs/architecture.md)
- [Market association observations (Chinese)](docs/market-associations.zh-CN.md)

Word lists, historical rule versions, and backtest settings live in [configs](configs/). Published data lives in `published/`, with separate outputs for the animal and plant gardens.
