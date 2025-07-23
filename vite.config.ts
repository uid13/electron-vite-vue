import fs from 'node:fs'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import pkg from './package.json'

import path from 'path';
import Unocss from 'unocss/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers';

// import fse from 'fs-extra';

const pathTypes = path.resolve(__dirname, 'types');

// https://vitejs.dev/config/
export default defineConfig(({command}) => {
    fs.rmSync('dist-electron', {recursive: true, force: true})

    const isServe = command === 'serve'
    const isBuild = command === 'build'
    const sourcemap = isServe || !!process.env.VSCODE_DEBUG

    return {
        envDir: path.resolve(__dirname, './env'),
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        plugins: [
            Unocss(),
            vue(),
            AutoImport({
                imports: ['vue'],
                resolvers: [
                    ElementPlusResolver(),
                    IconsResolver({prefix: 'icon'}),
                ],
                dts: path.resolve(pathTypes, 'auto-imports.d.ts'),
            }),
            Components({
                resolvers: [
                    IconsResolver({
                        enabledCollections: ['ep'],
                    }),
                    ElementPlusResolver(),
                ],
                dts: path.resolve(pathTypes, 'components.d.ts'),
            }),
            Icons({
                autoInstall: true,
            }),
            electron({
                main: {
                    entry: 'electron/main/index.ts',
                    onstart({startup}) {
                        if (process.env.VSCODE_DEBUG) {
                            console.log(/* For `.vscode/.debug.script.mjs` */'[startup] Electron App')
                        } else {
                            startup()
                        }
                    },
                    vite: {
                        resolve: {
                            alias: {},
                        },
                        build: {
                            sourcemap,
                            minify: isBuild,
                            outDir: 'dist-electron/main',
                            rollupOptions: {
                                // Some third-party Node.js libraries may not be built correctly by Vite, especially `C/C++` addons,
                                // we can use `external` to exclude them to ensure they work correctly.
                                // Others need to put them in `dependencies` to ensure they are collected into `app.asar` after the app is built.
                                // Of course, this is not absolute, just this way is relatively simple. :)
                                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                            },
                        },
                    },
                },
                preload: {
                    // Shortcut of `build.rollupOptions.input`.
                    // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
                    input: 'electron/preload/index.ts',
                    vite: {
                        build: {
                            sourcemap: sourcemap ? 'inline' : undefined, // #332
                            minify: isBuild,
                            outDir: 'dist-electron/preload',
                            rollupOptions: {
                                external: Object.keys('dependencies' in pkg ? pkg.dependencies : {}),
                            },
                        },
                    },
                },
                // Ployfill the Electron and Node.js API for Renderer process.
                // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
                // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
                renderer: {},
            }),
/*            {
                name: 'copy-ffmpeg',
                closeBundle() {
                    const ffmpegSource = path.resolve(__dirname, 'ffmpeg/ffmpeg.dll');
                    const ffmpegDestination = path.resolve(__dirname, 'dist-electron/ffmpeg.dll');
                    console.log('Copying ffmpeg.dll from', ffmpegSource, 'to', ffmpegDestination);
                    fse.copySync(ffmpegSource, ffmpegDestination);
                }
            }*/
        ],
        server: process.env.VSCODE_DEBUG && (() => {
            const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
            return {
                host: url.hostname,
                port: +url.port,
            }
        })(),
        clearScreen: false,
    }
})
