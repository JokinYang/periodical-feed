# 外刊助手

该工具与[Shortcuts](https://en.wikipedia.org/wiki/Shortcuts_(app))配合可实现，自动下载外刊(The Economist/New
Yorker/Atlantic/Wired/Guardian)
到iBook中。其中，图书源来自Repo:[awesome-english-ebooks](https://github.com/hehonghui/awesome-english-ebooks)

# 使用

根据个人需求配置好链接中的参数，将其粘贴到[Download2iBook](https://www.icloud.com/shortcuts/62a6dd0fbb2a482295a8036c05725170)
导入问题的回答框即可  
[https://your.own.site/feed?magazine=<MAGAZINE_NAME>&date=<DATE>&filetype=<FILE_TYPE>&action=\<ACTION\>](https://your.own.site/feed?magazine=<MAGAZINE_NAME>&date=<DATE>&filetype=<FILE_TYPE>&action=<ACTION>)

| 键             | 描述        | 值                                                        |
|---------------|-----------|----------------------------------------------------------|
| MAGAZINE_NAME | 外刊名称      | the_economist / new_yorker / atlantic / wired / guardian |     
| DATE          | 外刊的发布日期   | latest / YYYYMMDD                                        |
| FILE_TYPE     | 需要获取的文件类型 | epub / mobi / pdf                                        |
| ACTION        | 如何返回内容    | url / redirect / download                                |

注意，传入DATE的参数，工具不会去严格匹配发布日期，而是去寻找发布时间与传入的时间最接近的刊物。  
ACTION的各个取值的逻辑如下：  
url：网站会返回指定刊物的GitHub下载链接；  
redirect：会将该网址定重向到Github的下载链接；  
download：会在后台将所请求的内容下载本地，并返回给请求者。

# 构建

在构建本项目前，需要满足有如下条件：
- nodejs环境
- [Cloudflare](https://www.cloudflare.com/)账号
- 域名（可选，使用cloudflare workers提供的子域名`*.workers.dev`在墙内无法正常访问）
- 科学上网工具（可选，在执行`wangler publish`时，无科学上网工具会导致无法上传代码到Cloudflare）

```sh
# Clone this repo
git clone https://github.com/JokinYang/periodical-feed.git
cd periodical-feed
# Install wrangler and other packages
npm install -g wrangler
npm install 
# Login to Cloudflare
wrangler login
# Publish to Cloudflare workers
wrangler publish
```
绑定域名：Workers>periodical-feed>触发器>自定义域>添加自定义域