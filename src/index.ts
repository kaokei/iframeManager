type SafeAny = any;

interface RouteMetaType {
  appName: string;
  path?: string;
  publicPath?: string;
  [key: string]: SafeAny;
}

type PoolType = Record<string, IframeItem>;
type PoolsType = Record<string, PoolType>;

import { iframeResizer } from 'iframe-resizer';
import { PostBridge } from '@kaokei/post-bridge';

// 注意这里的iframe默认永远不会被销毁
// 除非override destroy方法
const IFRAME_POOLS = {} as PoolsType;

class IframeItem {
  public routeMeta: RouteMetaType;
  public container: HTMLElement;
  public status: 'created' | 'loading' | 'loaded';
  public appended: boolean;
  public postBridge?: PostBridge;
  public iframe: HTMLIFrameElement;
  public origin: string;

  constructor(routeMeta: RouteMetaType, container: HTMLElement) {
    this.onload = this.onload.bind(this);

    this.routeMeta = routeMeta;
    this.container = container;

    this.status = 'created'; // iframe状态
    this.appended = false; // iframe是否已经添加到document
    this.postBridge = undefined; // 与iframe通信的对象

    this.iframe = this.createIframe(); // 创建一个空壳iframe
    this.origin = this.createOrigin(); // 控制通信的origin
  }

  // 创建一个空壳的iframe，但是暂时不添加到dom中
  createIframe() {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('width', '100%');
    iframe.addEventListener('load', this.onload);
    return iframe;
  }

  // 通过publicPath分析出iframe的origin
  createOrigin() {
    const { publicPath } = this.routeMeta;
    if (publicPath) {
      if (publicPath.indexOf('http://') === 0 || publicPath.indexOf('https://') === 0) {
        const last = publicPath.indexOf('/', 8);
        return publicPath.slice(0, last);
      }
    }
    return '*';
  }

  // 获取iframe的完整链接：就是publicPath+path
  // 注意这里的publicPath末尾一定有/，但是path首部一定没有/
  getFullPath(routeMeta: RouteMetaType) {
    const { publicPath, path } = routeMeta;
    console.log('fullpath :>> ', `${publicPath}${path || ''}`);
    return `${publicPath}${path || ''}`;
  }

  // 同步修改iframe的url
  // 需要区分是第一次赋值还是后续赋值
  sync(routeMeta: RouteMetaType) {
    console.log('sync2 :>> ', routeMeta);
    this.routeMeta = routeMeta;
    if (this.status === 'loaded') {
      // 第二次以后sync，则需要通过postBridge来调用iframe内部的replaceState方法来同步路由
      console.log('status1 :>> ');
      this.postBridge && this.postBridge.call('replaceState', routeMeta);
    } else {
      // 第一次sync，则是直接赋值给iframe就行了ƒ
      console.log('status2 :>> ');
      this.setStatusLoading();
      this.iframe.setAttribute('src', this.getFullPath(routeMeta));
    }
  }

  // 在onload事件中创建postBridge
  // 在onload事件中创建iframeResizer
  onload() {
    console.log('onload :>> ');
    this.setStatusLoaded();
    // onload之后才能创建postBridge对象
    this.postBridge = new PostBridge(this.iframe.contentWindow as Window, {
      ...this.routeMeta,
      origin: this.origin,
    });
    iframeResizer({ log: false, checkOrigin: false }, this.iframe); // 同步iframe的高度自适应内容高度
  }

  setStatusLoading() {
    this.status = 'loading';
  }
  setStatusLoaded() {
    this.status = 'loaded';
  }
  // 尝试把iframe添加到dom中
  // 注意这里不能在创建iframe的时候，就直接添加到dom中，因为这样会立即触发onload事件，但是实际上是一个空文档
  appendIframe() {
    if (!this.appended) {
      this.appended = true;
      this.container.appendChild(this.iframe);
    }
  }
  // 从dom中删除iframe
  removeIframe() {
    if (this.appended) {
      this.appended = false;
      this.container.removeChild(this.iframe);
    }
  }
}

export class IframeManager {
  public container: HTMLElement;
  public pool: PoolType;

  constructor(selector: string) {
    const found = document.querySelector(selector);
    if (!found) throw new Error(`找不到selector ${selector}`);

    this.container = found as HTMLElement;
    // iframeManager实例会被多次创建和销毁
    // 但是selector对应的所有iframe会被缓存，避免iframe reload
    this.pool = IFRAME_POOLS[selector] || {}; // 当前manager对应的池子
    IFRAME_POOLS[selector] = IFRAME_POOLS[selector] || this.pool; // 把当前manager对应的池子放到全局对象中
  }

  // 根据appName获取iframe
  // 每个appName对应唯一的一个iframe
  getIframeItem(routeMeta: RouteMetaType) {
    const { appName } = routeMeta;
    if (!this.pool[appName]) {
      const iframeItem = new IframeItem(routeMeta, this.container);
      this.pool[appName] = iframeItem;
    }
    return this.pool[appName];
  }

  // 外部只会调用iframeManager.sync
  // 实际还是会调用iframeItem.sync
  sync(routeMeta: RouteMetaType) {
    console.log('sync1 :>> ', routeMeta);
    const currentIframeItem = this.getIframeItem(routeMeta);
    currentIframeItem.sync(routeMeta);
    // 注意要先调用sync，然后才append
    // 这是为了避免还没有sync就已经触发了onload事件，导致状态出错
    currentIframeItem.appendIframe();
    // 需要切换显示不同的iframe
    this.showIframeItem(currentIframeItem);
  }

  // 同一个container中同时只会显示一个iframe
  showIframeItem(iframeItem: IframeItem) {
    for (const key in this.pool) {
      if (Object.prototype.hasOwnProperty.call(this.pool, key)) {
        const curItem = this.pool[key];
        curItem.iframe.style.display = curItem === iframeItem ? '' : 'none';
      }
    }
    this.container.style.display = '';
  }

  // 这里默认只是隐藏了container
  // 如果有需要可以override这个方法
  destroy() {
    this.container.style.display = 'none';
  }

  // 删除整个iframeItem对象
  removeIframeItem(routeMeta: RouteMetaType) {
    const { appName } = routeMeta;
    if (this.pool[appName]) {
      this.pool[appName].removeIframe();
      delete this.pool[appName];
    }
  }

  // 只是从dom中删除iframe
  removeIframeOnly(routeMeta: RouteMetaType) {
    const { appName } = routeMeta;
    if (this.pool[appName]) {
      this.pool[appName].removeIframe();
    }
  }
}
