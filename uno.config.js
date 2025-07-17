import {
    defineConfig,
    presetUno,
    presetAttributify,
} from 'unocss';
import presetIcons from '@unocss/preset-icons';

export default defineConfig({
    presets: [
        presetUno(),
        presetAttributify(),
        presetIcons({
            scale: 1.2, // 图标大小缩放比例
            warn: true, // 开启警告，当图标不存在时会在控制台显示警告
            autoInstall: true, // 自动安装缺失的图标包
            extraProperties: {
                'display': 'inline-block',
                'vertical-align': 'middle',
            },
        }),
    ],
    rules: [
        ['layout1', {'grid-template-columns': 'repeat(1, minmax(0, 1fr))'}],
        ['layout4', {'grid-template-columns': 'repeat(2, minmax(0, 1fr))'}],
        ['layout6', {'grid-template-columns': 'repeat(3, minmax(0, 1fr))'}],
    ],
    content: {
        pipeline: {
            include: [
                'index.html',
                'src/**/*.{html,js,jsx,vue}'
            ],
            exclude: []
        }
    }
});