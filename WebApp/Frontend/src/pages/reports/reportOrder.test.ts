import { ReportEnum } from "../../enums";
import { REPORT_ORDER } from "./reportOrder";

describe("REPORT_ORDER", () => {
  it("liệt kê đủ mọi biểu mẫu trong ReportEnum, mỗi biểu mẫu đúng 1 lần", () => {
    const all = Object.values(ReportEnum) as string[];
    expect([...REPORT_ORDER].sort()).toEqual([...all].sort());
    expect(new Set(REPORT_ORDER).size).toBe(REPORT_ORDER.length);
  });

  it("giữ đúng thứ tự số thứ tự đã chốt (Báo cáo chuyến là số 13)", () => {
    expect(REPORT_ORDER.indexOf(ReportEnum.DATE_TRIP_CAR) + 1).toBe(13);
    expect(REPORT_ORDER.indexOf(ReportEnum.MEAL_REPORT_SLIP) + 1).toBe(6);
  });
});
