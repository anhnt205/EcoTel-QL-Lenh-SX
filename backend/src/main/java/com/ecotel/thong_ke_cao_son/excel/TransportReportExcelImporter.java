package com.ecotel.thong_ke_cao_son.excel;

import com.ecotel.thong_ke_cao_son.dto.response.ExcelImportResultResponse;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.service.ReceivingFloorGroupCalculator;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
@RequiredArgsConstructor
public class TransportReportExcelImporter {

    private final TransportReportRepository transportReportRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final ReceivingFloorGroupCalculator floorGroupCalculator;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Transactional
    public ExcelImportResultResponse importFile(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        List<Map<String, String>> rawRows = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isRowEmpty(row, formatter)) continue;

                Map<String, String> rowData = new LinkedHashMap<>();
                rowData.put("_excelRow", String.valueOf(r + 1));
                rowData.put("reportDate", formatter.formatCellValue(row.getCell(0)).trim());
                rowData.put("shiftName", formatter.formatCellValue(row.getCell(1)).trim());
                rowData.put("deviceCode", formatter.formatCellValue(row.getCell(2)).trim());
                rowData.put("salaryCode", formatter.formatCellValue(row.getCell(3)).trim());
                rowData.put("rainyDay", formatter.formatCellValue(row.getCell(6)).trim());
                rowData.put("supplementaryVehicle", formatter.formatCellValue(row.getCell(7)).trim());
                rowData.put("fuelBeginning", formatter.formatCellValue(row.getCell(8)).trim());
                rowData.put("fuelEnding", formatter.formatCellValue(row.getCell(9)).trim());
                rowData.put("fuelReceived", formatter.formatCellValue(row.getCell(10)).trim());
                rowData.put("excavationAreaName", formatter.formatCellValue(row.getCell(12)).trim());
                rowData.put("excavatorCode", formatter.formatCellValue(row.getCell(13)).trim());
                rowData.put("loadingPointName", formatter.formatCellValue(row.getCell(14)).trim());
                rowData.put("receivingFloor", formatter.formatCellValue(row.getCell(15)).trim());
                rowData.put("unloadingFloor", formatter.formatCellValue(row.getCell(17)).trim());
                rowData.put("totalRouteDistanceKm", formatter.formatCellValue(row.getCell(18)).trim());
                rowData.put("totalRouteLiftM", formatter.formatCellValue(row.getCell(19)).trim());
                rowData.put("localSlopeDistanceKm", formatter.formatCellValue(row.getCell(20)).trim());
                rowData.put("localSlopeM", formatter.formatCellValue(row.getCell(21)).trim());
                rowData.put("unloadingPointName", formatter.formatCellValue(row.getCell(22)).trim());
                rowData.put("cargoTypeName", formatter.formatCellValue(row.getCell(23)).trim());
                rowData.put("tripCount", formatter.formatCellValue(row.getCell(25)).trim());
                rowData.put("loadLevelLabel", formatter.formatCellValue(row.getCell(26)).trim());
                rowData.put("loadLevelCustomValue", formatter.formatCellValue(row.getCell(27)).trim());

