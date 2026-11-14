import type React from "react";
import { Box, Typography } from "@mui/material";
import { darken, lighten } from "@mui/material/styles";

// Banner đầu trang (màn rộng) theo ảnh mẫu của người dùng: nền xanh, huy hiệu + tên công ty
// + tên hệ thống + điện thoại/fax bên trái, ảnh toà nhà bên phải mờ dần vào nền xanh, vạch
// vàng dưới chân. Logo, tên hệ thống, tên công ty và màu lấy từ Hệ thống > Cấu hình giao
// diện (BrandingProvider) như trước; chỉ điện thoại/fax là cố định ở đây.
//
// Kích thước theo chiều rộng màn hình (vw) để banner giữ đúng tỉ lệ ảnh mẫu từ ~1000px
// tới màn rất rộng; có chặn trên/dưới để chữ không quá nhỏ/lớn.

export const HEADER_CONTACT = "Điện thoại: 024.35180141   |   Fax: 024.38510724";
export const HEADER_BUILDING_IMAGE = "/image/header-building.png";
/** Ảnh nền banner bản gọn (từ file thiết kế 2026-11-09). */
export const HEADER_ART_IMAGE = "/image/header-art.png";
const GOLD = "#f2b705";
// Xanh của ảnh mẫu; dùng khi chưa tuỳ chỉnh màu chủ đạo.
const DEFAULT_GRADIENT = "linear-gradient(100deg, #0a3a98 0%, #1458c8 48%, #2f82e6 100%)";

interface Props {
  logoUrl: string;
  hasCustomLogo: boolean;
  title: string;
  companyName: string;
  /** màu nền Header theo màu chủ đạo (đã tính sẵn) */
  baseColor: string;
  hasCustomColor: boolean;
  textColor: string;
  /** Bản gọn theo thiết kế mới (2026-11-09): thấp hơn, không dòng điện thoại/fax, không vạch vàng; kèm `rightSlot` (chuông + tài khoản). */
  compact?: boolean;
  rightSlot?: React.ReactNode;
}

const HeaderBanner = ({
  logoUrl,
  hasCustomLogo,
  title,
  companyName,
  baseColor,
  hasCustomColor,
  textColor,
  compact = false,
  rightSlot,
}: Props) => {
  const background = hasCustomColor
    ? `linear-gradient(100deg, ${darken(baseColor, 0.22)} 0%, ${baseColor} 52%, ${lighten(baseColor, 0.18)} 100%)`
    : DEFAULT_GRADIENT;

  // Bản gọn theo THIẾT KẾ (file thiết kế chủ dự án giao 2026-11-09): cao 102px, nền xanh chuyển sắc + ảnh mỏ bên phải
  // mờ dần, vạch xanh sáng dưới chân; trái = huy hiệu 76px + tên công ty + tên hệ thống; phải = chuông + tài khoản.
  if (compact) {
    return (
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          height: 102,
          background: hasCustomColor ? background : "linear-gradient(112deg,#07357e 0%,#1055bb 49%,#0a367b 100%)",
          color: textColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pl: "64px",
          pr: "32px",
          borderBottom: "2px solid #3c8cfc",
          fontFamily: "Arial, Helvetica, sans-serif",
          "&::after": {
            content: '""',
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "54%",
            background: `linear-gradient(90deg,#1055bb 0%,rgba(16,85,187,.08) 32%,rgba(5,36,87,.12) 82%,#07357e 100%),url(${HEADER_ART_IMAGE}) center center/cover no-repeat`,
            opacity: 0.94,
            pointerEvents: "none",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "22px", position: "relative", zIndex: 1, minWidth: 0 }}>
          <Box
            component="img"
            src={logoUrl}
            alt="logo"
            sx={{
              width: 76,
              height: 76,
              objectFit: "cover",
              borderRadius: hasCustomLogo ? "10px" : "50%",
              boxShadow: "0 2px 8px #00245a55",
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontSize: 15, letterSpacing: "1.4px", fontWeight: 700, mb: "6px", color: "#e8f3ff", textTransform: "uppercase" }}>
              {companyName}
            </Box>
            <Box
              component="h1"
              sx={{
                m: 0,
                fontSize: 25,
                lineHeight: 1.18,
                letterSpacing: ".2px",
                fontWeight: 800,
                maxWidth: 630,
                textShadow: "0 1px 3px #00245744",
                textTransform: "uppercase",
              }}
            >
              {title}
            </Box>
          </Box>
        </Box>
        {rightSlot && (
          <Box sx={{ display: "flex", alignItems: "center", gap: "19px", position: "relative", zIndex: 2 }}>{rightSlot}</Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        height: compact ? "clamp(84px, 6.6vw, 104px)" : "clamp(112px, 12.5vw, 180px)",
        color: textColor,
        background,
        borderBottom: compact ? "none" : `3px solid ${GOLD}`,
      }}
    >
      {/* Ảnh toà nhà: mờ dần từ trái sang phải để hoà vào nền xanh */}
      <Box
        component="img"
        src={HEADER_BUILDING_IMAGE}
        alt=""
        aria-hidden
        sx={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "54%",
          objectFit: "cover",
          objectPosition: "left center",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 42%)",
          maskImage: "linear-gradient(to right, transparent 0%, #000 42%)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "relative",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "2.4vw",
          px: "3.6%",
        }}
      >
        <Box
          component="img"
          src={logoUrl}
          alt="logo"
          sx={{
            height: "70%",
            aspectRatio: "1 / 1",
            objectFit: "contain",
            flexShrink: 0,
            // logo mặc định là huy hiệu tròn; logo tuỳ chỉnh có thể chữ nhật nên không cắt tròn
            borderRadius: hasCustomLogo ? "8px" : "50%",
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: compact ? "clamp(10px, 0.95vw, 14px)" : "clamp(10px, 1.2vw, 18px)",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.95,
            }}
          >
            {companyName}
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontSize: compact ? "clamp(15px, 1.75vw, 28px)" : "clamp(15px, 2.4vw, 38px)",
              fontWeight: 800,
              lineHeight: 1.16,
              textTransform: "uppercase",
              mt: "0.4vw",
              maxWidth: "46vw",
              textShadow: "0 1px 6px rgba(0,0,0,.25)",
            }}
          >
            {title}
          </Typography>
          {!compact && (
          <Typography
            sx={{
              fontSize: "clamp(10px, 1vw, 16px)",
              mt: "0.7vw",
              opacity: 0.95,
              whiteSpace: "pre",
            }}
          >
            {HEADER_CONTACT}
          </Typography>
          )}
        </Box>
      </Box>
      {/* Chuông thông báo + tài khoản (thiết kế mới): góc phải banner */}
      {rightSlot && (
        <Box
          sx={{
            position: "absolute",
            right: "2%",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          {rightSlot}
        </Box>
      )}
    </Box>
  );
};

export default HeaderBanner;
