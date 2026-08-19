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
            "Thời gian", "Ca", "Máy xúc", "Đơn vị quản lý thiết bị", "Tầng xúc", "Nơi nhận tải",
            "Số thẻ lương", "Họ và tên",
            "Nhiên liệu tồn đầu", "Nhiên liệu tồn cuối", "Nhiên liệu lĩnh", "Nhiên liệu sử dụng",
            "Số xe", "Đơn vị công tác", "Chủng loại xe",
            "Số chuyến", "Loại hàng", "Nhóm hàng",
            "Mức tải"
    };

    private static final int[] COLUMN_WIDTHS = {
            12, 6, 12, 20, 12, 16,
            14, 22,
            14, 14, 12, 14,
            12, 20, 16,
            10, 16, 16,
            18
    };

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String FONT_NAME = "Times New Roman";

    public byte[] export(List<ExcavationReport> reports) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Báo cáo khai thác");

            CellStyle headerStyle = buildHeaderStyle(workbook);
            CellStyle dataStyle = buildDataStyle(workbook, false);
            CellStyle numericDataStyle = buildDataStyle(workbook, true);
            CellStyle dateTextStyle = buildDateTextStyle(workbook);
            CellStyle dateColumnDefaultStyle = buildDateColumnDefaultStyle(workbook);

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
            throw new RuntimeException("Lỗi khi xuất Excel báo cáo khai thác", e);
        }
    }

    private void writeRow(Row row, ExcavationReport report, ExcavationReportTrip trip,
                          CellStyle dataStyle, CellStyle numericDataStyle, CellStyle dateTextStyle) {
        row.setHeightInPoints(-1);
        int c = 0;

        Cell dateCell = row.createCell(c++);
        dateCell.setCellValue(report.getReportDate().format(DATE_FMT));
        dateCell.setCellStyle(dateTextStyle);

        setNumeric(row, c++, report.getShift().getName(), numericDataStyle);
        setText(row, c++, report.getExcavatorDevice().getCode(), dataStyle);
        setText(row, c++, report.getExcavatorDevice().getDepartment() != null
                ? report.getExcavatorDevice().getDepartment().getName() : "", dataStyle);
        setText(row, c++, report.getExcavationFloor() != null ? report.getExcavationFloor() : "", dataStyle);
        setText(row, c++, report.getReceivingLocation().getName(), dataStyle);
        setText(row, c++, report.getEmployee().getSalaryCode(), dataStyle);
        setText(row, c++, report.getEmployee().getFullName(), dataStyle);
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

        setNumeric(row, c++, trip.getTripCount() != null ? trip.getTripCount().doubleValue() : null, numericDataStyle);
        setText(row, c++, trip.getCargoType().getName(), dataStyle);
        setText(row, c++, trip.getCargoGroup().getName(), dataStyle);
        setText(row, c++, loadLevelDisplay(trip.getLoadLevel().getType(), trip.getLoadLevel().getCustomValue()), dataStyle);
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

    private CellStyle buildDateColumnDefaultStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setFontName(FONT_NAME);
        font.setFontHeightInPoints((short) 11);

        CellStyle style = workbook.createCellStyle();
        style.setFont(font);

        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("@"));

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

    // Gộp Mức tải + Giá trị khác vào cùng 1 cột — ví dụ "Khác (3/4)"
    private String loadLevelDisplay(LoadLevelType type, String customValue) {
        return switch (type) {
            case FULL_LOAD -> "Đủ tải";
            case RODA_2_3 -> "Roda (2/3)";
            case OTHER -> "Khác (" + (customValue != null ? customValue : "") + ")";
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