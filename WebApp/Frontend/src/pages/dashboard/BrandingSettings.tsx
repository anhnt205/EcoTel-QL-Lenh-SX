import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, darken } from "@mui/material/styles";
import {
  CloudUpload as CloudUploadIcon,
  RestartAlt as RestartAltIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
} from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import BrandingService, { BrandingPayload, BrandingRaw } from "../../services/brandingService";
import {
  DEFAULT_COMPANY,
  DEFAULT_HEADER_TITLE,
  DEFAULT_LOGO,
  DEFAULT_PRIMARY,
  brandAccent,
  brandNavy,
  useBranding,
} from "../../branding/BrandingProvider";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "../../components/Alert";

const LINE = "#e5e9f0";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_DIM = 256; // ảnh được thu nhỏ về tối đa 256px mỗi chiều trước khi lưu
const MAX_LOGO_CHARS = 900000; // thấp hơn giới hạn 1.000.000 ký tự của máy chủ
const MAX_SOFTWARE_NAME = 120;
const MAX_COMPANY_NAME = 160;

const PRESET_COLORS: { name: string; value: string }[] = [
  { name: "Xanh dương (mặc định)", value: DEFAULT_PRIMARY },
  { name: "Xanh navy", value: "#0d47a1" },
  { name: "Xanh ngọc", value: "#00897b" },
  { name: "Xanh lá", value: "#2e7d32" },
  { name: "Cam", value: "#ef6c00" },
  { name: "Đỏ", value: "#c62828" },
  { name: "Tím", value: "#6a1b9a" },
  { name: "Xám xanh", value: "#455a64" },
];

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không đọc được tệp ảnh"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Tệp không phải ảnh hợp lệ"));
    img.src = src;
  });

/** Đọc tệp ảnh logo -> data URL đã thu nhỏ (PNG giữ nền trong suốt). SVG giữ nguyên nhưng giới hạn dung lượng. */
const fileToLogoDataUrl = async (file: File): Promise<string> => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Chỉ nhận ảnh PNG, JPG, WEBP, GIF hoặc SVG");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Ảnh quá lớn (tối đa 5 MB)");
  }
  const dataUrl = await readAsDataUrl(file);
  if (file.type === "image/svg+xml") {
    if (dataUrl.length > 300000) throw new Error("Ảnh SVG quá lớn (tối đa khoảng 200 KB)");
    return dataUrl;
  }
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_LOGO_DIM / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không xử lý được ảnh");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL("image/png");
  if (out.length > MAX_LOGO_CHARS) throw new Error("Ảnh còn quá nặng sau khi thu nhỏ, vui lòng chọn ảnh đơn giản hơn");
  return out;
};

const errorMessage = (e: any) => e?.response?.data?.message || e?.message || "Đã xảy ra lỗi";

// Nền ô xem logo: ô vuông xám để thấy rõ phần trong suốt
const checker = {
  backgroundImage:
    "linear-gradient(45deg,#e8eaee 25%,transparent 25%),linear-gradient(-45deg,#e8eaee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e8eaee 75%),linear-gradient(-45deg,transparent 75%,#e8eaee 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
} as const;

