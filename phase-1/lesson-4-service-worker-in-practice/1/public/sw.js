/**
 * @file sw.js
 * @author huanghuiquan (huanghuiquan@baidu.com)
 */

let VERSION = 0;
let CACHE_NAME = 'cache_v' + VERSION;
let CACHE_URLS = [
    '/',
    '/api/movies',
    '/css/main.css',
    '/js/main.js',
    '/js/ui.js',
    '/js/render.js',
    '/img/logo.png '
]; // 缓存列表

console.log(caches, 'caches') // CacheStorage对象
/**
 * 缓存到 cacheStorage 里
 *
 * @param {Request} req 请求对象
 * @param {Response} res 响应对象
 */
function saveToCache(req, res) {
    return caches
        .open(CACHE_NAME)
        .then(cache => cache.put(req, res));
}

/**
 * 预缓存
 *
 * @return {Promise} 缓存成功的promise
 */
function precache() {
    return caches.open(CACHE_NAME).then(function (cache) {
        return cache.addAll(CACHE_URLS);
    });
}

/**
 * 清除过期的 cache
 *
 * @return {Promise} promise
 */
function clearStaleCache() {
    return caches.keys().then(keys => {
        keys.forEach(key => {
            if (CACHE_NAME !== key) {
                caches.delete(key);
            }
        });
    });
}

/**
 * 请求并缓存内容
 *
 * @param {Request} req request
 * @return {Promise}
 */
function fetchAndCache(req) {
    return fetch(req)
        .then(function (res) {
            saveToCache(req, res.clone());
            return res;
        });
}


// 下载新的缓存
self.addEventListener('install', function (event) {
    event.waitUntil(
        precache().then(self.skipWaiting)
    );
});

// 删除就的缓存
self.addEventListener('activate', function (event) {
    event.waitUntil(
        Promise.all([
            self.clients.claim(), // 使客户端获取新的 ServiceWorker
            clearStaleCache()
        ])
    );
});

// 处理请求
self.addEventListener('fetch', function (event) {
    console.log('request被拦截', event, event.request.url);

    // 只对同源的资源走 sw，cdn 上的资源利用 http 缓存策略
    if (new URL(event.request.url).origin !== self.origin) {
        return;
    }

    if (event.request.url.includes('/api/movies')) {
        // 不要拿第一次的结构，而是更新缓存
        event.respondWith(
            fetchAndCache(event.request)
                .catch(function () {
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // 优先从网络上加载 失败了就去取缓存
    event.respondWith(
        fetch(event.request).catch(function () {
            return caches.match(event.request);
        })
    );
});
