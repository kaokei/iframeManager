## github 地址

- [github](https://github.com/kaokei/iframeManager)

## 解决了什么问题？

主要是用来统一管理 iframe，缓存 iframe，避免 iframe 重渲染，从而实现微前端的效果。

## 整体介绍

使用 iframe 来实现微前端的好处非常明显，就是简单，自带 css 隔离和 js 隔离。

但是也面临着很多问题。比如这些问题：

- iframe 重新 reload  
  这个问题是通过 iframeManager 来统一管理缓存来解决的。

- iframe 高度自适应  
  这个问题是采用 iframe-resizer 来解决的。

- iframe 跨域通信  
  这个问题是采用@kaokei/post-bridge 来解决的。

- 父子页面的路由保持一致  
  这个问题并没有以开源库的方式来解决，主要是因为这个问题比较复杂，没有通用的解决方案，但是可以参考 demo 中的最佳实践来实现自己的方案。
