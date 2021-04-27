## github 地址

- [github](https://github.com/kaokei/iframeManager)

## 解决了什么问题？

主要是解决了父子 iframe 之间互相通信的问题。可以像 rpc 一样简单的调用对方的方法，并且获取返回值，并支持 Promise。

## 整体方案以及使用方式

考虑这样的场景，一个页面 A 包含两个 iframe，分别是 B 和 C。

那么在 A 页面中：

```js
PostBridge.registerMethods({
  sayHello() {
    console.log('hello from Page A');
  },
  getUserName() {
    return 'userNameA';
  },
});
PostBridge.start();

// 需要手动获取 iframeB 和 iframeC 的dom对象
const postBridgeB = new PostBridge(iframeB.contentWindow);
const postBridgeC = new PostBridge(iframeC.contentWindow);

// iframeB 中输出 `hello from Page B`
postBridgeB.call('sayHello');
// iframeA 中获取 userName，并打印出 `userNameB`
postBridgeB.request('getUserName').then(name => console.log(name));

// iframeC 中输出 `hello from Page C`
postBridgeC.call('sayHello');
// iframeA 中获取 userName，并打印出 `userNameC`
postBridgeC.request('getUserName').then(name => console.log(name));
```

然后在 B 页面中：

```js
PostBridge.registerMethods({
  sayHello() {
    console.log('hello from Page B');
  },
  getUserName() {
    return 'userNameB';
  },
});
PostBridge.start();

// 其实也可以使用 window.top
const postBridgeA = new PostBridge(window.parent);

// iframeA 中输出 `hello from Page A`
postBridgeA.call('sayHello');
// iframeB 中获取 userName，并打印出 `userNameA`
postBridgeA.request('getUserName').then(name => console.log(name));
```

页面 C 和页面 B 是类似的，就不再重复了。

可以发现我们使用静态类 PostBridge 本身代表当前页面，主要是通过 registerMethods 来暴露对外的接口，以及通过 start 来监听所有事件。

我们用 PostBridge 的实例对象来代表我们想要通信的页面，比如在 A 页面中我们需要和 B 以及 C 通信，那么就需要实例化 postBridgeB 和 postBridgeC 两个对象。并且需要传递 iframeDom.contentWindow 作为参数。同样的在页面 B 和页面 C 中则需要传递 window.parent 作为参数。

最终的效果是我们可以使用 postBridgeA 对象调用页面 A 中的函数，使用 postBridgeB 对象调用页面 B 中的函数，使用 postBridgeC 对象调用页面 C 中的函数。

父子页面的通信比较简单直接，如果想要实现页面 B 和页面 C 之间的互相通信，则比较麻烦了，因为页面 B 和页面 C 之间是互相没有感知的。如果确实有这个需求，我们可以通过父页面来中转消息。
