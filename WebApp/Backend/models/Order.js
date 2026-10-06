const mongoose = require("mongoose");
const { STATUS_ORDERS, STATUS_ORDER } = require("../config/config");

const orderSchema = new mongoose.Schema(
  {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    workingDate: {
      type: Date,
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
    },
    shiftHour: {
      type: String,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    resumeTime: {
      type: Date,
    },
    device: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],
    assignedVehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],
    repairVehicles: [
      {
        device: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Device",
        },
        note: String,
      },
    ],
    repairDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    excavator: [
      {
        device: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Device",
        },
        status: {
          type: Boolean,
          default: true,
        },
      },
    ],
    location: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
      },
    ],
    material: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
      },
    ],
    workContent: {
      type: String,
    },
    assistants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    status: {
      type: String,
      enum: STATUS_ORDERS,
      default: STATUS_ORDER.PENDING,
    },
    previous_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    note: {
      type: String,
    },
    risk: {
      type: String,
    },
    cancel: {
      type: Boolean,
      default: false,
    },
    temporaryError: {
      type: String,
    },
    safetyMeasure: {
      type: String,
    },
    safetyMeasureSpecific: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    batchId: { type: String, index: true, default: null },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Bản chụp ("chốt") thông tin tham chiếu của lệnh khi hoàn thành: đơn vị, nhân viên, thiết bị, công việc...
    // Lệnh đã chốt luôn hiển thị theo bản chụp này, không đổi theo dữ liệu gốc về sau (xem services/orderSnapshot.js).
    frozen: {
      at: { type: Date }, // thời điểm chốt
      editedAt: { type: Date }, // lần admin sửa lệnh đã chốt gần nhất (nếu có)
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      // completion = chốt đúng lúc hoàn thành; sweep = bù do bộ quét; history / creation / user-history / backfill = khôi phục cho lệnh cũ
      source: {
        type: String,
        enum: ["completion", "sweep", "history", "creation", "user-history", "backfill"],
      },
      data: { type: mongoose.Schema.Types.Mixed },
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
orderSchema.index({ device: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ job: 1 });
orderSchema.index({ department: 1 });
orderSchema.index({ workingDate: 1 });
orderSchema.index({ shift: 1 });
orderSchema.index({ status: 1, "frozen.at": 1 }); // tìm lệnh hoàn thành chưa chốt (bộ quét / khôi phục)

orderSchema.virtual("shiftReport", {
  ref: "ShiftReport", // Model cần populate
  localField: "_id", // Trường ở Order
  foreignField: "orderId", // Trường ở ShiftReport
  justOne: true, // Vì mỗi Order chỉ có 1 ShiftReport
});
orderSchema.set("toObject", { virtuals: true });
orderSchema.set("toJSON", { virtuals: true });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
