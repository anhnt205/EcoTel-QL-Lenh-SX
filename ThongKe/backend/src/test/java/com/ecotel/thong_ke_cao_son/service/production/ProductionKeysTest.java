package com.ecotel.thong_ke_cao_son.service.production;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Khoá tra bảng — chốt lại QĐ-10…QĐ-13 bằng test.
 *
 * <p>Lý do có file này: trước 07/09/2026 cả bốn bảng tra dùng chung một hàm
 * dựng khoá với hậu tố {@code .CS}/{@code .KC}. Sai, nhưng KHÔNG có triệu
 * chứng — tra hụt ô chỉ hiện ra thành cảnh báo "thiếu khai báo", nên lỗi
 * sống được rất lâu. Test này khoá lại từng họ khoá để lần sau đổi nhầm là
 * đỏ ngay.
 *
 * <p>Chạy thuần JUnit, KHÔNG cần Spring/Postgres — cố ý, vì
 * {@code ThongKeCaoSonApplicationTests.contextLoads} vốn đã fail khi không
 * có hạ tầng sống.
 */
class ProductionKeysTest {

    /**
     * Dữ liệu sống lấy từ bảng tính dòng 1250 — bốn chuỗi khác nhau cho CÙNG
     * một chiếc xe. Đây là bằng chứng gốc của QĐ-11.
     */
    @Nested
    @DisplayName("Bốn họ khoá phải khác nhau — dòng 1250 của bảng tính")
    class Row1250 {

        private static final String DQ = "CAT777E";   // Chủng loại xe (NL)
        private static final String DA = "CAT777E";   // Chủng loại xe (mã trần)
        private static final String RANK = "C";       // Hạng xe

        @Test
        @DisplayName("Mô hình: DA = CAT777E.CS")
        void modelKey() {
            assertEquals("CAT777E.CS", ProductionKeys.modelColumnKey(DA, "CS"));
            assertEquals("CAT777E.KC", ProductionKeys.modelColumnKey(DA, "KC"));
        }

        @Test
        @DisplayName("ĐMNL: DE = CAT777E.BK khi dỡ ở Băng tải")
        void fuelNormKey() {
            String key = ProductionKeys.fuelNormVehicleKey(
                    DQ, ProductionKeys.vehicleTypeRankKey(DA, RANK),
                    "SPNT.Baichua", "Băng tải.", "Than_CN", ProductionKeys.CLASS_COAL);
            assertEquals("CAT777E.BK", key);
        }

        @Test
        @DisplayName("Bốn khoá không được trùng nhau")
        void keysAreDistinct() {
            String model = ProductionKeys.modelColumnKey(DA, "CS");
            String output = ProductionKeys.vehicleOutputColumnKey(DA, ProductionKeys.CLASS_EARTH);
            String fuelNorm = ProductionKeys.fuelNormVehicleKey(
                    DQ, ProductionKeys.vehicleTypeRankKey(DA, RANK),
                    "SPNT.via", "Bãi thải.", "Than_CN", ProductionKeys.CLASS_COAL);
            String adjust = ProductionKeys.fuelAdjustRowKey(DQ, RANK, ProductionKeys.CLASS_EARTH);

            assertEquals("CAT777E.CS", model);
            assertEquals("CAT777E.DAT", output);
            assertEquals("CAT777E.BK", fuelNorm);
            assertEquals("CAT777E_C_DAT", adjust);
        }
    }

    @Nested
    @DisplayName("ĐMNL — bốn nhánh của DE5, xét theo thứ tự")
    class FuelNormSuffix {

        private String key(String dc, String cargo, String unload, String spnt, String classification) {
            return ProductionKeys.fuelNormVehicleKey("HM400-2R", dc, cargo, unload, spnt, classification);
        }

