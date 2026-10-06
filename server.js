const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PIN = process.env.EDIT_PIN || "";
let DIR = process.env.DATA_DIR || "/data";
try { fs.mkdirSync(DIR, { recursive: true }); fs.accessSync(DIR, fs.constants.W_OK); }
catch (e) { DIR = path.join(__dirname, "data"); fs.mkdirSync(DIR, { recursive: true }); }
const FILE = path.join(DIR, "links.json");

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
const authed = (req) => !PIN || req.headers["x-pin"] === PIN;

http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/data" && req.method === "GET") {
    try { return send(res, 200, fs.readFileSync(FILE, "utf8")); }
    catch (e) { return send(res, 200, "null"); }
  }
  if (url === "/api/auth" && req.method === "POST") {
    return authed(req) ? send(res, 200, { ok: true }) : send(res, 401, { ok: false });
  }
  if (url === "/api/data" && req.method === "PUT") {
    if (!authed(req)) return send(res, 401, { ok: false });
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      try {
        const d = JSON.parse(body);
        if (!Array.isArray(d)) throw new Error("bad");
        const tmp = FILE + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(d));
        fs.renameSync(tmp, FILE);
        send(res, 200, { ok: true });
      } catch (e) { send(res, 400, { ok: false }); }
    });
    return;
  }
  if (url === "/" || url === "/index.html") {
    return send(res, 200, fs.readFileSync(path.join(__dirname, "index.html"), "utf8"), "text/html; charset=utf-8");
  }
  send(res, 404, { error: "not found" });
}).listen(PORT, "0.0.0.0", () => console.log("Dashboard-Sekom on " + PORT + ", data in " + DIR));
