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
                rowData.put("cargoTypeName", formatter.formatCellValue(row.getCell(15)).trim());
                rowData.put("loadLevelLabel", formatter.formatCellValue(row.getCell(17)).trim());
                rowData.put("loadLevelCustomValue", formatter.formatCellValue(row.getCell(18)).trim());

                rawRows.add(rowData);
            }
        } catch (Exception e) {
            throw new RuntimeException("Không đọc được file Excel: " + e.getMessage(), e);
        }

        // Gom nhóm theo key: Thời gian + Ca + Máy xúc + Số thẻ lương — xác định 1 báo cáo
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

        // Cell Excel lưu dưới dạng ngày thật -> đọc trực tiếp giá trị ngày,
        // KHÔNG phụ thuộc cell đang hiển thị theo format nào (M/d/yy, dd/MM/yyyy...)
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }

        // Cell là Text thuần -> chỉ chấp nhận đúng định dạng dd/MM/yyyy
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

        // Xác định báo cáo mới hay đã tồn tại dựa trên Thời gian + Ca + Máy xúc + Số thẻ lương
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

        // Chỉ thêm mới, không xóa. Dedup theo nội dung để tránh trùng khi import lại cùng file.
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
        trip.setCargoGroup(cargoType.getCargoGroup());

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