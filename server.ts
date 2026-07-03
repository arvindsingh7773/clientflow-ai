import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import http from "http";

dotenv.config();

// Validate critical environment variables for production readiness
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
  console.warn("⚠️  [DEPLOYMENT WARNING]: GEMINI_API_KEY is not defined. AI endpoints will fall back to mock simulation mode.");
}

const ai = new GoogleGenAI({ apiKey: geminiKey || "PLACEHOLDER_KEY" });

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  app.use(express.json());

  // 1. Security Headers Middleware (XSS, CSRF, Clickjacking protection)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    next();
  });

  // 2. In-Memory Request Rate Limiting for API routes
  const ipRequestCounts: Record<string, { count: number; resetTime: number }> = {};
  const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 120; // Allow 120 requests/minute
  
  app.use("/api/", (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
    const ipStr = Array.isArray(ip) ? ip[0] : ip;
    const now = Date.now();

    if (!ipRequestCounts[ipStr] || now > ipRequestCounts[ipStr].resetTime) {
      ipRequestCounts[ipStr] = {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS
      };
      next();
    } else {
      ipRequestCounts[ipStr].count++;
      if (ipRequestCounts[ipStr].count > MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
          error: "Too many requests. Please cool down for a minute."
        });
      }
      next();
    }
  });

  // 3. Static SEO robots.txt
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *
Allow: /
Disallow: /dashboard/
Sitemap: ${req.protocol}://${req.get("host")}/sitemap.xml
`);
  });

  // 4. Dynamic SEO sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    const host = `${req.protocol}://${req.get("host")}`;
    res.type("application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${host}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${host}/signup</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${host}/phone-login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`);
  });

  // 5. PWA manifest.json configuration
  app.get("/manifest.json", (req, res) => {
    res.type("application/json");
    res.json({
      short_name: "ClientFlow",
      name: "ClientFlow AI Marketplace",
      description: "Next-generation AI-powered B2B and Freelancer Marketplace",
      icons: [
        {
          src: "https://img.icons8.com/fluency/192/000000/artificial-intelligence.png",
          type: "image/png",
          sizes: "192x192"
        },
        {
          src: "https://img.icons8.com/fluency/512/000000/artificial-intelligence.png",
          type: "image/png",
          sizes: "512x512"
        }
      ],
      start_url: "/",
      background_color: "#0f172a",
      theme_color: "#6366f1",
      display: "standalone",
      orientation: "portrait"
    });
  });

  // 6. Service worker JS content (Updated to avoid caching stale assets and force updates)
  app.get("/sw.js", (req, res) => {
    res.type("application/javascript");
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.send(`
const CACHE_NAME = 'clientflow-pwa-v5';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  const url = event.request.url;
  if (url.includes('/api/') || url.includes('identitytoolkit') || url.includes('firestore.googleapis.com')) {
    return;
  }

  // Network-first strategy to ensure users always see the latest code, falling back to cache if offline
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
`);
  });

  // AI Matches for Projects (For Freelancers to see best projects)
  app.post("/api/ai/match-projects", async (req, res) => {
    try {
      const { freelancerProfile, projects } = req.body;
      
      if (!freelancerProfile || !projects) {
        return res.status(400).json({ error: "Missing freelancerProfile or projects" });
      }

      const prompt = `
        You are an expert matchmaking AI for a freelance platform.
        Given a freelancer profile and a list of available projects, calculate a match score (0-100) for each project.
        Consider skills, experience, budget, and description.
        
        Freelancer Profile:
        ${JSON.stringify(freelancerProfile, null, 2)}
        
        Available Projects:
        ${JSON.stringify(projects, null, 2)}
        
        Return ONLY a valid JSON array of objects with fields: projectId, score (number), reason (string 1-2 sentences). Do not include any markdown formatting.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const matches = JSON.parse(responseText);
      res.json({ matches });
    } catch (error: any) {
      console.error("Match Projects Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate matches" });
    }
  });

  // AI Matches for Freelancers (For Clients to see best freelancers)
  app.post("/api/ai/match-freelancers", async (req, res) => {
    try {
      const { project, freelancerProfiles } = req.body;
      
      if (!project || !freelancerProfiles) {
        return res.status(400).json({ error: "Missing project or freelancerProfiles" });
      }

      const prompt = `
        You are an expert matchmaking AI for a freelance platform.
        Given a project and a list of freelancer profiles, calculate a match score (0-100) for each freelancer.
        Consider skills, experience, budget, and description.
        
        Project:
        ${JSON.stringify(project, null, 2)}
        
        Freelancer Profiles:
        ${JSON.stringify(freelancerProfiles, null, 2)}
        
        Return ONLY a valid JSON array of objects with fields: freelancerId, score (number), reason (string 1-2 sentences). Do not include any markdown formatting.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const matches = JSON.parse(responseText);
      res.json({ matches });
    } catch (error: any) {
      console.error("Match Freelancers Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate matches" });
    }
  });

  // AI Proposal Generator
  app.post("/api/ai/generate-proposal", async (req, res) => {
    try {
      const { project, freelancerProfile } = req.body;
      
      const prompt = `
        Write a professional and compelling cover letter for the following freelance project.
        Tailor it specifically to the freelancer's skills and experience. Do not include placeholders like "[Your Name]", write it directly.
        Keep it concise, engaging, and around 3 paragraphs.
        
        Freelancer Profile:
        ${JSON.stringify(freelancerProfile, null, 2)}
        
        Project Details:
        ${JSON.stringify(project, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ proposal: response.text });
    } catch (error: any) {
      console.error("Generate Proposal Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate proposal" });
    }
  });

  // AI Profile Suggestions
  app.post("/api/ai/profile-suggestions", async (req, res) => {
    try {
      const { freelancerProfile } = req.body;
      
      const prompt = `
        Analyze the following freelancer profile and provide 3-4 actionable tips to improve it to win more clients.
        
        Profile:
        ${JSON.stringify(freelancerProfile, null, 2)}
        
        Return ONLY a valid JSON array of strings containing the suggestions. Do not include any markdown formatting.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const suggestions = JSON.parse(responseText);
      res.json({ suggestions });
    } catch (error: any) {
      console.error("Profile Suggestions Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate suggestions" });
    }
  });

  // AI Matches for Businesses (For Clients to see best business profiles)
  app.post("/api/ai/match-businesses", async (req, res) => {
    try {
      const { project, businessProfiles } = req.body;
      
      if (!project || !businessProfiles) {
        return res.status(400).json({ error: "Missing project or businessProfiles" });
      }

      const prompt = `
        You are an expert matchmaking AI for a global business marketplace.
        Given a business project requirement and a list of business profiles, calculate a match score (0-100) for each business profile based on industry, services, experience, rating, and country.
        
        Project:
        ${JSON.stringify(project, null, 2)}
        
        Business Profiles:
        ${JSON.stringify(businessProfiles, null, 2)}
        
        Return ONLY a valid JSON array of objects with fields: businessProfileId, score (number), reason (string 1-2 sentences). Do not include any markdown formatting.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      let responseText = response.text || "[]";
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const matches = JSON.parse(responseText);
      res.json({ matches });
    } catch (error: any) {
      console.error("Match Businesses Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate matches" });
    }
  });

  // AI Project Description Improvement
  app.post("/api/ai/improve-description", async (req, res) => {
    try {
      const { description, category } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: "Missing description" });
      }

      const prompt = `
        You are an expert copywriter for business requirements on a global marketplace.
        Improve and expand the following project description to make it professional, detailed, clear, and attractive to global businesses / service providers.
        Keep it structured with bullet points of requirements if appropriate.
        Category: ${category || "General"}
        
        Original Description:
        ${description}
        
        Return ONLY the improved description text. No extra text or markdown codeblocks.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ improvedDescription: response.text });
    } catch (error: any) {
      console.error("Improve Description Error:", error);
      res.status(500).json({ error: error.message || "Failed to improve description" });
    }
  });

  // AI Proposal / Cover Letter Pitch Generator
  app.post("/api/ai/generate-proposal", async (req, res) => {
    try {
      const { project, freelancerProfile } = req.body;
      if (!project || !freelancerProfile) {
        return res.status(400).json({ error: "Missing project or freelancerProfile" });
      }

      const prompt = `
        You are an expert sales writer representing a global business/agency.
        Draft a high-converting, professional business proposal pitch to apply for the following project requirement on our marketplace.
        Include brief, clear headings for:
        1. Executive Sourcing Summary
        2. Delivery Capabilities & ISO/Scale Alignment
        3. Quality Benchmarks & Communication Plan
        
        Requirement Project:
        ${JSON.stringify(project, null, 2)}
        
        Company Profile Info:
        ${JSON.stringify(freelancerProfile, null, 2)}
        
        Return ONLY the formatted proposal pitch text.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ proposal: response.text });
    } catch (error: any) {
      console.error("Generate Proposal Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate proposal" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server: httpServer }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files with no-cache headers for html files
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
      }
    }));
    
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
