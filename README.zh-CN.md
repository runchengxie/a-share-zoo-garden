# A 股动物园与植物园

把股票名字里的动物和植物找出来，看看按固定规则组成的组合，长期表现会怎样。

[打开网站](https://a-share-zoo-garden.pages.dev/) · [备用网站](https://runchengxie.github.io/a-share-zoo-garden/)

## 先看什么

打开网站后，可以查看动物园和植物园的走势、当前包含哪些股票，以及每次调整的记录。严格组合采用含义比较明确的词，扩展组合收录范围更宽。网页可以切换中文和英文。

两套组合都与沪深300 ETF 比较，从 2021 年 1 月 4 日收盘净值 1 开始，下一交易日起计算收益。早于已知词表版本的历史结果，是用后来整理的规则回放得到的，不能当作当时就能实现的成绩。

这是一项有趣的研究，不构成投资建议。名字里有动物或植物，也不代表公司从事相关业务。

## 想了解规则或自己运行

- [收录规则和计算方法](docs/methodology.zh-CN.md)
- [安装、运行和开发检查](docs/development.zh-CN.md)
- [数据、部署和程序结构](docs/architecture.zh-CN.md)
- [市场联想观察池](docs/market-associations.zh-CN.md)

词表、历史版本和回测设置统一放在 [configs](configs/) 中。已发布数据放在 `published/`，动物园和植物园各自保存，不能混用。

开发者也可阅读 [English development guide](docs/development.md)。
