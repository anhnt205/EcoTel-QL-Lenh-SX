package com.ecotel.thong_ke_cao_son.exception;

/**
 * Kỳ còn chuyến VẬN TẢI chưa được duyệt đối chiếu (QĐ-16) — trạng thái BÌNH
 * THƯỜNG khi kỳ đang duyệt dở, KHÔNG phải lỗi nghiệp vụ/dữ liệu thật.
 *
 * <p>Tách riêng khỏi {@link BadRequestException} để
 * {@code ProductionAutoRecalculateListener} phân biệt được: chỉ trường hợp
 * NÀY mới im lặng bỏ qua (log debug) sau khi tự động tính lại thất bại; mọi
 * {@code BadRequestException} khác ném ra từ {@code calculatePeriod} (kỳ đã
 * chốt, chưa có chuyến nào, hở tháng, tra trượt tham số định mức bắt buộc)
 * là lỗi THẬT, phải log mức lỗi để còn biết mà xử lý tay — trước đây bị bắt
 * chung một chỗ với cùng {@code BadRequestException} nên tất cả đều bị nuốt
 * y hệt nhau. Phát hiện qua Quality Gate của Codex (lượt 2, 2026-09-10).
 */
public class PeriodNotFullyApprovedException extends BadRequestException {
    public PeriodNotFullyApprovedException(String message) {
        super(message);
    }
}
