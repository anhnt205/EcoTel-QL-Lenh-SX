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
const CatalogSyncRoutes = require("./routes/catalogSync.routes");
const PermissionRoutes = require("./routes/permission.routes");
const { enforceWrites, enforceRead, permissionFieldsGuard } = require("./middleware/permission");
const {
  lockCatalogWrites,
  lockDeviceCatalogWrites,
  lockMaterialCatalogWrites,
  lockLocationCatalogWrites,
} = require("./middleware/catalogLock");

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
// Danh mục do Thống kê quản lý (loại thiết bị, ca; Phòng ban/Chức vụ do Điều phối quản lý hẳn): chỉ có tác dụng khi CATALOG_MASTER=thongke
// (xem middleware/catalogLock.js). Phải đứng TRƯỚC các router bên dưới.
app.use(
  ["/api/devicetypes", "/api/devicemodels", "/api/shifts"],
  lockCatalogWrites,
);
app.use("/api/devices", lockDeviceCatalogWrites);
app.use("/api/materials", lockMaterialCatalogWrites);
app.use("/api/locations", lockLocationCatalogWrites);

// Phân quyền MỚI (Phòng ban -> Chức vụ -> Cán bộ): chỉ áp dụng cho người đã được cấu hình quyền; admin và người chưa
// cấu hình đi qua như cũ (xem middleware/permission.js). Chỉ chặn thao tác quản lý danh mục/hệ thống và xem Báo cáo;
// KHÔNG đụng Lệnh sản xuất / báo chuyến / check-in / trạng thái thiết bị (các API app Mobile dùng).
const skipExport = (req) => /\/exportFile\/?$/.test(req.path);
const usersManagementOnly = (req) =>
  !(
    (req.method === "POST" && /^\/importFile\/?$/.test(req.path)) ||
    (req.method === "PUT" && /^\/update\//.test(req.path)) ||
    (req.method === "DELETE" && /^\/?$/.test(req.path))
  );
app.use("/api/departments", enforceWrites("departments", "Phòng ban", { skip: skipExport }), permissionFieldsGuard("department"));
app.use("/api/positions", enforceWrites("positions", "Chức vụ", { skip: skipExport }), permissionFieldsGuard("position"));
app.use("/api/users", enforceWrites("users", "Cán bộ nhân viên", { skip: usersManagementOnly }), permissionFieldsGuard("user"));
app.use(
  "/api/auth",
  enforceWrites("users", "Cán bộ nhân viên", { skip: (req) => !(req.method === "POST" && req.path === "/register") }),
  permissionFieldsGuard("user"),
);
app.use("/api/jobs", enforceWrites("jobs", "Công việc", { skip: skipExport }));
app.use("/api/materials", enforceWrites("materials", "Vật liệu", { skip: skipExport }));
app.use("/api/locations", enforceWrites("locations", "Điểm đổ tải", { skip: skipExport }));
app.use("/api/safetyMeasures", enforceWrites("safety-measures", "Biện pháp an toàn", { skip: skipExport }));
app.use("/api/travellogs", enforceWrites("travel-logs", "Cung độ", { skip: skipExport }));
app.use("/api/models", enforceWrites("models", "Mô hình xe", { skip: skipExport }));
app.use("/api/settings", enforceWrites("system", "Hệ thống"));
app.use("/api/exports", enforceRead("reports", "Báo cáo"));


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
app.use("/api/catalog-sync", CatalogSyncRoutes);
app.use("/api/permissions", PermissionRoutes);

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
