aiPlayer
---

## 代码签名

> 创建证书

```shell
npx electron-builder create-self-signed-cert -p F81ED816-8591-4CF6-99BB-17F938D47839
```

> 替换低版本 signtool.exe 和 makeappx.exe

```html
安装 Windows SDK 复制内容到目录覆盖
C:\Users\Jazz\AppData\Local\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\windows-10\x64
```

## 播放格式检测

```js
// 1. 准备几个常见的“容器+编解码”组合
const tests = [
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    'video/webm; codecs="vp9, opus"',
    'video/x-matroska; codecs="vp9, opus"',
    'video/x-msvideo; codecs="mpeg4"',
    'application/vnd.rn-realmedia; codecs="rv40"'
]

// 2. HTMLMediaElement.canPlayType() 方式
const video66 = document.createElement('video')
console.log('--- canPlayType 测试 ---')
tests.forEach(t => {
    console.log(t, '→', video66.canPlayType(t) || '""')
})

// 3. MediaSource.isTypeSupported() 方式
if ('MediaSource' in window) {
    console.log('--- MediaSource.isTypeSupported 测试 ---')
    tests.forEach(t => {
        console.log(t, '→', MediaSource.isTypeSupported(t))
    })
}
```
