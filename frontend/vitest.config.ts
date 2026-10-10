import { defineConfig } from 'vitest/config';

// 单元测试只覆盖纯 TypeScript 模块（状态机、生成器、契约不变量、榜单派生），
// 因此使用 node 环境，不引入 jsdom。浏览器验收由独立 QA 代理负责。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: false,
    reporters: ['default'],
  },
});
