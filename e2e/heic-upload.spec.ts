/**
 * 使用 test/test_compress.heic 测试上传与压缩：HEIC 应被转换并显示预览或明确错误信息
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const heicPath = path.resolve(__dirname, '../test/test_compress.heic');

test.describe('HEIC 上传与压缩', () => {
  test.use({ baseURL: 'http://localhost:5173' });

  test('上传 test_compress.heic 后应压缩成功并显示预览或大小', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /上传宠物照片|正在压缩/ })).toBeVisible();

    const input = page.locator('input[type="file"][accept="image/*"]');
    await input.setInputFiles(heicPath);

    // 等待压缩/转换完成（HEIC 转码 + 可选压缩最多约 10s）
    await page.waitForTimeout(12000);

    const hasUnsupportedError = await page.getByText(/此 HEIC 格式暂无法转换/).isVisible();
    const hasSizeInfo = await page.getByText(/图片大小|已压缩至|原 .* (MB|KB)/).isVisible();
    const hasPreview = await page.locator('img[alt="宠物照片"]').isVisible();

    expect(hasUnsupportedError, '不应出现「此 HEIC 格式暂无法转换」即解析应成功').toBe(false);
    expect(
      hasSizeInfo || hasPreview,
      '应出现预览图或大小信息（压缩/转换成功）'
    ).toBeTruthy();
  });
});
