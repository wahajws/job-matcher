import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./routes/auth.js";
import candidateRoutes from "./routes/candidates.js";
import cvRoutes from "./routes/cv.js";
import jobRoutes from "./routes/jobs.js";
import matchRoutes from "./routes/matches.js";
import noteRoutes from "./routes/notes.js";
import tagRoutes from "./routes/tags.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportRoutes from "./routes/reports.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register all API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/candidates", candidateRoutes);
  app.use("/api/cv", cvRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/matches", matchRoutes);
  app.use("/api/candidates", noteRoutes); // Notes are under candidates
  app.use("/api/candidates", tagRoutes); // Tags are under candidates
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api", reportRoutes); // Reports routes

  return httpServer;
}
