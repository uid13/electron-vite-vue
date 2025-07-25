import {app, BrowserWindow, globalShortcut, shell, ipcMain} from 'electron'
import {release} from 'node:os'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {existsSync} from 'node:fs'

globalThis.__filename = fileURLToPath(import.meta.url)
globalThis.__dirname = dirname(__filename)

app.commandLine.appendSwitch('enable-accelerated-video-decode', 'true') // 高版本解码
app.commandLine.appendSwitch('enable-hevc', 'true') // 高版本解码
app.commandLine.appendSwitch('--enable-features', 'PlatformHEVCDecoderSupport')  // 低版本解码
app.commandLine.appendSwitch('--enable-features', 'MediaRecorderHEVCSupport') // 低版本编码

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
    ? join(process.env.DIST_ELECTRON, '../public')
    : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.mjs')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
    win = new BrowserWindow({
        title: 'Welcome to aiPlayer',
        icon: join(process.env.VITE_PUBLIC, 'icons/favicon32.ico'),
        // width: 2616, height: 1696,
        width: 1280, height: 720,
        webPreferences: {
            preload,
            contextIsolation: true,
            nodeIntegration: false,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            // nodeIntegration: true,

            // Consider using contextBridge.exposeInMainWorld
            // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
            // contextIsolation: false,
        },
        center: true,
        acceptFirstMouse: false,
        autoHideMenuBar: true,
        maximizable: true,
        fullscreen: false,
        kiosk: false
    })

    win.setMenu(null)

    if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
        win.loadURL(url)
        // Open devTool if the app is not packaged
        // win.webContents.openDevTools()
    } else {
        await win.loadFile(indexHtml)
    }

    // Test actively push message to the Electron-Renderer
    win.webContents.on('did-finish-load', () => {
        if (win && win.webContents) {
            win.webContents.send("main-process-message", new Date().toLocaleString());
        }
        // 隐藏竖向滚动条
       //  win.webContents.insertCSS(`
       //    ::-webkit-scrollbar {
       //      display: none;
       //    }
       // `)
    })

    // Make all links open with the browser, not with the application

    // win.webContents.setWindowOpenHandler(({ url }) => {
    //   if (url.startsWith('https:')) shell.openExternal(url)
    //   return { action: 'deny' }
    // })

    win.once('ready-to-show', () => {
        win.maximize();
    });
    // win.webContents.on('will-navigate', (event, url) => { }) #344

    /*win.on('focus', () => {
        globalShortcut.register('Shift+F5', () => {
            win.reload()
        })

        globalShortcut.register('Shift+Ctrl+I', () => {
            win.webContents.openDevTools()
        })

        globalShortcut.register('Ctrl+F', () => {
            win.webContents.send('on-find', '')
        })
    })

    win.on('blur', () => {
        globalShortcut.unregister('Shift+F5')
        globalShortcut.unregister('Ctrl+F')
        globalShortcut.unregister('Shift+Ctrl+I')
    })*/
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
    if (win) {
        // Focus on the main window if the user tried to open another
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow()
    }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
    const childWindow = new BrowserWindow({
        webPreferences: {
            preload,
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    if (process.env.VITE_DEV_SERVER_URL) {
        childWindow.loadURL(`${url}#${arg}`)
    } else {
        childWindow.loadFile(indexHtml, {hash: arg})
    }
})
