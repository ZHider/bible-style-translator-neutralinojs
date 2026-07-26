/**
 * Neutralinojs 客户端库类型声明。
 * neutralino.js 在运行时通过 <script src="neutralino.js"> 加载，
 * Neutralino 全局对象由框架注入。
 */

declare const Neutralino: {
  init: () => void;
  net: {
    post: (
      url: string,
      options: {
        headers?: Record<string, string>;
        body?: string;
        timeout?: number;
      },
    ) => Promise<{
      status: number;
      statusText: string;
      body: string;
      headers: Record<string, string>;
    }>;
  };
};
