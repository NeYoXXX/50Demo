官网文档
Option(https://prettier.io/docs/en/options.html)
配置文件
.prettierrc.js
命令行格式化
格式化后覆盖
prettier --write .|path
检查格式化
prettier --check .|path

忽略文件
.prettierignore
忽略代码行
js
`// prettier-ignore`
html
`<!-- prettier-ignore -->`
`<!-- prettier-ignore-attribute -->`
`<!-- prettier-ignore-attribute (mouseup) -->`
css
`/* prettier-ignore */`
markdown
`<!-- prettier-ignore -->`
否定命令
`prettier --write . '!**/*.{js,jsx,vue}'`

# 集成linter
## eslint-config-prettier 
关闭eslint所有不必要的或可能与Prettier冲突的规则。这使您可以使用自己喜欢的可共享配置，而不会在使用 Prettier 时妨碍其风格选择。请注意，此配置仅关闭规则，因此只有将其与其他配置一起使用才有意义。
link(https://github.com/prettier/eslint-config-prettier#arrow-body-style-and-prefer-arrow-callback)

## eslint-plugin-prettier
将 Prettier 作为 ESLint 规则运行，并将差异报告为单个 ESLint 问题。

## prettier-eslint
问题：通过prettier格式化后与eslint冲突。
解决：prettier格式化后，在将其结果运行eslint --fix。过程code->prettier->eslint --fix->formatted code