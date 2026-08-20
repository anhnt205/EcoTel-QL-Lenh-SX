package com.ecotel.thong_ke_cao_son.excel;

import com.ecotel.thong_ke_cao_son.dto.response.ExcelImportResultResponse;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import com.ecotel.thong_ke_cao_son.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class ExcavationReportExcelImporter {

    private final ExcavationReportRepository excavationReportRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final CargoTypeRepository cargoTypeRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // Khớp "Khác (3/4)" -> nhóm 1 = "3/4"
    private static final Pattern OTHER_LOAD_LEVEL_PATTERN = Pattern.compile("^Khác\\s*\\(([^)]*)\\)$");

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

                LocalDate reportDate = readDateCell(row.getCell(0));
                rowData.put("reportDate", reportDate.toString());

                // Layout mới (khớp đúng ExcavationReportExcelExporter đã sửa):
                // 0:Thời gian 1:Ca 2:Máy xúc 3:Tầng xúc 4:Nơi nhận tải
                // 5:Số thẻ lương 6:Họ và tên 7:Đơn vị
                // 8:Nhiên liệu tồn đầu 9:Nhiên liệu tồn cuối 10:Nhiên liệu lĩnh 11:Nhiên liệu sử dụng
                // 12:Số xe 13:Số chuyến 14:Loại hàng 15:Nhóm hàng
                // 16:Mức tải
                // 17:Đơn vị quản lý thiết bị 18:Chủng loại xe
                rowData.put("shiftName", formatter.formatCellValue(row.getCell(1)).trim());
                rowData.put("excavatorCode", formatter.formatCellValue(row.getCell(2)).trim());
                rowData.put("excavationFloor", formatter.formatCellValue(row.getCell(3)).trim());
                rowData.put("receivingLocationName", formatter.formatCellValue(row.getCell(4)).trim());
                rowData.put("salaryCode", formatter.formatCellValue(row.getCell(5)).trim());
                rowData.put("fuelBeginning", formatter.formatCellValue(row.getCell(8)).trim());
                rowData.put("fuelEnding", formatter.formatCellValue(row.getCell(9)).trim());
                rowData.put("fuelReceived", formatter.formatCellValue(row.getCell(10)).trim());
                rowData.put("vehicleCode", formatter.formatCellValue(row.getCell(12)).trim());
                rowData.put("tripCount", formatter.formatCellValue(row.getCell(13)).trim());
                rowData.put("cargoTypeName", formatter.formatCellValue(row.getCell(14)).trim());
                // Cột "Nhóm hàng" (15) chỉ để hiển thị/đối chiếu, KHÔNG dùng để import —
                // Nhóm hàng luôn tự lấy theo Loại hàng (cargoType.getCargoGroup()), giữ đúng nghiệp vụ đã thống nhất.
                rowData.put("loadLevelDisplay", formatter.formatCellValue(row.getCell(16)).trim());

                rawRows.add(rowData);
            }
        } catch (Exception e) {
            throw new RuntimeException("Không đọc được file Excel: " + e.getMessage(), e);
        }

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

    private LocalDate readDateCell(Cell cell) {
        if (cell == null) {
            throw new IllegalArgumentException("Thời gian không được để trống");
        }

        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }

        String raw = new DataFormatter().formatCellValue(cell).trim();
        try {
            return LocalDate.parse(raw, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (Exception e) {
            throw new IllegalArgumentException(
                    "Thời gian không hợp lệ: '" + raw + "' (định dạng dd/MM/yyyy)");
        }
    }

    private LocalDate parseDate(String value) {
        return LocalDate.parse(value); // ISO yyyy-MM-dd
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
                + row.get("excavatorCode") + "|" + row.get("salaryCode");
    }

    private void processGroup(List<Map<String, String>> group) {
        Map<String, String> firstRow = group.get(0);

        LocalDate reportDate = parseDate(firstRow.get("reportDate"));
        Shift shift = findOrThrow(shiftRepository.findByName(parseInt(firstRow.get("shiftName"))), "Ca", firstRow.get("shiftName"));
        Device excavatorDevice = findOrThrow(deviceRepository.findByCode(firstRow.get("excavatorCode")), "Máy xúc", firstRow.get("excavatorCode"));
        User employee = findOrThrow(userRepository.findBySalaryCode(firstRow.get("salaryCode")), "Số thẻ lương", firstRow.get("salaryCode"));

        ExcavationReport report = excavationReportRepository
                .findByReportDateAndShiftIdAndExcavatorDeviceIdAndEmployeeId(reportDate, shift.getId(), excavatorDevice.getId(), employee.getId())
                .orElseGet(ExcavationReport::new);

        report.setReportDate(reportDate);
        report.setShift(shift);
        report.setExcavatorDevice(excavatorDevice);
        report.setExcavationFloor(emptyToNull(firstRow.get("excavationFloor")));
        report.setReceivingLocation(findOrThrow(locationRepository.findByName(firstRow.get("receivingLocationName")), "Nơi nhận tải", firstRow.get("receivingLocationName")));
        report.setEmployee(employee);
        report.setFuelBeginning(parseDouble(firstRow.get("fuelBeginning")));
        report.setFuelEnding(parseDouble(firstRow.get("fuelEnding")));
        report.setFuelReceived(parseDouble(firstRow.get("fuelReceived")));
        report.recalculateFuelUsed();

        for (Map<String, String> row : group) {
            ExcavationReportTrip newTrip = buildTrip(row);
            boolean alreadyExists = report.getTrips().stream().anyMatch(existing -> isSameTrip(existing, newTrip));
            if (!alreadyExists) {
                newTrip.setExcavationReport(report);
                report.getTrips().add(newTrip);
            }
        }

        excavationReportRepository.save(report);
    }

    private ExcavationReportTrip buildTrip(Map<String, String> row) {
        ExcavationReportTrip trip = new ExcavationReportTrip();

        trip.setVehicle(findOrThrow(deviceRepository.findByCode(row.get("vehicleCode")), "Số xe", row.get("vehicleCode")));
        trip.setTripCount(parseIntOrNull(row.get("tripCount")));

        CargoType cargoType = findOrThrow(cargoTypeRepository.findByName(row.get("cargoTypeName")), "Loại hàng", row.get("cargoTypeName"));
        trip.setCargoType(cargoType);
        trip.setCargoGroup(cargoType.getCargoGroup()); // luôn tự lấy theo Loại hàng, không đọc từ cột Excel

        LoadLevel loadLevel = parseLoadLevelDisplay(row.get("loadLevelDisplay"));
        trip.setLoadLevel(loadLevel);

        return trip;
    }

    /**
     * Parse ngược chuỗi hiển thị gộp từ cột "Mức tải":
     * - "Đủ tải"       -> FULL_LOAD
     * - "Roda (2/3)"   -> RODA_2_3
     * - "Khác (3/4)"   -> OTHER, customValue = "3/4"
     */
    private LoadLevel parseLoadLevelDisplay(String display) {
        LoadLevel loadLevel = new LoadLevel();

        if ("Đủ tải".equals(display)) {
            loadLevel.setType(LoadLevelType.FULL_LOAD);
            loadLevel.setCustomValue(null);
            return loadLevel;
        }

        if ("Roda (2/3)".equals(display)) {
            loadLevel.setType(LoadLevelType.RODA_2_3);
            loadLevel.setCustomValue(null);
            return loadLevel;
        }

        Matcher matcher = OTHER_LOAD_LEVEL_PATTERN.matcher(display != null ? display.trim() : "");
        if (matcher.matches()) {
            String customValue = matcher.group(1).trim();
            if (!customValue.matches("^\\d+/\\d+$")) {
                throw new IllegalArgumentException(
                        "Mức tải 'Khác' cần giá trị dạng x/y, ví dụ 'Khác (1/2)' — nhận được: '" + display + "'");
            }
            loadLevel.setType(LoadLevelType.OTHER);
            loadLevel.setCustomValue(customValue);
            return loadLevel;
        }

        throw new IllegalArgumentException(
                "Mức tải không hợp lệ: '" + display + "' (chấp nhận: 'Đủ tải', 'Roda (2/3)', hoặc 'Khác (x/y)')");
    }

    private boolean isSameTrip(ExcavationReportTrip a, ExcavationReportTrip b) {
        return Objects.equals(a.getVehicle().getId(), b.getVehicle().getId())
                && Objects.equals(a.getTripCount(), b.getTripCount())
                && Objects.equals(a.getCargoType().getId(), b.getCargoType().getId())
                && a.getLoadLevel().getType() == b.getLoadLevel().getType()
                && Objects.equals(a.getLoadLevel().getCustomValue(), b.getLoadLevel().getCustomValue());
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private <T> T findOrThrow(Optional<T> optional, String label, String value) {
        return optional.orElseThrow(() -> new IllegalArgumentException(
                "Không tìm thấy " + label + " '" + value + "'"));
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
        for (int c = 0; c < 5; c++) {
            if (!formatter.formatCellValue(row.getCell(c)).trim().isEmpty()) return false;
        }
        return true;
    }
}