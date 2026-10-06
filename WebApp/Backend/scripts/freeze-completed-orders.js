// Khôi phục / chốt thông tin cho MỌI lệnh đã hoàn thành mà chưa có bản chụp (lệnh cũ, trước khi có tính năng chốt),
// rồi chốt các báo chuyến (Report) của chúng và bản chụp thiết bị trong báo cáo ca.
//
// Lệnh — nguồn dữ liệu theo thứ tự ưu tiên (xem services/orderFreeze.js):
//   history      bản chụp History ghi đúng lúc lệnh hoàn thành (chính xác nhất)
//   creation     đơn vị đã lưu trên lệnh lúc tạo (order.department)
//   user-history đơn vị của nhân viên tại ngày làm việc, suy từ lịch sử đổi đơn vị
//   backfill     chụp dữ liệu HIỆN TẠI (có thể đã lệch nếu thông tin gốc từng đổi) — chỉ khi không còn nguồn nào
// Báo chuyến:
//   order        lấy từ bản chụp của chính lệnh (xe, máy xúc, địa điểm, vật liệu có trong lệnh)
//   backfill     chụp dữ liệu hiện tại cho tham chiếu không có trong lệnh
//
// Chạy (trong thư mục Backend, cần MONGODB_URI): idempotent, chạy lại được.
//   node scripts/freeze-completed-orders.js --dry-run     chỉ đếm, không ghi
//   node scripts/freeze-completed-orders.js               chốt thật
//   node scripts/freeze-completed-orders.js --limit=500   chốt tối đa 500 mục mỗi giai đoạn mỗi lần
// Trong container:  docker exec <container-backend> node scripts/freeze-completed-orders.js --dry-run

const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const { backfillFrozen, backfillReportsFrozen, backfillShiftDevices } = require("../services/orderFreeze");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) || 0 : 0;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Kết nối MongoDB xong. ${dryRun ? "[DRY-RUN — không ghi]" : "[GHI THẬT]"} limit=${limit || "không giới hạn"}`);
    const progress = (label) => (s) => console.log(`  [${label}] đã quét ${s.scanned}, đã chốt ${s.frozen}`);
    const orders = await backfillFrozen({ limit, dryRun, onProgress: progress("lệnh") });
    const reports = await backfillReportsFrozen({ limit, dryRun, onProgress: progress("chuyến") });
    const shiftDevices = await backfillShiftDevices({ limit, dryRun });
    console.log("Kết quả:", JSON.stringify({ orders, reports, shiftDevices }, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Lỗi:", err);
    process.exit(1);
  }
})();
