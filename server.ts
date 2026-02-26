import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("community.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    picture TEXT
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    content TEXT,
    image TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER,
    userId TEXT,
    content TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(postId) REFERENCES posts(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Middleware
  const auth = (req: any, res: any, next: any) => {
    const userId = req.cookies.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  };

  // Google OAuth Endpoints
  app.get("/api/auth/google/url", (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `${process.env.APP_URL}/auth/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };

    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  app.get("/auth/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("No code provided");

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${process.env.APP_URL}/auth/callback`,
          grant_type: "authorization_code",
        }),
      });

      const { access_token } = await tokenResponse.json() as any;

      // Get user info
      const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const googleUser = await userResponse.json() as any;

      // Upsert user
      db.prepare(`
        INSERT INTO users (id, name, email, picture)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          picture = excluded.picture
      `).run(googleUser.sub, googleUser.name, googleUser.email, googleUser.picture);

      // Set cookie
      res.cookie("userId", googleUser.sub, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = req.cookies.userId;
    if (!userId) return res.json({ user: null });
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json({ user: user || null });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("userId", { sameSite: 'none', secure: true });
    res.json({ success: true });
  });

  // Community API
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT posts.*, users.name as userName, users.picture as userPicture
      FROM posts
      JOIN users ON posts.userId = users.id
      ORDER BY createdAt DESC
    `).all();

    const postsWithComments = posts.map((post: any) => {
      const comments = db.prepare(`
        SELECT comments.*, users.name as userName, users.picture as userPicture
        FROM comments
        JOIN users ON comments.userId = users.id
        WHERE postId = ?
        ORDER BY createdAt ASC
      `).all(post.id);
      return { ...post, comments };
    });

    res.json(postsWithComments);
  });

  app.post("/api/posts", auth, (req: any, res) => {
    const { content, image } = req.body;
    if (!content && !image) return res.status(400).json({ error: "Content or image required" });

    const result = db.prepare(`
      INSERT INTO posts (userId, content, image)
      VALUES (?, ?, ?)
    `).run(req.user.id, content, image);

    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/posts/:postId/comments", auth, (req: any, res) => {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });

    db.prepare(`
      INSERT INTO comments (postId, userId, content)
      VALUES (?, ?, ?)
    `).run(postId, req.user.id, content);

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await fs.promises.readFile(
          path.resolve(__dirname, "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
