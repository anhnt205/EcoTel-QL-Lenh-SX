package com.ecotel.thong_ke_cao_son.excel;

import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
import com.ecotel.thong_ke_cao_son.model.ExcavationReportTrip;
import com.ecotel.thong_ke_cao_son.enums.LoadLevelType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class ExcavationReportExcelExporter {

    private static final String[] HEADERS = {
            "Thời gian", "Ca", "Máy xúc", "Tầng xúc", "Nơi nhận tải",
            "Số thẻ lương", "Họ và tên", "Đơn vị",
            "Nhiên liệu tồn đầu", "Nhiên liệu tồn cuối", "Nhiên liệu lĩnh", "Nhiên liệu sử dụng",
            "Số xe", "Số chuyến", "Vị trí đổ", "Loại hàng", "Nhóm hàng",
            "Mức tải", "Giá trị mức tải khác",
            "Đơn vị quản lý thiết bị", "Chủng loại xe"
    };

    private static final int[] COLUMN_WIDTHS = {
            12, 6, 12, 12, 16,
            14, 22, 18,
            14, 14, 12, 14,
            12, 10, 16, 16, 16,
            14, 16,
            20, 16
    };

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String FONT_NAME = "Times New Roman";

    public byte[] export(List<ExcavationReport> reports) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Báo cáo vận tải");

            CellStyle headerStyle = buildHeaderStyle(workbook);
            CellStyle dataStyle = buildDataStyle(workbook, false);
            CellStyle numericDataStyle = buildDataStyle(workbook, true);
            CellStyle dateTextStyle = buildDateTextStyle(workbook); // style riêng cho cột "Thời gian"

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(32);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, COLUMN_WIDTHS[i] * 256);
            }

            sheet.setDefaultColumnStyle(0, dateTextStyle);

            int rowIdx = 1;
            for (ExcavationReport report : reports) {
                if (report.getTrips().isEmpty()) {
                    writeRow(sheet.createRow(rowIdx++), report, null, dataStyle, numericDataStyle, dateTextStyle);
                    continue;
                }
                for (ExcavationReportTrip trip : report.getTrips()) {
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

    private void writeRow(Row row, ExcavationReport report, ExcavationReportTrip trip,
                          CellStyle dataStyle, CellStyle numericDataStyle, CellStyle dateTextStyle) {
        row.setHeightInPoints(-1);
        int c = 0;

        // Cột "Thời gian" — dùng style Text riêng thay vì dataStyle thường
        Cell dateCell = row.createCell(c++);
        dateCell.setCellValue(report.getReportDate().format(DATE_FMT));
        dateCell.setCellStyle(dateTextStyle);

        setNumeric(row, c++, report.getShift().getName(), numericDataStyle);
        setText(row, c++, report.getExcavatorDevice().getCode(), dataStyle);
        setText(row, c++, report.getExcavationFloor() != null ? report.getExcavationFloor() : "", dataStyle);
        setText(row, c++, report.getReceivingLocation().getName(), dataStyle);
        setText(row, c++, report.getEmployee().getSalaryCode(), dataStyle);
        setText(row, c++, report.getEmployee().getFullName(), dataStyle);
        setText(row, c++, report.getEmployee().getDepartment() != null
                ? report.getEmployee().getDepartment().getName() : "", dataStyle);
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

        setText(row, c++, trip.getVehicle().getCode(), dataStyle);
        setNumeric(row, c++, trip.getTripCount() != null ? trip.getTripCount().doubleValue() : null, numericDataStyle);
        setText(row, c++, trip.getCargoType().getName(), dataStyle);
        setText(row, c++, trip.getCargoGroup().getName(), dataStyle);
        setText(row, c++, loadLevelLabel(trip.getLoadLevel().getType()), dataStyle);
        setText(row, c++, trip.getLoadLevel().getCustomValue() != null ? trip.getLoadLevel().getCustomValue() : "", dataStyle);
        setText(row, c++, trip.getVehicle().getDepartment() != null
                ? trip.getVehicle().getDepartment().getName() : "", dataStyle);
        setText(row, c, trip.getVehicle().getCategory() != null
                ? trip.getVehicle().getCategory().getName() : "", dataStyle);
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

        // Định dạng số "@" = Text — Excel sẽ luôn lưu giá trị nhập vào cột này
        // dưới dạng chuỗi thuần, KHÔNG tự động parse thành ngày dù người dùng gõ 7/8/2026 hay 08-07-2026.
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("@"));

        applyBorder(style);
        applyPadding(style);
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