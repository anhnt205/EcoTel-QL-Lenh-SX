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
}

const HeaderBanner = ({
  logoUrl,
  hasCustomLogo,
  title,
  companyName,
  baseColor,
  hasCustomColor,
  textColor,
}: Props) => {
  const background = hasCustomColor
    ? `linear-gradient(100deg, ${darken(baseColor, 0.22)} 0%, ${baseColor} 52%, ${lighten(baseColor, 0.18)} 100%)`
    : DEFAULT_GRADIENT;

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "clamp(112px, 12.5vw, 180px)",
        color: textColor,
        background,
        borderBottom: `3px solid ${GOLD}`,
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
              fontSize: "clamp(10px, 1.2vw, 18px)",
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
              fontSize: "clamp(15px, 2.4vw, 38px)",
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
        </Box>
      </Box>
    </Box>
  );
};

export default HeaderBanner;
