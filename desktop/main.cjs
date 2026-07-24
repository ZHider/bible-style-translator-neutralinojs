const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("node:child_process");
const { appendFileSync, existsSync } = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = 32145;
const APP_URL = "http://127.0.0.1:32145";

let mainWindow;
let serverProcess;
let isQuitting = false;

function writeLog(message) {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    appendFileSync(path.join(app.getPath("userData"), "desktop.log"), line, "utf8");
  } catch {}
}

function getServerDirectory() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app-server")
    : path.join(app.getAppPath(), ".next", "standalone");
}

function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(APP_URL, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.setTimeout(1200, () => request.destroy());
      request.on("error", retry);
    };

    const retry = () => {
      if (Date.now() >= deadline) {
        reject(new Error("本地服务启动超时"));
        return;
      }
      setTimeout(attempt, 300);
    };

    attempt();
  });
}

async function startServer() {
  const serverDirectory = getServerDirectory();
  const serverEntry = path.join(serverDirectory, "server.js");

  if (!existsSync(serverEntry)) {
    throw new Error(`找不到桌面端服务文件：${serverEntry}`);
  }

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: serverDirectory,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: HOST,
      NODE_ENV: "production",
      NODE_PATH: path.join(serverDirectory, "server_modules"),
      PORT: String(PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  serverProcess.stdout?.on("data", (data) => writeLog(data.toString().trim()));
  serverProcess.stderr?.on("data", (data) => writeLog(data.toString().trim()));
  serverProcess.on("exit", (code) => {
    writeLog(`本地服务已退出，代码：${code}`);
    if (!isQuitting) {
      dialog.showErrorBox(
        "圣经体翻译器",
        "本地服务意外停止。请关闭应用后重新打开。",
      );
    }
  });

  await waitForServer();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 980,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#ece4d5",
    title: "圣经体翻译器",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.loadURL(APP_URL);
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  serverProcess = undefined;
}

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await startServer();
      createWindow();
    } catch (error) {
      writeLog(error instanceof Error ? error.stack || error.message : String(error));
      dialog.showErrorBox(
        "圣经体翻译器无法启动",
        error instanceof Error ? error.message : "未知错误",
      );
      app.quit();
    }
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  stopServer();
});

app.on("window-all-closed", () => app.quit());
