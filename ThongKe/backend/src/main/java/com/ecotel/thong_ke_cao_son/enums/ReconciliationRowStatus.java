package com.ecotel.thong_ke_cao_son.enums;

/**
 * Trạng thái TÍNH TOÁN của một dòng Đối chiếu (không phải trạng thái thật lưu
 * trên {@link ApprovalStatus} của trip/decision) — quyết định màu bôi ở bảng
 * Đối chiếu. {@code AWAITING_REAPPROVAL} chỉ tồn tại ở đây, không bao giờ được
 * gán vào cột CSDL nào.
 */
public enum ReconciliationRowStatus {
    PENDING,             // Chờ đối soát, chưa từng có vấn đề — trắng
    APPROVED,             // Đã duyệt — trắng
    REVISION_REQUESTED,   // Còn ít nhất 1 bên đang chờ sửa — đỏ nhạt
    AWAITING_REAPPROVAL   // Cả 2 bên đã gửi lại, chờ thống kê viên duyệt lại — vàng nhạt
}