        @Test
        @DisplayName("nhánh 1 — HM400-2R_C chở bùn → .Bun")
        void mud() {
            assertEquals("HM400-2R.Bun",
                    key("HM400-2R_C", "B.Duot", "Bãi thải.", "Dat_SX", ProductionKeys.CLASS_EARTH));
            // LEFT(K5,7)="B.Loang" — khớp theo TIỀN TỐ, không phải bằng đúng
            assertEquals("HM400-2R.Bun",
                    key("HM400-2R_C", "B.LoangXXX", "Bãi thải.", "Dat_SX", ProductionKeys.CLASS_EARTH));
        }

        @Test
        @DisplayName("nhánh 1 chỉ áp cho HM400-2R_C — xe khác chở bùn KHÔNG ra .Bun")
        void mudOnlyForOneVehicle() {
            assertEquals("HM400-2R.DAT",
                    key("CAT777E_C", "B.Duot", "Bãi thải.", "Dat_SX", ProductionKeys.CLASS_EARTH));
        }

        @Test
        @DisplayName("nhánh 2 — xe cạp + dỡ ở \"Cạp…\" → .Dat")
        void dirt() {
            assertEquals("HM400-2R.Dat",
                    key("VolvoA40-F_C", "DaXit.NK", "Cạp đường.", "Dat_SX", ProductionKeys.CLASS_EARTH));
            assertEquals("HM400-2R.Dat",
                    key("VolvoA40-GCoi_A", "bundacXYZ", "Bãi thải.", "Dat_SX", ProductionKeys.CLASS_EARTH));
            assertEquals("HM400-2R.Dat",
                    key("HM400-2R_C", "DaXit.NK", "Bãi thải.", "Dat_CN", ProductionKeys.CLASS_EARTH));
        }

        @Test
        @DisplayName("nhánh 3 — băng tải hoặc SPNT vỉa → .BK")
        void belt() {
            assertEquals("HM400-2R.BK",
                    key("CAT777E_C", "DaXit.NK", "Băng tải.", "Than_SX", ProductionKeys.CLASS_COAL));
            assertEquals("HM400-2R.BK",
                    key("CAT777E_C", "SPNT_uot.via", "Bãi thải.", "Than_SX", ProductionKeys.CLASS_COAL));
        }

        @Test
        @DisplayName("nhánh 4 — còn lại thì nối Phân loại")
        void fallback() {
            assertEquals("HM400-2R.Than",
                    key("CAT777E_C", "DaXit.NK", "Bãi thải.", "Than_SX", ProductionKeys.CLASS_COAL));
        }

        @Test
        @DisplayName("thứ tự nhánh: bùn thắng cả cạp lẫn băng tải")
        void orderMatters() {
            assertEquals("HM400-2R.Bun",
                    key("HM400-2R_C", "B.Duot", "Băng tải.", "Dat_CN", ProductionKeys.CLASS_EARTH));
        }

        @Test
        @DisplayName("so chuỗi KHÔNG phân biệt hoa thường — Excel MATCH cũng vậy")
        void caseInsensitive() {
            assertEquals("HM400-2R.BK",
                    key("cat777e_c", "spnt.via", "BĂNG TẢI.", "Than_SX", ProductionKeys.CLASS_COAL));
        }
    }

    @Nested
    @DisplayName("DC / EA — ghép hạng xe bằng CHỮ ĐẦU")
    class RankComposition {

        @Test
        void dcTakesFirstCharOfRank() {
            assertEquals("HM400-2R_C", ProductionKeys.vehicleTypeRankKey("HM400-2R", "C1"));
            assertEquals("HM400-2R_A", ProductionKeys.vehicleTypeRankKey("HM400-2R", "A"));
        }

        @Test
        @DisplayName("hạng xe để trống thì không nổ IndexOutOfBounds")
        void blankRankIsSafe() {
            assertEquals("HM400-2R_", ProductionKeys.vehicleTypeRankKey("HM400-2R", null));
            assertEquals("CAT777E__DAT",
                    ProductionKeys.fuelAdjustRowKey("CAT777E", "  ", ProductionKeys.CLASS_EARTH));
        }