export default function BrandingSettings() {
  const queryClient = useQueryClient();
  const saved = useBranding();

  // Bản nháp đang sửa. logo: undefined = chưa đổi (dùng logo đã lưu); null = về logo mặc định; chuỗi = ảnh mới.
  const [softwareName, setSoftwareName] = useState(saved.softwareName);
  const [companyName, setCompanyName] = useState(saved.raw.companyName);
  const [primaryColor, setPrimaryColor] = useState(saved.primaryColor);
  const [logo, setLogo] = useState<string | null | undefined>(undefined);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Nạp lại bản nháp khi cấu hình đã lưu đổi (lưu xong, khôi phục, hoặc dữ liệu tải về muộn)
  useEffect(() => {
    setSoftwareName(saved.softwareName);
    setCompanyName(saved.raw.companyName);
    setPrimaryColor(saved.primaryColor);
    setLogo(undefined);
  }, [saved.softwareName, saved.raw.companyName, saved.primaryColor, saved.raw.hasLogo, saved.raw.logoVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorValid = HEX_RE.test(primaryColor);
  const previewLogo = logo === undefined ? saved.logoUrl : logo === null ? DEFAULT_LOGO : logo;
  const previewColor = colorValid ? primaryColor : saved.primaryColor;
  // Giống hệt cách Header thật tô màu (màu mặc định giữ đúng sắc đã duyệt)
  const previewAccent = useMemo(() => brandAccent(previewColor), [previewColor]);
  const previewNavy = useMemo(() => brandNavy(previewColor), [previewColor]);
  const hasCustomPreviewLogo = logo === undefined ? saved.hasCustomLogo : logo !== null;

  const dirty =
    softwareName.trim() !== saved.softwareName ||
    companyName.trim() !== saved.raw.companyName ||
    primaryColor.toLowerCase() !== saved.primaryColor.toLowerCase() ||
    logo !== undefined;

  const nameTooLong = softwareName.length > MAX_SOFTWARE_NAME;
  const companyTooLong = companyName.length > MAX_COMPANY_NAME;
  const canSave = dirty && colorValid && !nameTooLong && !companyTooLong && !processing;

  const saveMutation = useMutation({
    mutationFn: (payload: BrandingPayload) => BrandingService.save(payload),
    onSuccess: (data: BrandingRaw) => {
      queryClient.setQueryData(["branding"], data);
      showSuccessAlert("Đã lưu cấu hình giao diện");
    },
    onError: (e: any) => showErrorAlert(errorMessage(e)),
  });

  const resetMutation = useMutation({
    mutationFn: () => BrandingService.reset(),
    onSuccess: (data: BrandingRaw) => {
      queryClient.setQueryData(["branding"], data);
      showSuccessAlert("Đã khôi phục giao diện mặc định");
    },
    onError: (e: any) => showErrorAlert(errorMessage(e)),
  });

  const handleSave = () => {
    const payload: BrandingPayload = {
      softwareName: softwareName.trim(),
      companyName: companyName.trim(),
      // màu trùng màu mặc định thì lưu rỗng (= theo mặc định của ứng dụng)
      primaryColor: primaryColor.toLowerCase() === DEFAULT_PRIMARY ? "" : primaryColor.toLowerCase(),
    };
    if (logo !== undefined) payload.logo = logo; // chỉ gửi logo khi có đổi
    saveMutation.mutate(payload);
  };

  const handleReset = async () => {
    const result = await showConfirmAlert(
      "Khôi phục logo, tên phần mềm, tên công ty và màu chủ đạo về mặc định? Mọi người dùng sẽ thấy giao diện mặc định.",
    );
    if (result.isConfirmed) resetMutation.mutate();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại đúng tệp đó lần sau
    if (!file) return;
    setProcessing(true);
    try {
      setLogo(await fileToLogoDataUrl(file));
    } catch (err: any) {
      showErrorAlert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const busy = saveMutation.isPending || resetMutation.isPending;

  return (
    <Box p={3} sx={{ bgcolor: "#f4f6f8", minHeight: "100vh" }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 1, color: "#1a2027" }}>
        Cấu hình giao diện
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Đổi logo, tên phần mềm, tên công ty và màu chủ đạo. Thay đổi áp dụng cho mọi người dùng sau khi bấm "Lưu thay đổi".
      </Typography>
      {busy && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* Biểu mẫu */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Thông tin thương hiệu
            </Typography>

            {/* Logo */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Logo
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 0.5 }}>
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 2,
                  border: `1px solid ${LINE}`,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                  ...checker,
                }}
              >
                <img
                  src={previewLogo}
                  alt="Logo hiện tại"
                  style={{ maxWidth: 88, maxHeight: 88, objectFit: "contain" }}
                />
              </Box>
              <Box sx={{ display: "grid", gap: 1 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFile}
                  hidden
                />
                <Button
                  variant="contained"
                  startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
                  onClick={() => fileRef.current?.click()}
                  disabled={processing || busy}
                >
                  Chọn ảnh logo
                </Button>
                <Button
                  size="small"
                  onClick={() => setLogo(null)}
                  disabled={busy || (logo === null || (logo === undefined && !saved.hasCustomLogo))}
                >
                  Dùng logo mặc định
                </Button>
              </Box>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 2.5 }}>
              Ảnh PNG, JPG, WEBP, GIF hoặc SVG (tối đa 5 MB); ảnh sẽ được thu nhỏ về tối đa 256 px. Nên dùng ảnh vuông, nền trong suốt.
            </Typography>

            {/* Tên */}
            <TextField
              fullWidth
              label="Tên phần mềm"
              value={softwareName}
              onChange={(e) => setSoftwareName(e.target.value)}
              placeholder={DEFAULT_HEADER_TITLE}
              error={nameTooLong}
              helperText={
                nameTooLong
                  ? `Tối đa ${MAX_SOFTWARE_NAME} ký tự`
                  : "Hiện ở thanh đầu trang, trang đăng nhập và tiêu đề tab trình duyệt. Để trống = dùng tên mặc định."
              }
              sx={{ mb: 2.5 }}
            />
            <TextField
              fullWidth
              label="Tên công ty"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={DEFAULT_COMPANY}
              error={companyTooLong}
              helperText={
                companyTooLong
                  ? `Tối đa ${MAX_COMPANY_NAME} ký tự`
                  : "Hiện ở thanh đầu trang. Để trống = dùng tên mặc định. (Các biểu mẫu báo cáo in vẫn giữ tiêu đề riêng của mẫu.)"
              }
              sx={{ mb: 2.5 }}
            />

            {/* Màu chủ đạo */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Màu chủ đạo
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
              <Box
                component="input"
                type="color"
                aria-label="Chọn màu chủ đạo"
                value={colorValid ? primaryColor : saved.primaryColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value)}
                sx={{ width: 52, height: 40, p: 0, border: `1px solid ${LINE}`, borderRadius: 1, bgcolor: "#fff", cursor: "pointer" }}
              />
              <TextField
                size="small"
                label="Mã màu"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.trim())}
                error={!colorValid}
                helperText={colorValid ? " " : "Dạng #RRGGBB, ví dụ #1976d2"}
                sx={{ width: 150 }}
                inputProps={{ maxLength: 7 }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {PRESET_COLORS.map((c) => {
                const active = primaryColor.toLowerCase() === c.value.toLowerCase();
                return (
                  <Tooltip key={c.value} title={c.name} placement="top">
                    <Box
                      component="button"
                      type="button"
                      aria-label={c.name}
                      aria-pressed={active}
                      onClick={() => setPrimaryColor(c.value)}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: c.value,
                        cursor: "pointer",
                        border: active ? "3px solid #fff" : "2px solid #fff",
                        boxShadow: active ? `0 0 0 2px ${c.value}` : "0 0 0 1px #cbd5e1",
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
              Dùng cho nút, tab đang chọn, biểu đồ và nền thanh đầu trang (tự làm đậm hơn).
            </Typography>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!canSave || busy}>
                Lưu thay đổi
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<UndoIcon />}
                onClick={() => {
                  setSoftwareName(saved.softwareName);
                  setCompanyName(saved.raw.companyName);
                  setPrimaryColor(saved.primaryColor);
                  setLogo(undefined);
                }}
                disabled={!dirty || busy}
              >
                Hủy thay đổi
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                color="error"
                startIcon={<RestartAltIcon />}
                onClick={handleReset}
                disabled={busy}
              >
                Khôi phục mặc định
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Xem trước trực tiếp (chỉ trong khung này, chưa áp dụng cho cả ứng dụng) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
              Xem trước
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Cập nhật ngay khi bạn sửa; chỉ áp dụng cho mọi người sau khi lưu.
            </Typography>

            {dirty && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Có thay đổi chưa lưu.
              </Alert>
            )}

            {/* Thanh đầu trang */}
            <Box sx={{ borderRadius: 2, overflow: "hidden", border: `1px solid ${LINE}`, fontFamily: '"Inter","Segoe UI",Roboto,Arial,sans-serif' }}>
              <Box sx={{ bgcolor: previewNavy, color: "#fff", display: "flex", alignItems: "center", gap: 1.5, px: 2, minHeight: 56 }}>
                <img
                  src={previewLogo}
                  alt=""
                  style={{
                    width: 36,
                    height: 36,
                    objectFit: "contain",
                    borderRadius: hasCustomPreviewLogo ? 6 : "50%",
                  }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25, fontFamily: "inherit" }}>
                    {softwareName.trim() || DEFAULT_HEADER_TITLE}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 11.5, color: "rgba(255,255,255,.82)", lineHeight: 1.3, fontFamily: "inherit" }}>
                    {companyName.trim() || DEFAULT_COMPANY}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ bgcolor: "#fff", display: "flex", borderBottom: `1px solid ${LINE}` }}>
                {["Tổng quan", "Lệnh sản xuất", "Báo cáo"].map((t, i) => (
                  <Box
                    key={t}
                    sx={{
                      px: 2,
                      py: 1.25,
                      fontSize: 13.5,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      color: i === 1 ? previewAccent : "#334155",
                      bgcolor: i === 1 ? alpha(previewAccent, 0.1) : "transparent",
                      borderBottom: `3px solid ${i === 1 ? previewAccent : "transparent"}`,
                    }}
                  >
                    {t}
                  </Box>
                ))}
              </Box>

              {/* Mẫu thành phần dùng màu chủ đạo */}
              <Box sx={{ p: 2, bgcolor: "#f7f8fa", display: "grid", gap: 1.5 }}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  <Box
                    sx={{ px: 1.75, py: 0.75, borderRadius: "10px", bgcolor: previewAccent, color: "#fff", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}
                  >
                    + Tạo lệnh
                  </Box>
                  <Box
                    sx={{ px: 1.75, py: 0.75, borderRadius: "10px", border: `1px solid ${previewAccent}`, color: previewAccent, fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}
                  >
                    Xuất Excel
                  </Box>
                  <Box
                    sx={{ px: 1.25, py: 0.5, borderRadius: "999px", bgcolor: alpha(previewAccent, 0.12), color: previewAccent, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit" }}
                  >
                    Tất cả · 24
                  </Box>
                </Box>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: alpha(previewAccent, 0.15), overflow: "hidden" }}>
                  <Box sx={{ width: "62%", height: "100%", bgcolor: previewAccent }} />
                </Box>
              </Box>
            </Box>

            {/* Mẫu thanh trên của trang đăng nhập */}
            <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 2, mb: 0.75 }}>
              Trang đăng nhập
            </Typography>
            <Box
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                border: `1px solid ${LINE}`,
                bgcolor: "#e9edf3",
              }}
            >
              <Box
                sx={{
                  bgcolor: previewColor.toLowerCase() === DEFAULT_PRIMARY ? "#035bb4" : darken(previewColor, 0.1),
                  color: "#fff",
                  py: 1,
                  px: 2,
                  textAlign: "center",
                  fontSize: 12.5,
                  fontWeight: 800,
                  fontFamily: "inherit",
                }}
              >
                {softwareName.trim() || "HỆ THỐNG QUẢN LÝ ĐIỀU PHỐI VÀ SỬ DỤNG MÁY MÓC THIẾT BỊ"}
              </Box>
              <Box sx={{ py: 2, display: "grid", placeItems: "center" }}>
                <Box sx={{ bgcolor: "#fff", borderRadius: 1.5, p: 1.5, boxShadow: "0 2px 8px rgba(0,0,0,.12)", display: "grid", placeItems: "center", gap: 0.5 }}>
                  <img src={previewLogo} alt="" style={{ width: 56, height: 56, objectFit: "contain" }} />
                  <Box sx={{ width: 120, height: 6, borderRadius: 3, bgcolor: "#e2e8f0" }} />
                  <Box sx={{ width: 120, height: 6, borderRadius: 3, bgcolor: "#e2e8f0" }} />
                  <Box sx={{ width: 120, height: 14, borderRadius: 1, bgcolor: previewAccent }} />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
