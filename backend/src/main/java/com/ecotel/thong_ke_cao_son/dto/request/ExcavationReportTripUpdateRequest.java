package com.ecotel.thong_ke_cao_son.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Payload sửa MỘT chuyến Khai thác — bản đối xứng của
 * {@link TransportReportTripUpdateRequest}, xem javadoc ở đó cho lý do đầy đủ.
 *
 * <p>Khác biệt duy nhất: phiếu Khai thác định danh bằng (Ngày, Ca, MÁY XÚC,
 * Số thẻ lương) — {@code excavatorDeviceId} thay cho {@code vehicleId}. Trên
 * bản ghi chuyến Khai thác vẫn có {@code vehicleId} riêng ("Số xe" của chuyến),
 * đó là trường cấp CHUYẾN, không phải cấp phiếu — đừng nhầm hai cái.
 */
@Getter
@Setter
public class ExcavationReportTripUpdateRequest extends ExcavationReportTripRequest {

    private LocalDate reportDate;
    private Long shiftId;
    private Long excavatorDeviceId;
    private Long employeeId;
}
