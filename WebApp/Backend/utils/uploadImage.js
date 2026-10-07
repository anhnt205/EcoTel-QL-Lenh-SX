const { randomUUID } = require("crypto");
require("dotenv").config();
const AWS = require("aws-sdk");
const path = require("path"); // để lấy phần mở rộng file

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});

// Bản đồ phần mở rộng → content-type
const contentTypes = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
};

exports.getPresignedUrl = async (req, res) => {
  const { fileName, type } = req.query;

  const prefix = {
    checkin: "checkin/",
    avatar: "avatar/",
    signature: "signature/",
    document: "documents/",
  }[type];

  if (!prefix) {
    req.logger.error(`❌ Loại ${type} không hợp lệ.`);
    return res
      .status(400)
      .json({ status: "error", message: `❌ Loại ${type} không hợp lệ.` });
  }

  if (!fileName) {
    req.logger.error(`❌ Thiếu tên file ${fileName}`);
    return res
      .status(400)
      .json({ status: "error", message: `❌ Thiếu tên file ${fileName}` });
  }

  // Lấy phần mở rộng (ext không có dấu chấm)
  const ext = path.extname(fileName).slice(1).toLowerCase();
  if (!contentTypes[ext]) {
    req.logger.error(`❌ Loại file ${ext} không hỗ trợ.`);
    return res.status(400).json({
      status: "error",
      message: `❌ Loại file ${ext} không hỗ trợ.`,
    });
  }
  const contentType = contentTypes[ext];
  const safeName = `${Date.now()}-${randomUUID()}.${ext}`;
  const fileKey = `${prefix}${safeName}`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    Expires: 60 * 5, // URL sống 5 phút
  };

  try {
    const uploadURL = await s3.getSignedUrlPromise("putObject", params);
    res.json({
      status: "success",
      data: {
        uploadUrl: uploadURL,
        fileKey: fileKey,
        contentType: contentType,
      },
    });
  } catch (err) {
    req.logger.error("❌ Lỗi khi tạo URL", err);
    res.status(500).json({
      status: "error",
      message: `❌ Lỗi khi tạo URL ${err}`,
    });
  }
};

// Ký URL tải file từ S3 (dùng chung cho API /uploads/get và cho nơi xuất Excel trong backend, để
// xuất Excel không phải gọi HTTP vòng qua route đã yêu cầu đăng nhập).
exports.getSignedDownloadUrl = (key) =>
  s3.getSignedUrlPromise("getObject", {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Expires: 60 * 30,
  });

exports.getDownloadUrl = async (req, res) => {
  try {
    const { key } = req.query; // FE gửi key = "checkin/abc.webp"
    if (!key) {
      req.logger.error(`❌ Thiếu key ${key}`);
      return res
        .status(400)
        .json({ status: "error", message: `❌ Thiếu key ${key}` });
    }

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Expires: 60 * 30, // 5 phút
    };

    const downloadURL = await s3.getSignedUrlPromise("getObject", params);
    res.json({
      status: "success",
      data: downloadURL,
    });
  } catch (err) {
    req.logger.error("❌ Lỗi khi tạo URL", err);
    res.status(500).json({
      status: "error",
      message: `❌ Lỗi khi tạo URL ${err}`,
    });
  }
};
