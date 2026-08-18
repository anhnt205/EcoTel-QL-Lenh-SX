package com.ecotel.thong_ke_cao_son.excel;

import com.ecotel.thong_ke_cao_son.model.LoadLevel;
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
            "Thời gian", "Ca", "Số thẻ lương", "Họ và tên", "Đơn vị",
            "Nhiên liệu tồn đầu", "Nhiên liệu tồn cuối", "Nhiên liệu lĩnh", "Nhiên liệu sử dụng",
            "Số xe", "Đơn vị quản lý thiết bị", "Chủng loại xe",
            "Ngày mưa", "Xe bổ túc",
            "Khu vực xúc", "Máy xúc", "Nơi nhận tải", "Tầng nhận tải", "Nhóm tầng nhận tải",
            "Tầng dỡ tải", "Cung độ toàn tuyến (km)", "Nâng tải toàn tuyến (m)",
            "Cung độ dốc cục bộ (km)", "Dốc cục bộ (m)", "Nơi dỡ tải", "Loại hàng", "Nhóm hàng",
            "Số chuyến", "Mức tải"
    };

    private static final int[] COLUMN_WIDTHS = {
            12, 6, 14, 22, 18,
            14, 14, 12, 14,
            12, 20, 16,
            10, 10,
            16, 12, 16, 12, 14,
            14, 16, 16,
            16, 12, 16, 16, 16,
            10, 14
    };

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String FONT_NAME = "Times New Roman";

    public byte[] export(List<TransportReport> reports) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Báo cáo vận tải");

            CellStyle headerStyle = buildHeaderStyle(workbook);
            CellStyle dataStyle = buildDataStyle(workbook, false);
            CellStyle numericDataStyle = buildDataStyle(workbook, true);
            CellStyle dateTextStyle = buildDateTextStyle(workbook);          // Text + border — dùng cho cell có dữ liệu
            CellStyle dateColumnDefaultStyle = buildDateColumnDefaultStyle(workbook); // Chỉ Text, KHÔNG border — dùng cho cả cột

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(32);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, COLUMN_WIDTHS[i] * 256);
            }

            sheet.setDefaultColumnStyle(0, dateColumnDefaultStyle);

            int rowIdx = 1;
            for (TransportReport report : reports) {
                if (report.getTrips().isEmpty()) {
                    writeRow(sheet.createRow(rowIdx++), report, null, dataStyle, numericDataStyle, dateTextStyle);
                    continue;
                }
                for (TransportReportTrip trip : report.getTrips()) {
                    writeRow(sheet.createRow(rowIdx++), report, trip, dataStyle, numericDataStyle, dateTextStyle);
                }
            }

            sheet.createFreezePane(0, 1);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xuất Excel báo cáo vận tải", e);
        }
    }

    private void writeRow(Row row, TransportReport report, TransportReportTrip trip,
                          CellStyle dataStyle, CellStyle numericDataStyle, CellStyle dateTextStyle) {
        row.setHeightInPoints(-1);
        int c = 0;

        // Cột "Thời gian" — dùng style Text riêng thay vì dataStyle thường
        Cell dateCell = row.createCell(c++);
        dateCell.setCellValue(report.getReportDate().format(DATE_FMT));
        dateCell.setCellStyle(dateTextStyle);

        setNumeric(row, c++, report.getShift().getName(), numericDataStyle);
        setText(row, c++, report.getEmployee().getSalaryCode(), dataStyle);
        setText(row, c++, report.getEmployee().getFullName(), dataStyle);
        setText(row, c++, report.getEmployee().getDepartment() != null
                ? report.getEmployee().getDepartment().getName() : "", dataStyle);
        setNumeric(row, c++, report.getFuelBeginning(), numericDataStyle);
        setNumeric(row, c++, report.getFuelEnding(), numericDataStyle);
        setNumeric(row, c++, report.getFuelReceived(), numericDataStyle);
        setNumeric(row, c++, report.getFuelUsed(), numericDataStyle);

        setText(row, c++, report.getVehicle().getCode(), dataStyle);
        setText(row, c++, report.getVehicle().getDepartment() != null
                ? report.getVehicle().getDepartment().getName() : "", dataStyle);
        setText(row, c++, report.getVehicle().getCategory() != null
                ? report.getVehicle().getCategory().getName() : "", dataStyle);

        if (trip == null) {
            for (int i = c; i < HEADERS.length; i++) {
                Cell cell = row.createCell(i);
                cell.setCellStyle(dataStyle);
            }
            return;
        }

        setText(row, c++, Boolean.TRUE.equals(trip.getRainyDay()) ? "x" : "", dataStyle);
        setText(row, c++, Boolean.TRUE.equals(trip.getSupplementaryVehicle()) ? "x" : "", dataStyle);
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
        setText(row, c++, trip.getCargoGroup() != null ? trip.getCargoGroup().getName() : "", dataStyle);
        setNumeric(row, c++, trip.getTripCount() != null ? trip.getTripCount().doubleValue() : null, numericDataStyle);
        setText(row, c++, loadLevelLabel(trip.getLoadLevel()), dataStyle);
    }

    private CellStyle buildDateTextStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setFontName(FONT_NAME);
        font.setFontHeightInPoints((short) 11);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);

        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("@"));

        applyBorder(style);
        applyPadding(style);
        return style;
    }

    // Style rút gọn: CHỈ Text format, không border/font đặc biệt — dùng cho cả cột (setDefaultColumnStyle)
    private CellStyle buildDateColumnDefaultStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setFontName(FONT_NAME);
        font.setFontHeightInPoints((short) 11);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);

        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("@"));

        // Không gọi applyBorder() ở đây — đây chính là điểm khác biệt giải quyết vấn đề border lan ra dòng trống
        return style;
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

    // Với mức tải OTHER, chỉ hiển thị giá trị dạng x/y (không kèm chữ "Khác")
    private String loadLevelLabel(LoadLevel loadLevel) {
        return switch (loadLevel.getType()) {
            case FULL_LOAD -> "Đủ tải";
            case RODA_2_3 -> "Roda (2/3)";
            case OTHER -> loadLevel.getCustomValue() != null ? loadLevel.getCustomValue() : "";
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
        style.setWrapText(true);
        applyBorder(style);
        applyPadding(style);
        return style;
    }

    private void applyPadding(CellStyle style) {
        style.setIndention((short) 1);
    }

    private void applyBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }
}