package com.ecotel.thong_ke_cao_son.repository;

import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExcavationReportRepository extends JpaRepository<ExcavationReport, Long> {

    @Query("""
        SELECT r FROM ExcavationReport r
        WHERE r.reportDate BETWEEN :fromDate AND :toDate
          AND (:shiftIds IS NULL OR r.shift.id IN :shiftIds)
          AND (:excavatorIds IS NULL OR r.excavatorDevice.id IN :excavatorIds)
          AND (:receivingLocationIds IS NULL OR r.receivingLocation.id IN :receivingLocationIds)
          AND (:excavationFloors IS NULL OR r.excavationFloor IN :excavationFloors)
        ORDER BY r.reportDate DESC
        """)
    Page<ExcavationReport> search(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("shiftIds") List<Long> shiftIds,
            @Param("excavatorIds") List<Long> excavatorIds,
            @Param("receivingLocationIds") List<Long> receivingLocationIds,
            @Param("excavationFloors") List<String> excavationFloors,
            Pageable pageable);

    Optional<ExcavationReport> findByReportDateAndShiftIdAndExcavatorDeviceIdAndEmployeeId(
            LocalDate reportDate, Long shiftId, Long excavatorDeviceId, Long employeeId);

    /**
     * Toàn bộ giá trị Tầng xúc khác rỗng trong khoảng ngày — KHÔNG phân
     * trang, KHÔNG lọc theo ca/máy xúc/nơi nhận tải/chính tầng xúc.
     *
     * <p>"Tầng xúc" là chuỗi tự do, không có danh mục riêng — màn nhập liệu
     * phải tự gom giá trị từ dữ liệu để làm tuỳ chọn lọc. Trước đây gom từ
     * kết quả TRANG ĐANG XEM của {@link #search}, nên tầng chỉ xuất hiện ở
     * trang sau (hoặc bị chính bộ lọc khác giấu đi) không bao giờ chọn được.
     * Truy vấn này ĐỘC LẬP với {@code Pageable} và mọi bộ lọc khác — chỉ còn
     * phụ thuộc khoảng ngày, khớp đúng cách {@code knownBenches} phía
     * frontend reset khi đổi khoảng ngày.
     */
    @Query("""
        SELECT DISTINCT r.excavationFloor FROM ExcavationReport r
        WHERE r.reportDate BETWEEN :fromDate AND :toDate
          AND r.excavationFloor IS NOT NULL AND r.excavationFloor <> ''
        ORDER BY r.excavationFloor
        """)
    List<String> findDistinctExcavationFloors(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
