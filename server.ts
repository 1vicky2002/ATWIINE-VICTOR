import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  // Sitemap Generator
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const firebaseConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
      if (!fs.existsSync(firebaseConfigPath)) {
        return res.status(404).send("Config not found");
      }
      
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
      const projectIds = [
        firebaseConfig.projectId
      ];

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const baseUrl = `${protocol}://${req.headers.host}`;
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      
      // Static pages
      const staticPages = ["/", "/about", "/profile", "/admin"];
      staticPages.forEach(p => {
        xml += `  <url>\n    <loc>${baseUrl}${p}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      });

      // Fetch polls from all projects
      for (const projectId of projectIds) {
        try {
          const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/polls`);
          if (response.ok) {
            const data: any = await response.json();
            if (data.documents) {
              data.documents.forEach((doc: any) => {
                const slug = doc.fields?.slug?.stringValue;
                if (slug) {
                  xml += `  <url>\n    <loc>${baseUrl}/poll/${slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
                }
              });
            }
          }
        } catch (e) {
          console.error(`Error fetching polls for sitemap from ${projectId}:`, e);
        }
      }

      xml += `</urlset>`;
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error("Sitemap error:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // API or Meta injection logic
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Check if it's a social bot crawler
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /Twitterbot|facebookexternalhit|Facebot|WhatsApp|TelegramBot|Slackbot|Discordbot/i.test(userAgent);

    if (!isBot) {
        if (process.env.NODE_ENV !== "production") {
            return next(); // Let Vite handle it
        } else {
            return res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
        }
    }

    // SSR Meta Injection for bots
    try {
      let template = fs.readFileSync(
        path.resolve(process.cwd(), process.env.NODE_ENV === "production" ? "dist/index.html" : "index.html"),
        "utf-8"
      );

      if (process.env.NODE_ENV !== "production" && vite) {
        template = await vite.transformIndexHtml(url, template);
      }

      // Default values (Uganda Votes)
      let title = "Uganda Votes | Professional Polling Platform";
      let description = "Secure, transparent, and accessible digital voting for Uganda.";
      let image = "https://images.unsplash.com/photo-1590402421685-822c23913b51?auto=format&fit=crop&q=80&w=1200";

      // Detect Poll/Candidate from URL
      // Pattern 1: ?page=home&poll=SLUG&candidate=ID
      // Pattern 2: /poll/SLUG or /poll/SLUG/candidate/ID
      const params = new URLSearchParams(url.split('?')[1]);
      let pollSlug = params.get('poll');
      let candidateId = params.get('candidate');

      // Check for clean URL patterns
      const pollMatch = url.match(/\/poll\/([^\/\?]+)/);
      if (pollMatch && !pollSlug) {
        pollSlug = pollMatch[1];
      }
      const candidateMatch = url.match(/\/poll\/[^\/]+\/candidate\/([^\/\?]+)/);
      if (candidateMatch && !candidateId) {
        candidateId = candidateMatch[1];
      }

      if (pollSlug) {
        try {
            const firebaseConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "firebase-applet-config.json"), "utf-8"));
            const projectId = firebaseConfig.projectId;
            
            // 1. Fetch Poll by Slug using query
            const pollQueryResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
                method: 'POST',
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: 'polls' }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: 'slug' },
                                op: 'EQUAL',
                                value: { stringValue: pollSlug }
                            }
                        },
                        limit: 1
                    }
                })
            });

            if (pollQueryResponse.ok) {
                const results: any = await pollQueryResponse.json();
                const pollDoc = results.find((r: any) => r.document)?.document;
                
                if (pollDoc) {
                    const fields = pollDoc.fields;
                    title = `${fields.title?.stringValue || 'Poll'} | Uganda Votes`;
                    description = fields.description?.stringValue || description;
                    image = fields.bannerURL?.stringValue || image;
                    
                    const pollId = pollDoc.name.split('/').pop();

                    // 2. Fetch Candidate details if requested
                    if (candidateId && pollId) {
                        const candResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/polls/${pollId}/candidates/${candidateId}`);
                        if (candResponse.ok) {
                            const candData: any = await candResponse.json();
                            const candFields = candData.fields;
                            if (candFields) {
                                const name = candFields.name?.stringValue || 'Candidate';
                                title = `${name} | Uganda Votes`;
                                description = `Vote for ${name} in the ${fields.title?.stringValue || 'Poll'}. ${candFields.slogan?.stringValue || ''}`;
                                image = candFields.photoURL?.stringValue || image;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Meta injection error", e);
        }
      }

      // Inject into template
      const metaTags = [
        { key: 'title', content: title },
        { key: 'og:title', content: title },
        { key: 'og:description', content: description },
        { key: 'og:image', content: image },
        { key: 'og:url', content: `https://${req.headers.host}${url}` },
        { key: 'twitter:title', content: title },
        { key: 'twitter:description', content: description },
        { key: 'twitter:image', content: image },
        { key: 'twitter:url', content: `https://${req.headers.host}${url}` },
        { key: 'twitter:card', content: 'summary_large_image' }
      ];

      metaTags.forEach(tag => {
        if (tag.key === 'title') {
            template = template.replace(/<title>.*?<\/title>/i, `<title>${tag.content}</title>`);
        } else {
            // Try to replace existing tags with either name or property
            const nameRegex = new RegExp(`<meta name="${tag.key}" content=".*?"\\s*\\/?>`, 'i');
            const propRegex = new RegExp(`<meta property="${tag.key}" content=".*?"\\s*\\/?>`, 'i');
            
            if (nameRegex.test(template)) {
                template = template.replace(nameRegex, `<meta name="${tag.key}" content="${tag.content}" />`);
            } else if (propRegex.test(template)) {
                template = template.replace(propRegex, `<meta property="${tag.key}" content="${tag.content}" />`);
            } else {
                // If not found, append to head
                template = template.replace('</head>', `  <meta property="${tag.key}" content="${tag.content}" />\n</head>`);
            }
        }
      });

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      if (process.env.NODE_ENV !== "production" && vite) {
        vite.ssrFixStacktrace(e);
      }
      console.error(e);
      res.status(500).end("Internal Server Error");
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
