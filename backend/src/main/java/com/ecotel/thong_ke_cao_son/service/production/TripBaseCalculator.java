package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.CoefficientItemRepository;
import com.ecotel.thong_ke_cao_son.service.DensityParameterService;
import com.ecotel.thong_ke_cao_son.service.MatrixCatalogService;
import com.ecotel.thong_ke_cao_son.service.SeamGroupExcavatorKeys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * LƯỢT 1 — tính các chỉ tiêu của từng chuyến, chưa áp hệ số trắc địa.
 *
 * <p>Công thức lấy từ dòng 5 sheet {@code tinh toan} (nguồn quyết định khi
 * docx và Excel lệch nhau), đã đối chiếu với docx dòng 301–320:
 *
 * <pre>
 * AJ (Mô hình)   = ROUND( số chuyến=0 ? 0
 *                        : (Mô hình tạm tính ≠ 0 ? tạm tính : tra lưới Mô hình)
 *                          × hệ số Roda , 3)
 * AI (Tỷ trọng)  = Tỷ trọng tạm tính ≠ 0 ? tạm tính : tra danh mục Tỷ trọng
 * AL (Tổng m3)   = Khối lượng qua cân > 0
 *                    ? Khối lượng qua cân / Tỷ trọng
 *                    : ROUND( ROUND(Mô hình, Nhóm CLH bắt đầu "D" ? 1 : 3) × Số chuyến
 *                             − (Phân loại = DAT ? Trừ vơi : 0) , 3)
 * AM (Tổng tấn)  = (Tổng m3 × Tỷ trọng − Đá thải − (Phân loại = THAN ? Trừ vơi : 0))
 *                  × (SPNT = than_sx ? hệ số Than tke trừ đá : 1)
 * AN (Tổng Tkm)  = Khối lượng qua cân ≠ 0 ? Khối lượng qua cân × Cung độ
 *                                          : ROUND(Tổng tấn × Cung độ, 4)
 * </pre>
 *
 * <p><b>Lưu ý về QĐ-02:</b> quyết định đó nói về cột <i>"Tổng KLVC Thống kê
 * (m3) ban đầu"</i>, là một cột KHÁC với {@code Tổng m3} ở đây. Ở
 * {@code Tổng m3}, Trừ vơi được trừ thẳng, không chia cho tỷ trọng — đúng
 * như công thức {@code AL5} của bảng tính thật.
 */
@Component
@RequiredArgsConstructor
public class TripBaseCalculator {

    /** Mã lưới Mô hình, khớp {@code backend/seed-matrix-catalogs.sql}. */
    private static final String MATRIX_MO_HINH = "MO_HINH";

    /** Mã hệ số nhân cho than sản xuất (docx dòng 315). */
    private static final String COEFFICIENT_THAN_SX = "HS.THAN.TRUDA";

    private static final BigDecimal TWO_THIRDS =
            new BigDecimal(2).divide(new BigDecimal(3), 10, RoundingMode.HALF_UP);

    private final DensityParameterService densityService;
    private final MatrixCatalogService matrixService;
    private final CoefficientItemRepository coefficientRepository;

    public TripBaseResult calculate(TransportReportTrip trip) {
        LocalDate date = productionDateOf(trip);
        CargoType cargoType = require(trip.getCargoType(), "Chủng loại hàng", trip);

        String acceptanceProduct = acceptanceProductOf(trip, cargoType);
        boolean coal = isCoal(acceptanceProduct);
        boolean earth = isEarth(acceptanceProduct);

        BigDecimal density = resolveDensity(trip, cargoType, date);
        BigDecimal model = resolveModel(trip, cargoType);

        BigDecimal tripCount = BigDecimal.valueOf(
                trip.getTripCount() != null ? trip.getTripCount() : 0);
        BigDecimal deduction = nz(trip.getDeductionAmount());
        BigDecimal wasteRock = nz(trip.getWasteRockTon());
        BigDecimal weighed = nz(trip.getWeighedWeightTon());

        BigDecimal totalM3 = computeTotalM3(trip, cargoType, model, tripCount, deduction, weighed, density, earth);
        BigDecimal totalTon = computeTotalTon(totalM3, density, wasteRock, deduction, coal, acceptanceProduct);
        BigDecimal totalTkm = computeTotalTkm(trip, weighed, totalTon);

        return TripBaseResult.builder()
                .trip(trip)
                .productionDate(date)
                .seamGroupExcavatorKey(buildKey(trip, cargoType, density))
                .acceptanceProduct(acceptanceProduct)
                .coal(coal)
                .density(density)
                .model(model)
                .totalM3(totalM3)
                .totalTon(totalTon)
                .totalTkm(totalTkm)
                .wasteRockTon(wasteRock)
                .build();
    }

