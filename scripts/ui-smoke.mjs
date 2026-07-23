import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9333;
const profileDir = await mkdtemp(path.join(os.tmpdir(), "bible-style-ui-"));

const edge = spawn(
  edgePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getPageTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      const response = await fetch(
        `http://127.0.0.1:${debugPort}/json/new`,
        { method: "PUT" },
      );
      if (response.ok) return response.json();
    } catch {
      // Edge is still starting.
    }
    await delay(100);
  }
  throw new Error("Timed out waiting for the browser page target.");
}

try {
  const target = await getPageTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let messageId = 0;
  const pending = new Map();
  const browserErrors = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      browserErrors.push(message.params.exceptionDetails.text);
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      browserErrors.push(message.params.entry.text);
    }
  });

  const call = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++messageId;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const reply = await call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (reply.result.exceptionDetails) {
      throw new Error(reply.result.exceptionDetails.text);
    }
    return reply.result.result.value;
  };

  await call("Runtime.enable");
  await call("Log.enable");
  await call("Page.enable");
  await call("Page.navigate", { url: "http://127.0.0.1:3000" });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const pageReady = await evaluate(
      "location.href.startsWith('http://127.0.0.1:3000') && document.readyState === 'complete' && !!document.querySelector('.key-button')",
    );
    if (pageReady) break;
    await delay(100);
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const hydrated = await evaluate(
      "!!document.querySelector('.key-button') && Object.keys(document.querySelector('.key-button')).some((key) => key.startsWith('__reactProps$'))",
    );
    if (hydrated) break;
    await delay(100);
  }

  const diagnostics = await evaluate(`({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    hasReactProps: Object.keys(document.querySelector('.key-button') || {}).some((key) => key.startsWith('__reactProps$')),
    levelButtonCount: document.querySelectorAll('.level-switch button').length,
    bodyText: document.body?.innerText.slice(0, 160),
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
  })`);

  if (diagnostics.levelButtonCount === 0) {
    console.log(JSON.stringify({ diagnostics, browserErrors }, null, 2));
    process.exitCode = 1;
    socket.close();
    throw new Error("The application page did not render in the browser.");
  }

  const initialLevel = await evaluate(
    "[...document.querySelectorAll('.level-switch button')].findIndex((button) => button.classList.contains('active'))",
  );
  await evaluate("document.querySelectorAll('.level-switch button')[0].click()");
  await delay(100);
  const clickedLevel = await evaluate(
    "[...document.querySelectorAll('.level-switch button')].findIndex((button) => button.classList.contains('active'))",
  );

  await evaluate("document.querySelectorAll('.direction-switch > button')[1].click()");
  await delay(100);
  const directionChanged = await evaluate(
    "document.querySelectorAll('.direction-switch > button')[1].classList.contains('active') && !!document.querySelector('.mode-grid.plain')",
  );

  await evaluate("document.querySelector('.key-button').click()");
  await delay(100);
  const modalOpened = await evaluate("!!document.querySelector('.key-modal')");
  if (modalOpened) {
    await evaluate("document.querySelector('.modal-close').click()");
  }

  await evaluate("document.querySelectorAll('.direction-switch > button')[0].click()");
  await delay(100);
  await evaluate("document.querySelector('.example-row button').click()");
  await delay(100);
  const exampleFilled = await evaluate(
    "document.querySelector('textarea').value.length > 0 && !document.querySelector('.submit-button').disabled",
  );

  const result = {
    levelButton: initialLevel === 1 && clickedLevel === 0,
    directionButton: directionChanged,
    apiButton: modalOpened,
    exampleButton: exampleFilled,
    diagnostics,
    browserErrors,
  };

  console.log(JSON.stringify(result, null, 2));
  socket.close();

  if (
    Object.entries(result).some(
      ([key, value]) => !["browserErrors", "diagnostics"].includes(key) && value !== true,
    )
  ) {
    process.exitCode = 1;
  }
  if (browserErrors.length > 0) process.exitCode = 1;
} finally {
  edge.kill();
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
