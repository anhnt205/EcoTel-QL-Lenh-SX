package com.ecotel.thong_ke_cao_son.excel;

import com.ecotel.thong_ke_cao_son.model.TransportReport;
import com.ecotel.thong_ke_cao_son.model.TransportReportTrip;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class TransportReportExcelExporter {

    private static final String[] HEADERS = {
            "Thời gian", "Ca", "Số xe", "Số thẻ lương",
            "Họ và tên", "Đơn vị", "Ngày mưa", "Xe bổ túc",
            "Nhiên liệu tồn đầu", "Nhiên liệu tồn cuối", "Nhiên liệu lĩnh", "Nhiên liệu sử dụng",
            "Khu vực xúc", "Máy xúc", "Nơi nhận tải", "Tầng nhận tải", "Nhóm tầng nhận tải",
            "Tầng dỡ tải", "Cung độ toàn tuyến (km)", "Nâng tải toàn tuyến (m)",
            "Cung độ dốc cục bộ (km)", "Dốc cục bộ (m)", "Nơi dỡ tải", "Loại hàng", "Nhóm hàng",
            "Số chuyến", "Mức tải", "Giá trị mức tải khác",
            "Đơn vị quản lý thiết bị", "Chủng loại xe"
    };

    // Độ rộng cột tính theo đơn vị character-width * 256 (chuẩn Apache POI)
    private static final int[] COLUMN_WIDTHS = {
            12, 6, 12, 14, 22, 18, 10, 10,
            14, 14, 12, 14,
            16, 12, 16, 12, 14,
            14, 16, 16,
            16, 12, 16, 16, 16,
            10, 14, 16,
            20, 16
    };

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String FONT_NAME = "Times New Roman";

    public byte[] export(List<TransportReport> reports) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Báo cáo vận tải");

            CellStyle headerStyle = buildHeaderStyle(workbook);
            CellStyle dataStyle = buildDataStyle(workbook, false);
            CellStyle numericDataStyle = buildDataStyle(workbook, true);

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(32); // padding trên/dưới lớn hơn nhờ tăng chiều cao dòng
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, COLUMN_WIDTHS[i] * 256);
            }

            int rowIdx = 1;
            for (TransportReport report : reports) {
                if (report.getTrips().isEmpty()) {
                    writeRow(sheet.createRow(rowIdx++), report, null, dataStyle, numericDataStyle);
                    continue;
                }
                for (TransportReportTrip trip : report.getTrips()) {
                    writeRow(sheet.createRow(rowIdx++), report, trip, dataStyle, numericDataStyle);
                }
            }

            sheet.createFreezePane(0, 1); // cố định dòng header khi cuộn

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xuất Excel báo cáo vận tải", e);
        }
    }

    private void writeRow(Row row, TransportReport report, TransportReportTrip trip,
                          CellStyle dataStyle, CellStyle numericDataStyle) {
        row.setHeightInPoints(-1); // để Excel/LibreOffice tự tính chiều cao theo nội dung wrap
        int c = 0;

        setText(row, c++, report.getReportDate().format(DATE_FMT), dataStyle);
        setNumeric(row, c++, report.getShift().getName(), numericDataStyle);
        setText(row, c++, report.getDevice().getCode(), dataStyle);
        setText(row, c++, report.getEmployee().getSalaryCode(), dataStyle);
        setText(row, c++, report.getEmployee().getFullName(), dataStyle);
        setText(row, c++, report.getEmployee().getDepartment() != null
                ? report.getEmployee().getDepartment().getName() : "", dataStyle);
        setText(row, c++, Boolean.TRUE.equals(report.getRainyDay()) ? "x" : "", dataStyle);
        setText(row, c++, Boolean.TRUE.equals(report.getSupplementaryVehicle()) ? "x" : "", dataStyle);
        setNumeric(row, c++, report.getFuelBeginning(), numericDataStyle);
        setNumeric(row, c++, report.getFuelEnding(), numericDataStyle);
        setNumeric(row, c++, report.getFuelReceived(), numericDataStyle);
        setNumeric(row, c++, report.getFuelUsed(), numericDataStyle);

        if (trip == null) {
            for (int i = c; i < HEADERS.length; i++) {
                Cell cell = row.createCell(i);
                cell.setCellStyle(dataStyle);
            }
            return;
        }

        setText(row, c++, trip.getExcavationArea().getName(), dataStyle);
        setText(row, c++, trip.getExcavator().getCode(), dataStyle);
        setText(row, c++, trip.getLoadingPoint().getName(), dataStyle);
        setNumeric(row, c++, trip.getReceivingFloor() != null ? trip.getReceivingFloor().doubleValue() : null, numericDataStyle);
        setNumeric(row, c++, trip.getReceivingFloorGroup() != null ? trip.getReceivingFloorGroup().doubleValue() : null, numericDataStyle);
        setText(row, c++, trip.getUnloadingFloor() != null ? trip.getUnloadingFloor() : "", dataStyle);
        setNumeric(row, c++, trip.getTotalRouteDistanceKm(), numericDataStyle);
        setNumeric(row, c++, trip.getTotalRouteLiftM(), numericDataStyle);
        setNumeric(row, c++, trip.getLocalSlopeDistanceKm(), numericDataStyle);
        setNumeric(row, c++, trip.getLocalSlopeM(), numericDataStyle);
        setText(row, c++, trip.getUnloadingPoint().getName(), dataStyle);
        setText(row, c++, trip.getCargoType().getName(), dataStyle);
        setText(row, c++, trip.getCargoGroup().getName(), dataStyle);
        setNumeric(row, c++, trip.getTripCount() != null ? trip.getTripCount().doubleValue() : null, numericDataStyle);
        setText(row, c++, loadLevelLabel(trip.getLoadLevel().getType()), dataStyle);
        setText(row, c++, trip.getLoadLevel().getCustomValue() != null ? trip.getLoadLevel().getCustomValue() : "", dataStyle);
        setText(row, c++, trip.getExcavator().getDepartment() != null
                ? trip.getExcavator().getDepartment().getName() : "", dataStyle);
        setText(row, c, trip.getExcavator().getCategory() != null
                ? trip.getExcavator().getCategory().getName() : "", dataStyle);
    }

    private void setText(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private void setNumeric(Row row, int col, Integer value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value != null) cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void setNumeric(Row row, int col, Double value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value != null) cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private String loadLevelLabel(LoadLevelType type) {
        return switch (type) {
            case FULL_LOAD -> "Đủ tải";
            case RODA_2_3 -> "Roda (2/3)";
            case OTHER -> "Khác";
        };
    }

    private CellStyle buildHeaderStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setFontName(FONT_NAME);
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        applyBorder(style);
        applyPadding(style);
        return style;
    }

    private CellStyle buildDataStyle(Workbook workbook, boolean numeric) {
        Font font = workbook.createFont();
        font.setFontName(FONT_NAME);
        font.setFontHeightInPoints((short) 11);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(numeric ? HorizontalAlignment.RIGHT : HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true); // xuống dòng thay vì ẩn khi text dài hơn độ rộng cột
        applyBorder(style);
        applyPadding(style);
        return style;
    }

    /**
     * Apache POI (chuẩn OOXML) không có thuộc tính "padding" trực tiếp như CSS.
     * Cách xấp xỉ padding trên/dưới lớn hơn 2 bên:
     * - Padding trên/dưới: dùng setHeightInPoints ở dòng header (đã set 32pt ở trên)
     *   + verticalAlignment CENTER để nội dung không dính sát viền trên/dưới.
     * - Padding trái/phải: dùng setIndention (thụt lề nhẹ), tương đương padding ngang nhỏ hơn.
     */
    private void applyPadding(CellStyle style) {
        style.setIndention((short) 1); // thụt lề nhẹ 2 bên, giữ trống hẹp hơn khoảng trên/dưới
    }

    private void applyBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }
}