    // ── từng bước ───────────────────────────────────────────────────────────

    /**
     * AJ5 — Mô hình (m3/chuyến).
     *
     * <p>Số chuyến bằng 0 thì Mô hình bằng 0 luôn, không tra lưới: tra lưới
     * lúc đó chỉ tổ ra lỗi "thiếu khai báo" cho một chuyến vốn không có gì
     * để tính.
     */
    private BigDecimal resolveModel(TransportReportTrip trip, CargoType cargoType) {
        if (trip.getTripCount() == null || trip.getTripCount() == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal base = isPositive(trip.getProvisionalModel())
                ? trip.getProvisionalModel()
                : lookupModelFromMatrix(trip, cargoType);
        return base.multiply(rodaFactor(trip)).setScale(3, RoundingMode.HALF_UP);
    }

    private BigDecimal lookupModelFromMatrix(TransportReportTrip trip, CargoType cargoType) {
        Device vehicle = trip.getTransportReport() != null
                ? trip.getTransportReport().getVehicle() : null;
        if (vehicle == null) {
            throw missing(trip, "phiếu vận tải chưa gắn Số xe nên không tra được lưới Mô hình");
        }
        VehicleFuelClass fuelClass = vehicle.getFuelClass();
        if (fuelClass == null) {
            throw missing(trip, "xe \"" + vehicle.getCode()
                    + "\" chưa khai Chủng loại xe + DMNL (màn Thuộc tính sản lượng — Xe)");
        }
        return matrixService.requireCell(MATRIX_MO_HINH, cargoType.getCode(), fuelClass.getCode());
    }

    /** Z5 — hệ số mức tải: Roda = 2/3, đủ tải = 1, khác = phân số tự nhập. */
    private BigDecimal rodaFactor(TransportReportTrip trip) {
        LoadLevel level = trip.getLoadLevel();
        if (level == null || level.getType() == null) return BigDecimal.ONE;
        return switch (level.getType()) {
            case RODA_2_3 -> TWO_THIRDS;
            case FULL_LOAD -> BigDecimal.ONE;
            case OTHER -> parseFraction(level.getCustomValue(), trip);
        };
    }

    private BigDecimal parseFraction(String raw, TransportReportTrip trip) {
        if (raw == null || !raw.contains("/")) {
            throw missing(trip, "mức tải \"Khác\" nhưng thiếu giá trị dạng x/y");
        }
        String[] parts = raw.split("/", 2);
        try {
            BigDecimal denominator = new BigDecimal(parts[1].trim());
            if (denominator.signum() == 0) {
                throw missing(trip, "mức tải \"" + raw + "\" có mẫu số bằng 0");
            }
            return new BigDecimal(parts[0].trim())
                    .divide(denominator, 10, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            throw missing(trip, "mức tải \"" + raw + "\" không đọc được thành phân số");
        }
    }

    /** AI5 — Tỷ trọng: giá trị tạm tính thắng, không thì tra danh mục (QĐ-04). */
    private BigDecimal resolveDensity(TransportReportTrip trip, CargoType cargoType, LocalDate date) {
        if (isPositive(trip.getProvisionalDensity())) {
            return trip.getProvisionalDensity();
        }
        Long areaId = trip.getExcavationArea() != null ? trip.getExcavationArea().getId() : null;
        return densityService.resolve(cargoType.getId(), areaId, date).getDensityWet();
    }

    /** AL5 — Tổng m3. */
    private BigDecimal computeTotalM3(TransportReportTrip trip, CargoType cargoType,
                                      BigDecimal model, BigDecimal tripCount, BigDecimal deduction,
                                      BigDecimal weighed, BigDecimal density, boolean earth) {
        if (weighed.signum() > 0) {
            if (density.signum() == 0) {
                throw missing(trip, "có Khối lượng qua cân nhưng Tỷ trọng bằng 0 nên không chia được");
            }
            return weighed.divide(density, 3, RoundingMode.HALF_UP);
        }
        // Nhóm CLH bắt đầu bằng "D" thì làm tròn Mô hình tới 1 chữ số thập
        // phân, còn lại 3 — docx dòng 305–306, khớp LEFT(J5,1)="D" của Excel.
        String cargoGroupName = cargoType.getCargoGroup() != null
                ? cargoType.getCargoGroup().getName() : "";
        int modelScale = cargoGroupName.toUpperCase().startsWith("D") ? 1 : 3;

        BigDecimal rounded = model.setScale(modelScale, RoundingMode.HALF_UP);
        BigDecimal result = rounded.multiply(tripCount);
        if (earth) {
            // Chỉ phân loại ĐẤT mới trừ vơi ở bước m3; than trừ ở bước tấn.
            result = result.subtract(deduction);
        }
        return result.setScale(3, RoundingMode.HALF_UP);
    }

    /** AM5 — Tổng KLVC (tấn). */
    private BigDecimal computeTotalTon(BigDecimal totalM3, BigDecimal density, BigDecimal wasteRock,
                                       BigDecimal deduction, boolean coal, String acceptanceProduct) {
        BigDecimal result = totalM3.multiply(density).subtract(wasteRock);
        if (coal) {
            result = result.subtract(deduction);
        }
        // Hệ số "Than tke trừ đá" chỉ áp cho than sản xuất (docx dòng 315).
        if ("than_sx".equalsIgnoreCase(acceptanceProduct)) {
            result = result.multiply(coalCoefficient());
        }
        return result.setScale(6, RoundingMode.HALF_UP);
    }

    private BigDecimal coalCoefficient() {
        return coefficientRepository.findByCode(COEFFICIENT_THAN_SX)
                .map(CoefficientItem::getValue)
                .orElseThrow(() -> new BadRequestException(
                        "Danh mục Hệ số chưa có mã \"" + COEFFICIENT_THAN_SX
                                + "\" (hệ số Than tke trừ đá) — cần cho sản phẩm nghiệm thu than_sx"));
    }

    /** AN5 — Tổng Tkm. */
    private BigDecimal computeTotalTkm(TransportReportTrip trip, BigDecimal weighed, BigDecimal totalTon) {
        BigDecimal distance = trip.getTotalRouteDistanceKm() != null
                ? BigDecimal.valueOf(trip.getTotalRouteDistanceKm()) : BigDecimal.ZERO;
        if (weighed.signum() != 0) {
            return weighed.multiply(distance).setScale(6, RoundingMode.HALF_UP);
        }
        return totalTon.multiply(distance).setScale(4, RoundingMode.HALF_UP);
    }

    /** Khoá ghép Nhóm vỉa + Máy xúc, hậu tố do hệ TỰ SUY từ dữ liệu chuyến. */
    private String buildKey(TransportReportTrip trip, CargoType cargoType, BigDecimal density) {
        // Dùng MÃ nhóm vỉa, đồng bộ với máy xúc và khu vực xúc phía sau cũng
        // dùng mã. Mã ổn định khi đổi tên hiển thị, nên khoá đã sinh không bị
        // hỏng — điều mà chuỗi tự do trước đây không bảo đảm được.
        SeamGroup seamGroupRef = trip.getLoadingPoint() != null
                ? trip.getLoadingPoint().getSeamGroup() : null;
        String seamGroup = seamGroupRef != null ? seamGroupRef.getCode() : null;
        String excavator = trip.getExcavator() != null ? trip.getExcavator().getCode() : null;
        String area = trip.getExcavationArea() != null ? trip.getExcavationArea().getCode() : null;
        String benchGroup = trip.getReceivingFloorGroup() != null
                ? String.valueOf(trip.getReceivingFloorGroup()) : null;

        List<String> suffixes = SeamGroupExcavatorKeys.deriveSuffixes(
                trip.getUnloadingPoint() != null ? trip.getUnloadingPoint().getName() : null,
                cargoType.getCargoGroup() != null ? cargoType.getCargoGroup().getName() : null,
                density,
                cargoType.getName());

        return SeamGroupExcavatorKeys.compose(seamGroup, benchGroup, excavator, null, area, suffixes);
    }

    // ── phụ trợ ─────────────────────────────────────────────────────────────

    /**
     * Sản phẩm nghiệm thu (AG5).
     *
     * <p>Ngoại lệ trong công thức: Khu vực xúc = CS và Chủng loại hàng =
     * DaXit.NK thì luôn là {@code Dat_SX}, bất kể danh mục ghi gì.
     */
    private String acceptanceProductOf(TransportReportTrip trip, CargoType cargoType) {
        String area = trip.getExcavationArea() != null ? trip.getExcavationArea().getCode() : "";
        if ("CS".equalsIgnoreCase(area) && "DaXit.NK".equalsIgnoreCase(cargoType.getName())) {
            return "Dat_SX";
        }
        AcceptanceProduct product = cargoType.getAcceptanceProduct();
        if (product == null) {
            throw missing(trip, "chủng loại hàng \"" + cargoType.getName()
                    + "\" chưa khai Sản phẩm nghiệm thu");
        }
        // Dùng TÊN chứ không dùng mã: công thức so giá trị này với các hằng
        // nghiệp vụ (Dat_SX, Than_SX, Dat_CN…), mà những hằng đó chính là TÊN
        // trong danh mục Sản phẩm nghiệm thu, không phải mã SPNT001…
        return product.getName();
    }

    /**
     * Phân loại Đất/Than suy từ tiền tố của Sản phẩm nghiệm thu.
     *
     * <p>Docx nói "Phân loại (Đất/Than) (theo Loại hàng)" nhưng danh mục Chủng
     * loại hàng hiện KHÔNG có trường phân loại. Tiền tố {@code Dat_}/
     * {@code Than_} của Sản phẩm nghiệm thu là tín hiệu trực tiếp nhất đang
     * có — cần chủ dự án xác nhận, xem mục "Điểm cần xác nhận" trong
     * {@code docs/RA_SOAT_CHUAN_HOA_DANH_MUC.md}.
     */
    private static boolean isCoal(String acceptanceProduct) {
        return acceptanceProduct != null && acceptanceProduct.toLowerCase().startsWith("than");
    }

    private static boolean isEarth(String acceptanceProduct) {
        return acceptanceProduct != null && acceptanceProduct.toLowerCase().startsWith("dat");
    }

    private static LocalDate productionDateOf(TransportReportTrip trip) {
        TransportReport report = trip.getTransportReport();
        if (report == null || report.getReportDate() == null) {
            throw new BadRequestException("Chuyến id=" + trip.getId() + " không có ngày sản xuất");
        }
        return report.getReportDate();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static boolean isPositive(BigDecimal v) {
        return v != null && v.signum() != 0;
    }

    private static <T> T require(T value, String label, TransportReportTrip trip) {
        if (value == null) throw missing(trip, "thiếu " + label);
        return value;
    }

    private static BadRequestException missing(TransportReportTrip trip, String reason) {
        return new BadRequestException("Chuyến id=" + trip.getId() + ": " + reason);
    }
}
