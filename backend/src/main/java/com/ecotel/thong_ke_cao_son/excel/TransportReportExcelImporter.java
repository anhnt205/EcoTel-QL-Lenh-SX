package com.ecotel.thong_ke_cao_son.excel;

import com.ecotel.thong_ke_cao_son.dto.response.ExcelImportResultResponse;
import com.ecotel.thong_ke_cao_son.model.ExcavationArea;
import com.ecotel.thong_ke_cao_son.model.ReceivingPoint;
import com.ecotel.thong_ke_cao_son.repository.ExcavationAreaRepository;
import com.ecotel.thong_ke_cao_son.repository.ReceivingPointRepository;
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
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class TransportReportExcelImporter {

    private final TransportReportRepository transportReportRepository;
    private final ShiftRepository shiftRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final ExcavationAreaRepository excavationAreaRepository;
    private final ReceivingPointRepository receivingPointRepository;
    private final CargoTypeRepository cargoTypeRepository;
    private final ReceivingFloorGroupCalculator floorGroupCalculator;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Pattern OTHER_LOAD_VALUE_PATTERN = Pattern.compile("^\\d+/\\d+$");

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
                rowData.put("salaryCode", formatter.formatCellValue(row.getCell(2)).trim());
                rowData.put("fuelBeginning", formatter.formatCellValue(row.getCell(5)).trim());
                rowData.put("fuelEnding", formatter.formatCellValue(row.getCell(6)).trim());
                rowData.put("fuelReceived", formatter.formatCellValue(row.getCell(7)).trim());
                rowData.put("vehicleCode", formatter.formatCellValue(row.getCell(9)).trim());
                rowData.put("rainyDay", formatter.formatCellValue(row.getCell(10)).trim());
                rowData.put("supplementaryVehicle", formatter.formatCellValue(row.getCell(11)).trim());
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

                rawRows.add(rowData);
            }
        } catch (Exception e) {
            throw new RuntimeException("Không đọc được file Excel: " + e.getMessage(), e);
        }

        // Gom nhóm theo key: Thời gian + Ca + Số thẻ lương (KHÔNG còn Số xe — đã chuyển xuống trip)
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
        return LocalDate.parse(value); // ISO yyyy-MM-dd — đã chuẩn hóa từ readDateCell()
    }

    private String buildHeaderKey(Map<String, String> row) {
        return row.get("reportDate") + "|" + row.get("shiftName") + "|" + row.get("vehicleCode") + "|" + row.get("salaryCode");
    }

    private void processGroup(List<Map<String, String>> group) {
        Map<String, String> firstRow = group.get(0);

        LocalDate reportDate = parseDate(firstRow.get("reportDate"));
        Shift shift = findOrThrow(shiftRepository.findByName(parseInt(firstRow.get("shiftName"))), "Ca", firstRow.get("shiftName"));
        User employee = findOrThrow(userRepository.findBySalaryCode(firstRow.get("salaryCode")), "Số thẻ lương", firstRow.get("salaryCode"));
        Device vehicle = findOrThrow(deviceRepository.findByCode(firstRow.get("vehicleCode")), "Số xe", firstRow.get("vehicleCode"));

        // Xác định báo cáo mới hay đã tồn tại: Thời gian + Ca + Số xe + Số thẻ lương
        TransportReport report = transportReportRepository
                .findByReportDateAndShiftIdAndVehicleIdAndEmployeeId(reportDate, shift.getId(), vehicle.getId(), employee.getId())
                .orElseGet(TransportReport::new);

        report.setReportDate(reportDate);
        report.setShift(shift);
        report.setVehicle(vehicle);
        report.setEmployee(employee);
        report.setFuelBeginning(parseDouble(firstRow.get("fuelBeginning")));
        report.setFuelEnding(parseDouble(firstRow.get("fuelEnding")));
        report.setFuelReceived(parseDouble(firstRow.get("fuelReceived")));
        report.recalculateFuelUsed();

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

        trip.setRainyDay("x".equalsIgnoreCase(row.get("rainyDay")));
        trip.setSupplementaryVehicle("x".equalsIgnoreCase(row.get("supplementaryVehicle")));

        ExcavationArea excavationArea = findOrThrow(
                excavationAreaRepository.findByName(row.get("excavationAreaName")), "Khu vực xúc", row.get("excavationAreaName"));
        trip.setExcavationArea(excavationArea);
        trip.setExcavator(findOrThrow(deviceRepository.findByCode(row.get("excavatorCode")), "Máy xúc", row.get("excavatorCode")));
        trip.setLoadingPoint(findOrThrow(receivingPointRepository.findByName(row.get("loadingPointName")), "Nơi nhận tải", row.get("loadingPointName")));
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

        trip.setLoadLevel(parseLoadLevel(row.get("loadLevelLabel")));

        return trip;
    }

    private boolean isSameTrip(TransportReportTrip a, TransportReportTrip b) {
        return Objects.equals(a.getRainyDay(), b.getRainyDay())
                && Objects.equals(a.getSupplementaryVehicle(), b.getSupplementaryVehicle())
                && Objects.equals(a.getExcavationArea().getId(), b.getExcavationArea().getId())
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

    // Cột "Mức tải" chấp nhận: "Đủ tải", "Roda (2/3)", hoặc giá trị dạng x/y (ví dụ "1/2") cho mức tải Khác
    private LoadLevel parseLoadLevel(String raw) {
        String value = raw == null ? "" : raw.trim();
        LoadLevel loadLevel = new LoadLevel();

        if ("Đủ tải".equals(value)) {
            loadLevel.setType(LoadLevelType.FULL_LOAD);
            loadLevel.setCustomValue(null);
            return loadLevel;
        }
        if ("Roda (2/3)".equals(value)) {
            loadLevel.setType(LoadLevelType.RODA_2_3);
            loadLevel.setCustomValue(null);
            return loadLevel;
        }
        if (OTHER_LOAD_VALUE_PATTERN.matcher(value).matches()) {
            loadLevel.setType(LoadLevelType.OTHER);
            loadLevel.setCustomValue(value);
            return loadLevel;
        }

        throw new IllegalArgumentException(
                "Mức tải không hợp lệ: '" + value + "' (chấp nhận: 'Đủ tải', 'Roda (2/3)', hoặc dạng x/y ví dụ 1/2)");
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
        for (int c = 0; c < 3; c++) {
            if (!formatter.formatCellValue(row.getCell(c)).trim().isEmpty()) return false;
        }
        return true;
    }
}