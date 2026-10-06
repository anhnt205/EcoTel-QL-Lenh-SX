const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");
const dotenv = require("dotenv");
const { connectDB } = require("./config/db.config");
const { logger } = require("./utils/logger");
const os = require("os");
const diskusage = require("diskusage");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const departmentRoutes = require("./routes/department.routes");
const deviceRoutes = require("./routes/device.routes");
const orderRoutes = require("./routes/order.routes");
const reportRoutes = require("./routes/report.routes");
const notificationRoutes = require("./routes/notification.routes");
const materialRoutes = require("./routes/material.routes");
const locationRoutes = require("./routes/location.routes");
const jobRoutes = require("./routes/job.routes");
const positionRoutes = require("./routes/position.routes");
const deviceTypeRoutes = require("./routes/deviceType.routes");
const historyRoutes = require("./routes/history.routes");
const ShiftReportRoutes = require("./routes/shiftReport.routes");
const CheckInRoutes = require("./routes/checkIn.routes");
const SafetyMeasureRoutes = require("./routes/safetyMeasure.routes");
const UploadRoutes = require("./routes/upload.routes");
const ExportRoutes = require("./routes/export.routes");
const ShiftRoutes = require("./routes/shift.routes");
const ReportHistoryRoutes = require("./routes/reportHistory.routes");
const TravelLogRoutes = require("./routes/travelLog.routes");
const DeviceModelRoutes = require("./routes/deviceModel.routes");
const ModelRoutes = require("./routes/model.routes");
const AnalysicRoutes = require("./routes/analysic.routes");
const SettingRoutes = require("./routes/setting.routes");

require("./utils/cron");

// Load environment variables
dotenv.config();
require("./data-seeder/seed");

// Create Express app
const app = express();
const httpServer = createServer(app);

// Create Socket.IO instance
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
});

// Make io accessible globally
global.io = io;
io.on("connection", (socket) => {
  console.log(`🟢 Socket connected: ${socket.id}`);

  // Nhận sự kiện từ client để join room theo userId
  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`🔗 User ${userId} joined room`);
  });

  // Nếu cần, bạn có thể lắng nghe thêm sự kiện khác tại đây

  socket.on("disconnect", () => {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// app.use(morgan('dev'));

app.set("trust proxy", 1);
// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use("/api", limiter);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Production Order Management API",
      version: "1.0.0",
      description: "API documentation for Production Order Management System",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8080}`,
      },
    ],
  },
  apis: ["./routes/*.js"],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use((req, res, next) => {
  req.logger = logger.child({
    api: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  next();
});
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/devicetypes", deviceTypeRoutes);
app.use("/api/histories", historyRoutes);
app.use("/api/shiftReports", ShiftReportRoutes);
app.use("/api/checkIns", CheckInRoutes);
app.use("/api/safetyMeasures", SafetyMeasureRoutes);
app.use("/api/uploads", UploadRoutes);
app.use("/api/exports", ExportRoutes);
app.use("/api/shifts", ShiftRoutes);
app.use("/api/reporthistories", ReportHistoryRoutes);
app.use("/api/travellogs", TravelLogRoutes);
app.use("/api/devicemodels", DeviceModelRoutes);
app.use("/api/models", ModelRoutes);
app.use("/api/analysics", AnalysicRoutes);
app.use("/api/settings", SettingRoutes);

let lastCpuInfo = os.cpus();

function getCpuUsage() {
  const cpus = os.cpus();

  const usage = cpus.map((cpu, i) => {
    const prev = lastCpuInfo[i];

    const prevTotal = Object.values(prev.times).reduce((a, b) => a + b, 0);
    const currTotal = Object.values(cpu.times).reduce((a, b) => a + b, 0);

    const totalDiff = currTotal - prevTotal;
    const idleDiff = cpu.times.idle - prev.times.idle;

    const used = totalDiff - idleDiff;
    const percent = totalDiff > 0 ? (used / totalDiff) * 100 : 0;

    return Math.round(percent);
  });

  lastCpuInfo = cpus;
  return usage;
}
app.get("/api/system-info", async (req, res) => {
  const disk = await diskusage.check("/");
  res.json({
    cpu: getCpuUsage(),
    ram: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    disk: {
      total: disk.total,
      free: disk.free,
    },
  });
});

app.use((req, res, next) => {
  logger.warn(`API '${req.originalUrl}' not found`);
  res.status(404).json({
    status: "error",
    message: `API '${req.originalUrl}' not found`,
  });
});
// Error handling middleware
app.use((err, req, res, next) => {
  logger.warn(`API '${req.originalUrl}' error: ${err.message}`);
  res.status(500).json({
    status: "error",
    message: err.message || "Internal Server Error",
    error: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
