package com.ecotel.thong_ke_cao_son.service.production;

import com.ecotel.thong_ke_cao_son.dto.response.AreaApplicationRowResponse;
import com.ecotel.thong_ke_cao_son.model.ReportPeriod;
import com.ecotel.thong_ke_cao_son.model.SurveyCoefficient;
import com.ecotel.thong_ke_cao_son.model.SurveyStandard;
import com.ecotel.thong_ke_cao_son.repository.ReportPeriodRepository;
import com.ecotel.thong_ke_cao_son.repository.SurveyCoefficientRepository;
import com.ecotel.thong_ke_cao_son.repository.SurveyStandardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * Danh mục <b>"AP Tdia (m3-tấn-tkm)"</b> (chỉ xem) — xem
 * {@link AreaApplicationRowResponse}.
 *
 * <p>KHÔNG tính lại gì — chỉ đọc {@link SurveyCoefficient} (kind
 * {@code AP_TDIA}) mà màn "Báo cáo thống kê" đã sinh sẵn lúc "Tính lại kỳ",
 * gộp theo tháng và PIVOT ba dòng ({@code Dat_CN}/{@code Dat_SX}/
 * {@code Than_SX}) cùng khoá thành một dòng ba khối cột.
 */
@Service
@RequiredArgsConstructor
public class AreaApplicationReportService {

    private final ReportPeriodRepository periodRepository;
    private final SurveyCoefficientRepository coefficientRepository;
    private final SurveyStandardRepository surveyStandardRepository;

    @Transactional(readOnly = true)
    public List<AreaApplicationRowResponse> getMonth(int year, int month,
                                                      String excavatorCode, String key) {
        List<ReportPeriod> periods = periodRepository.findByYearAndMonthOrderByPeriodIndexAsc(year, month);
        if (periods.isEmpty()) {
            return List.of();
        }
        List<Long> periodIds = periods.stream().map(ReportPeriod::getId).toList();

        List<SurveyCoefficient> coefficients = coefficientRepository.findByReportPeriodIdInAndKind(
                periodIds, SurveyCoefficient.Kind.AP_TDIA);

        // Gộp theo khoá — mỗi khoá có tối đa ba "ô" (Đất CN / Đất SX / Than),
        // mỗi ô có thể lặp lại qua nhiều kỳ trong tháng nên cộng dồn Tổng.
        Map<String, Bucket> byKey = new LinkedHashMap<>();
        for (SurveyCoefficient c : coefficients) {
            Bucket b = byKey.computeIfAbsent(c.getSeamGroupExcavatorKey(), k -> new Bucket());
            b.add(c);
        }

        Map<String, String> excavatorByKey = resolveExcavators(byKey.keySet());

        List<AreaApplicationRowResponse> rows = new ArrayList<>();
        for (Map.Entry<String, Bucket> e : byKey.entrySet()) {
            String k = e.getKey();
            String excavator = excavatorByKey.get(k);
            if (key != null && !key.isBlank() && !key.equals(k)) continue;
            if (excavatorCode != null && !excavatorCode.isBlank()
                    && !excavatorCode.equalsIgnoreCase(excavator)) continue;
            rows.add(e.getValue().toResponse(year, month, excavator, k));
        }
        rows.sort(Comparator.comparing(
                r -> Optional.ofNullable(r.getExcavatorCode()).orElse(""),
                Comparator.naturalOrder()));
        return rows;
    }

    /** Tra "Máy xúc" theo khoá — bất kỳ danh mục STD nào (Đất CN hay Đất SX/Than SX) có khoá đó. */
    private Map<String, String> resolveExcavators(Collection<String> keys) {
        List<SurveyStandard> found = surveyStandardRepository.findBySeamGroupExcavatorKeyIn(
                new ArrayList<>(keys));
        Map<String, String> out = new HashMap<>();
        for (SurveyStandard s : found) {
            if (s.getExcavator() != null && !s.getExcavator().isBlank()) {
                out.putIfAbsent(s.getSeamGroupExcavatorKey(), s.getExcavator());
            }
        }
        return out;
    }

