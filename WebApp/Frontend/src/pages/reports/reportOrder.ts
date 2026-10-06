import { ReportEnum } from "../../enums";

// Thứ tự hiển thị và số thứ tự 01..20 trong "Danh sách báo cáo" (theo thứ tự
// khai báo của ReportEnum). reportOrder.test.ts đảm bảo không biểu mẫu nào bị
// sót hoặc lặp khi thêm/bớt ReportEnum.
export const REPORT_ORDER: ReportEnum[] = [
  ReportEnum.INACTIVE_VEHICLES,
  ReportEnum.EXCAVATOR_TRIP_LIST,
  ReportEnum.CAR_TRIP_LIST,
  ReportEnum.WORK_REPORT_SLIP,
  ReportEnum.TIMESHEET,
  ReportEnum.MEAL_REPORT_SLIP,
  ReportEnum.SHIFT_HANDOVER,
  ReportEnum.STAFF_SHIFT_HANDOVER,
  ReportEnum.SHIFT_SUMMARY_GRADER,
  ReportEnum.SHIFT_SUMMARY_DRILL,
  ReportEnum.SHIFT_SUMMARY_EXCAVATOR,
  ReportEnum.SHIFT_SUMMARY_CAR,
  ReportEnum.DATE_TRIP_CAR,
  ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
  ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
  ReportEnum.PRODUCTIVITY_CAR_REPORT,
  ReportEnum.PRODUCTION_LAND_CAR_REPORT,
  ReportEnum.PRODUCTION_COAL_CAR_REPORT,
  ReportEnum.PRODUCTION_FUEL_MONITORING,
  ReportEnum.DAILY_ORDER,
];