                rawRows.add(rowData);
            }
        } catch (Exception e) {
            throw new RuntimeException("Không đọc được file Excel: " + e.getMessage(), e);
        }

        // Gom nhóm theo key: Thời gian + Ca + Số xe + Số thẻ lương — xác định 1 báo cáo
        List<List<Map<String, String>>> groups = groupRows(rawRows);

        int successCount = 0;
        for (List<Map<String, String>> group : groups) {
            try {
                processGroup(group);
                successCount++;
            } catch (Exception e) {
                String excelRow = group.get(0).get("_excelRow");
                errors.add("Dòng " + excelRow + ": " + e.getMessage());
            }
        }

        return ExcelImportResultResponse.builder()
                .totalRows(rawRows.size())
                .successReportCount(successCount)
                .errorRowCount(errors.size())
                .errors(errors)
                .build();
    }

    private List<List<Map<String, String>>> groupRows(List<Map<String, String>> rows) {
        List<List<Map<String, String>>> groups = new ArrayList<>();
        List<Map<String, String>> current = null;
        String lastKey = null;

        for (Map<String, String> row : rows) {
            String groupKey = buildHeaderKey(row);
            if (current == null || !groupKey.equals(lastKey)) {
                current = new ArrayList<>();
                groups.add(current);
                lastKey = groupKey;
            }
            current.add(row);
        }
        return groups;
    }

    private String buildHeaderKey(Map<String, String> row) {
        return row.get("reportDate") + "|" + row.get("shiftName") + "|"
                + row.get("deviceCode") + "|" + row.get("salaryCode");
    }

    private void processGroup(List<Map<String, String>> group) {
        Map<String, String> firstRow = group.get(0);

        LocalDate reportDate = parseDate(firstRow.get("reportDate"));
        Shift shift = findOrThrow(shiftRepository.findByName(parseInt(firstRow.get("shiftName"))), "Ca", firstRow.get("shiftName"));
        Device device = findOrThrow(deviceRepository.findByCode(firstRow.get("deviceCode")), "Số xe", firstRow.get("deviceCode"));
        User employee = findOrThrow(userRepository.findBySalaryCode(firstRow.get("salaryCode")), "Số thẻ lương", firstRow.get("salaryCode"));

        // Xác định báo cáo mới hay đã tồn tại dựa trên Thời gian + Ca + Số xe + Số thẻ lương
        TransportReport report = transportReportRepository
                .findByReportDateAndShiftIdAndDeviceIdAndEmployeeId(reportDate, shift.getId(), device.getId(), employee.getId())
                .orElseGet(TransportReport::new);

        report.setReportDate(reportDate);
        report.setShift(shift);
        report.setDevice(device);
        report.setEmployee(employee);
        report.setRainyDay("x".equalsIgnoreCase(firstRow.get("rainyDay")));
        report.setSupplementaryVehicle("x".equalsIgnoreCase(firstRow.get("supplementaryVehicle")));
        report.setFuelBeginning(parseDouble(firstRow.get("fuelBeginning")));
        report.setFuelEnding(parseDouble(firstRow.get("fuelEnding")));
        report.setFuelReceived(parseDouble(firstRow.get("fuelReceived")));
        report.recalculateFuelUsed();

        // Vì không còn ID chuyến để phân biệt sửa/thêm, và yêu cầu "chỉ thêm, không xóa":
        // mỗi dòng trong file được coi là 1 chuyến cần có mặt trong báo cáo.
        // Nếu báo cáo đã tồn tại 1 chuyến với đúng nội dung (dedup theo toàn bộ field),
        // bỏ qua để tránh tạo trùng lặp khi import lại cùng file nhiều lần.
        // Ngược lại, thêm chuyến mới.
        for (Map<String, String> row : group) {
            TransportReportTrip newTrip = buildTrip(row);
            boolean alreadyExists = report.getTrips().stream().anyMatch(existing -> isSameTrip(existing, newTrip));
            if (!alreadyExists) {
                newTrip.setTransportReport(report);
                report.getTrips().add(newTrip);
            }
        }

        transportReportRepository.save(report);
    }

    private TransportReportTrip buildTrip(Map<String, String> row) {
        TransportReportTrip trip = new TransportReportTrip();

        Location excavationArea = findOrThrow(
                locationRepository.findByName(row.get("excavationAreaName")), "Khu vực xúc", row.get("excavationAreaName"));
        trip.setExcavationArea(excavationArea);
        trip.setExcavator(findOrThrow(deviceRepository.findByCode(row.get("excavatorCode")), "Máy xúc", row.get("excavatorCode")));
        trip.setLoadingPoint(findOrThrow(locationRepository.findByName(row.get("loadingPointName")), "Nơi nhận tải", row.get("loadingPointName")));
        trip.setUnloadingPoint(findOrThrow(locationRepository.findByName(row.get("unloadingPointName")), "Nơi dỡ tải", row.get("unloadingPointName")));

        Integer receivingFloor = parseIntOrNull(row.get("receivingFloor"));
        trip.setReceivingFloor(receivingFloor);
        trip.setReceivingFloorGroup(floorGroupCalculator.calculate(excavationArea.getName(), receivingFloor));

        trip.setUnloadingFloor(emptyToNull(row.get("unloadingFloor")));
        trip.setTotalRouteDistanceKm(parseDouble(row.get("totalRouteDistanceKm")));
        trip.setTotalRouteLiftM(parseDouble(row.get("totalRouteLiftM")));
        trip.setLocalSlopeDistanceKm(parseDouble(row.get("localSlopeDistanceKm")));
        trip.setLocalSlopeM(parseDouble(row.get("localSlopeM")));

        CargoType cargoType = findOrThrow(cargoTypeRepository.findByName(row.get("cargoTypeName")), "Loại hàng", row.get("cargoTypeName"));
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup());

        trip.setTripCount(parseIntOrNull(row.get("tripCount")));

        LoadLevel loadLevel = new LoadLevel();
        LoadLevelType type = parseLoadLevelLabel(row.get("loadLevelLabel"));
        loadLevel.setType(type);
        loadLevel.setCustomValue(type == LoadLevelType.OTHER ? row.get("loadLevelCustomValue") : null);
        if (type == LoadLevelType.OTHER
                && (loadLevel.getCustomValue() == null || !loadLevel.getCustomValue().matches("^\\d+/\\d+$"))) {
            throw new IllegalArgumentException("Mức tải 'Khác' cần giá trị dạng x/y, ví dụ 1/2");
        }
        trip.setLoadLevel(loadLevel);

        return trip;
    }

    /**
     * So sánh 2 chuyến có cùng nội dung hay không — dùng để tránh tạo trùng lặp
     * khi người dùng import lại đúng file nhiều lần (do không còn ID để đối chiếu).
     */
    private boolean isSameTrip(TransportReportTrip a, TransportReportTrip b) {
        return Objects.equals(a.getExcavationArea().getId(), b.getExcavationArea().getId())
                && Objects.equals(a.getExcavator().getId(), b.getExcavator().getId())
                && Objects.equals(a.getLoadingPoint().getId(), b.getLoadingPoint().getId())
                && Objects.equals(a.getUnloadingPoint().getId(), b.getUnloadingPoint().getId())
                && Objects.equals(a.getReceivingFloor(), b.getReceivingFloor())
                && Objects.equals(a.getUnloadingFloor(), b.getUnloadingFloor())
                && Objects.equals(a.getCargoType().getId(), b.getCargoType().getId())
                && Objects.equals(a.getTripCount(), b.getTripCount())
                && a.getLoadLevel().getType() == b.getLoadLevel().getType()
                && Objects.equals(a.getLoadLevel().getCustomValue(), b.getLoadLevel().getCustomValue());
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private LoadLevelType parseLoadLevelLabel(String label) {
        return switch (label) {
            case "Đủ tải" -> LoadLevelType.FULL_LOAD;
            case "Roda (2/3)" -> LoadLevelType.RODA_2_3;
            case "Khác" -> LoadLevelType.OTHER;
            default -> throw new IllegalArgumentException("Mức tải không hợp lệ: '" + label + "'");
        };
    }

    private <T> T findOrThrow(Optional<T> optional, String label, String value) {
        return optional.orElseThrow(() -> new IllegalArgumentException(
                "Không tìm thấy " + label + " '" + value + "'"));
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value, DATE_FMT);
        } catch (Exception e) {
            throw new IllegalArgumentException("Thời gian không hợp lệ: '" + value + "' (định dạng dd/MM/yyyy)");
        }
    }

    private Integer parseInt(String value) {
        try {
            return (int) Double.parseDouble(value);
        } catch (Exception e) {
            throw new IllegalArgumentException("Giá trị số không hợp lệ: '" + value + "'");
        }
    }

    private Integer parseIntOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return (int) Double.parseDouble(value);
    }

    private Double parseDouble(String value) {
        if (value == null || value.isBlank()) return null;
        return Double.parseDouble(value);
    }

    private boolean isRowEmpty(Row row, DataFormatter formatter) {
        for (int c = 0; c < 4; c++) {
            if (!formatter.formatCellValue(row.getCell(c)).trim().isEmpty()) return false;
        }
        return true;
    }
}