    /** Cộng dồn ba khối (CN/SX/Than) của một khoá qua các kỳ trong tháng. */
    private static class Bucket {
        BigDecimal cnM3 = BigDecimal.ZERO, cnTon = BigDecimal.ZERO, cnTkm = BigDecimal.ZERO;
        BigDecimal sxM3 = BigDecimal.ZERO, sxTon = BigDecimal.ZERO, sxTkm = BigDecimal.ZERO;
        BigDecimal coalM3 = BigDecimal.ZERO, coalTon = BigDecimal.ZERO, coalTkm = BigDecimal.ZERO;
        // Số Trắc địa là giá trị KHAI BÁO (không cộng dồn) — lấy từ dòng đầu gặp của mỗi khối.
        BigDecimal cnSurveyM3, cnSurveyTon, cnSurveyTkm;
        BigDecimal sxSurveyM3, sxSurveyTon, sxSurveyTkm;
        BigDecimal coalSurveyM3, coalSurveyTon, coalSurveyTkm;

        void add(SurveyCoefficient c) {
            String product = c.getAcceptanceProduct();
            if ("Dat_CN".equalsIgnoreCase(product)) {
                cnM3 = cnM3.add(nz(c.getTotalM3()));
                cnTon = cnTon.add(nz(c.getTotalTon()));
                cnTkm = cnTkm.add(nz(c.getTotalTkm()));
                if (cnSurveyM3 == null) {
                    cnSurveyM3 = c.getSurveyM3();
                    cnSurveyTon = c.getSurveyTon();
                    cnSurveyTkm = c.getSurveyTkm();
                }
            } else if (ProductionKeys.isCoal(product)) {
                coalM3 = coalM3.add(nz(c.getTotalM3()));
                coalTon = coalTon.add(nz(c.getTotalTon()));
                coalTkm = coalTkm.add(nz(c.getTotalTkm()));
                if (coalSurveyM3 == null) {
                    coalSurveyM3 = c.getSurveyM3();
                    coalSurveyTon = c.getSurveyTon();
                    coalSurveyTkm = c.getSurveyTkm();
                }
            } else {
                sxM3 = sxM3.add(nz(c.getTotalM3()));
                sxTon = sxTon.add(nz(c.getTotalTon()));
                sxTkm = sxTkm.add(nz(c.getTotalTkm()));
                if (sxSurveyM3 == null) {
                    sxSurveyM3 = c.getSurveyM3();
                    sxSurveyTon = c.getSurveyTon();
                    sxSurveyTkm = c.getSurveyTkm();
                }
            }
        }

        AreaApplicationRowResponse toResponse(int year, int month, String excavator, String key) {
            return AreaApplicationRowResponse.builder()
                    .year(year).month(month)
                    .excavatorCode(excavator)
                    .seamGroupExcavatorKey(key)
                    .earthCnTotalM3(cnM3).earthCnTotalTon(cnTon).earthCnTotalTkm(cnTkm)
                    .earthSxTotalM3(sxM3).earthSxTotalTon(sxTon).earthSxTotalTkm(sxTkm)
                    .coalTotalM3(coalM3).coalTotalTon(coalTon).coalTotalTkm(coalTkm)
                    .earthCnSurveyM3(cnSurveyM3).earthCnSurveyTon(cnSurveyTon).earthCnSurveyTkm(cnSurveyTkm)
                    .earthSxSurveyM3(sxSurveyM3).earthSxSurveyTon(sxSurveyTon).earthSxSurveyTkm(sxSurveyTkm)
                    .coalSurveyM3(coalSurveyM3).coalSurveyTon(coalSurveyTon).coalSurveyTkm(coalSurveyTkm)
                    .earthCnHsM3(ratio(cnSurveyM3, cnM3)).earthCnHsTon(ratio(cnSurveyTon, cnTon)).earthCnHsTkm(ratio(cnSurveyTkm, cnTkm))
                    .earthSxHsM3(ratio(sxSurveyM3, sxM3)).earthSxHsTon(ratio(sxSurveyTon, sxTon)).earthSxHsTkm(ratio(sxSurveyTkm, sxTkm))
                    .coalHsM3(ratio(coalSurveyM3, coalM3)).coalHsTon(ratio(coalSurveyTon, coalTon)).coalHsTkm(ratio(coalSurveyTkm, coalTkm))
                    .build();
        }
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    /** Hệ số = tử ÷ mẫu; mẫu bằng 0 (hoặc tử trống) thì bằng 0 — khớp quy ước của {@code ProductionCalculationService}. */
    private static BigDecimal ratio(BigDecimal numerator, BigDecimal denominator) {
        if (numerator == null || denominator == null || denominator.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.divide(denominator, 10, java.math.RoundingMode.HALF_UP);
    }
}