        @Test
        @DisplayName("EA5 dựng trên DQ (Chủng loại xe NL), DC dựng trên DA — khác nhau")
        void adjustRowUsesFuelClassNotVehicleType() {
            assertEquals("CAT777E_C_Than",
                    ProductionKeys.fuelAdjustRowKey("CAT777E", "C1", ProductionKeys.CLASS_COAL));
        }
    }

    @Nested
    @DisplayName("HS điều chỉnh — cột theo THÁNG × nhóm khu vực (QĐ-12)")
    class AdjustColumn {

        @Test
        void columnCarriesMonth() {
            assertEquals("T6.CS",
                    ProductionKeys.fuelAdjustColumnKey(LocalDate.of(2026, 6, 15), "CS"));
            assertEquals("T12.KC",
                    ProductionKeys.fuelAdjustColumnKey(LocalDate.of(2026, 12, 1), "KC"));
        }

        @Test
        @DisplayName("thiếu ngày sản xuất vẫn cho ra khoá hợp lệ, không ném lỗi")
        void nullDateIsSafe() {
            assertEquals("T1.KC", ProductionKeys.fuelAdjustColumnKey(null, "KC"));
        }
    }

    @Nested
    @DisplayName("Nhóm khu vực — CS/KC là NHÓM, không phải mã khu vực (QĐ-13)")
    class AreaGroup {

        @Test
        @DisplayName("đã khai nhóm thì dùng nhóm, bất kể mã khu vực là gì")
        void declaredGroupWins() {
            assertEquals("CS", ProductionKeys.areaGroup("CS", "KHUBAC"));
            assertEquals("KC", ProductionKeys.areaGroup("kc", "CS"));
        }

        @Test
        @DisplayName("chưa khai nhóm thì lùi về so mã — giữ hành vi cũ, dữ liệu cũ không đứt")
        void fallsBackToCode() {
            assertEquals("CS", ProductionKeys.areaGroup(null, "CS"));
            assertEquals("KC", ProductionKeys.areaGroup("", "KHUBAC"));
        }

        @Test
        @DisplayName("giá trị lạ coi như KC, không ném lỗi giữa lúc tính cả kỳ")
        void unknownIsKc() {
            assertEquals("KC", ProductionKeys.areaGroup("XX", null));
        }
    }

    @Nested
    @DisplayName("Phân loại AD5 — xét CHỮ ĐẦU của SPNT (QĐ-10)")
    class Classify {

        @Test
        void firstLetterDecides() {
            assertEquals(ProductionKeys.CLASS_EARTH, ProductionKeys.classify("Dat_SX"));
            assertEquals(ProductionKeys.CLASS_EARTH, ProductionKeys.classify("SP than sạch"));
            assertEquals(ProductionKeys.CLASS_COAL, ProductionKeys.classify("Than_CN"));
        }

        @Test
        @DisplayName("\"SP than sạch\" bắt đầu bằng S nên là ĐẤT — dù tên có chữ \"than\"")
        void theTrapCase() {
            assertTrue(ProductionKeys.isEarth("SP than sạch"));
        }

        @Test
        @DisplayName("để trống thì coi là Than, không ném lỗi")
        void blankIsCoal() {
            assertEquals(ProductionKeys.CLASS_COAL, ProductionKeys.classify(null));
            assertEquals(ProductionKeys.CLASS_COAL, ProductionKeys.classify("   "));
        }
    }

    @Nested
    @DisplayName("Thiếu khai báo thì trả chuỗi rỗng, KHÔNG dựng khoá nửa vời")
    class MissingInput {

        @Test
        void blankBaseGivesBlankKey() {
            assertEquals("", ProductionKeys.modelColumnKey(null, "CS"));
            assertEquals("", ProductionKeys.vehicleOutputColumnKey("  ", "DAT"));
            assertEquals("", ProductionKeys.fuelNormVehicleKey(
                    null, "X_C", "K", "I", "AG", "DAT"));
            assertEquals("", ProductionKeys.fuelAdjustRowKey(null, "C", "DAT"));
        }
    }
}
