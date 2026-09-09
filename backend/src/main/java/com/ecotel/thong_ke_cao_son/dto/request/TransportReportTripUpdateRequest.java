package com.ecotel.thong_ke_cao_son.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Payload sửa MỘT chuyến Vận tải (nút bút chì ở màn nhập liệu).
 *
 * <p>Kế thừa toàn bộ trường cấp CHUYẾN từ {@link TransportReportTripRequest},
 * bổ sung bốn trường cấp PHIẾU (Ngày, Ca, Số xe, Số thẻ lương). Bốn trường này
 * KHÔNG nằm trên bản ghi chuyến mà nằm trên {@code TransportReport} — trước đây
 * form sửa chuyến gửi lên đúng payload cấp chuyến nên người dùng đổi Ca (hoặc
 * Ngày/Số xe/Số thẻ lương) thì thay đổi bị **âm thầm bỏ qua**: API vẫn báo lưu
 * thành công nhưng dữ liệu giữ nguyên. Chốt 2026-09-09.
 *
 * <p>Cả bốn đều KHÔNG bắt buộc: bỏ trống nghĩa là "giữ nguyên phiếu hiện tại".
 * Khi có trường khác giá trị hiện tại, chuyến được CHUYỂN sang phiếu đích tương
 * ứng (tìm thấy thì dùng lại, chưa có thì tạo mới) — không đụng các chuyến khác
 * đang nằm chung phiếu cũ.
 *
 * <p>Tách riêng khỏi {@link TransportReportTripRequest} để payload TẠO MỚI phiếu
 * (vốn nhận danh sách chuyến qua {@code TransportReportRequest}) không bị lẫn
 * các trường cấp phiếu vô nghĩa ở ngữ cảnh đó.
 */
@Getter
@Setter
public class TransportReportTripUpdateRequest extends TransportReportTripRequest {

    private LocalDate reportDate;
    private Long shiftId;
    private Long vehicleId;
    private Long employeeId;
}
