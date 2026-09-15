package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ReconciliationSearchRequest;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.dto.response.ReconciliationRowResponse;
import com.ecotel.thong_ke_cao_son.model.*;
import com.ecotel.thong_ke_cao_son.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * {@code ReconciliationService.search()} — ghép cặp Vận tải/Khai thác khi
 * NHIỀU chuyến cùng khoá (ngày+ca+xe+máy xúc). Quality Gate lượt 2 của Codex
 * (2026-09-10): thuật toán ghép dùng {@code Deque.poll()} theo đúng THỨ TỰ
 * repository trả về — trước đây {@code TransportReportTripRepository
 * .findForReconciliation} KHÔNG có {@code ORDER BY} nên Postgres không đảm
 * bảo thứ tự ổn định giữa các lần gọi, khiến "ai ghép với ai" không xác định
 * khi nhiều chuyến trùng khoá. Đã sửa bằng cách thêm {@code ORDER BY
 * r.reportDate, t.id} (khớp {@code ExcavationReportTripRepository}).
 *
 * <p>Test này mock repository trả về danh sách ĐÃ SẮP XẾP (đúng như sau khi
 * sửa) và xác nhận việc ghép cặp bám đúng thứ tự đó — chuyến Vận tải id=1
 * LUÔN ghép với chuyến Khai thác id=1 (không phải id=2), id=2 ghép id=2 —
 * khoá lại hợp đồng "đầu vào có thứ tự -> ghép cặp xác định" mà tính đúng
 * đắn của thuật toán {@code poll()} phụ thuộc vào.
 *
 * <p>Chạy thuần Mockito — repository/DB thật không có trong CI (project rule
 * mục 3), nên phần "Postgres có thật sự ORDER BY đúng không" phải verify
 * sống qua preview (đã làm), không phải qua unit test.
 */
@ExtendWith(MockitoExtension.class)
class ReconciliationServicePairingTest {

    @Mock private TransportReportTripRepository transportReportTripRepository;
    @Mock private ExcavationReportTripRepository excavationReportTripRepository;
    @Mock private ReconciliationDecisionRepository reconciliationDecisionRepository;
    @Mock private ReconciliationDataHistoryRepository reconciliationDataHistoryRepository;
    @Mock private CargoTypeRepository cargoTypeRepository;
    @Mock private UserRepository userRepository;
    @Mock private TransportReportRepository transportReportRepository;
    @Mock private ExcavationReportRepository excavationReportRepository;
    @Mock private ReconciliationEventPublisher reconciliationEventPublisher;

    private ReconciliationService newService() {
        return new ReconciliationService(transportReportTripRepository, excavationReportTripRepository,
                reconciliationDecisionRepository, reconciliationDataHistoryRepository, cargoTypeRepository,
                userRepository, transportReportRepository, excavationReportRepository, reconciliationEventPublisher);
    }

    private static Shift shift(long id) {
        Shift s = new Shift();
        s.setId(id);
        s.setName(1);
        return s;
    }

    private static Device device(long id, String code) {
        Device d = new Device();
        d.setId(id);
        d.setCode(code);
        d.setName(code);
        return d;
    }

    private static User employee(long id) {
        User u = new User();
        u.setId(id);
        u.setSalaryCode("NV" + id);
        u.setFullName("Nhân viên " + id);
        return u;
    }

    private static CargoType cargoType(long id) {
        CargoType c = new CargoType();
        c.setId(id);
        c.setName("Đất");
        return c;
    }

    /** Cùng khoá (ngày+ca+xe+máy xúc) cho MỌI trip — mục đích của test là buộc chúng cạnh tranh ghép cặp. */
    private static TransportReportTrip transportTrip(long id, LocalDate date, Shift shift, Device vehicle,
                                                       Device excavator, User emp) {
        return transportTrip(id, id, date, shift, vehicle, excavator, emp);
    }

    /** Như trên, nhưng cho phép tách rời id của trip khỏi id của CargoType — dùng để mô phỏng "khớp theo NỘI DUNG, không phải theo id". */
    private static TransportReportTrip transportTrip(long id, long cargoTypeId, LocalDate date, Shift shift,
                                                       Device vehicle, Device excavator, User emp) {
        TransportReport report = new TransportReport();
        report.setReportDate(date);
        report.setShift(shift);
        report.setVehicle(vehicle);
        report.setEmployee(emp);

        TransportReportTrip trip = new TransportReportTrip();
        trip.setId(id);
        trip.setTransportReport(report);
        trip.setExcavationArea(new ExcavationArea());
        trip.setExcavator(excavator);
        trip.setLoadingPoint(new ReceivingPoint());
        trip.setUnloadingPoint(new UnloadingPoint());
        trip.setCargoType(cargoType(cargoTypeId));
        trip.setTripCount(1);
        trip.setRainyDay(false);
        trip.setSupplementaryVehicle(false);
        return trip;
    }

    private static ExcavationReportTrip excavationTrip(long id, LocalDate date, Shift shift, Device vehicle,
                                                         Device excavator, User emp) {
        return excavationTrip(id, id, date, shift, vehicle, excavator, emp);
    }

    private static ExcavationReportTrip excavationTrip(long id, long cargoTypeId, LocalDate date, Shift shift,
                                                         Device vehicle, Device excavator, User emp) {
        ExcavationReport report = new ExcavationReport();
        report.setReportDate(date);
        report.setShift(shift);
        report.setExcavatorDevice(excavator);
        report.setEmployee(emp);

        ExcavationReportTrip trip = new ExcavationReportTrip();
        trip.setId(id);
        trip.setExcavationReport(report);
        trip.setVehicle(vehicle);
        trip.setCargoType(cargoType(cargoTypeId));
        trip.setTripCount(1);
        return trip;
    }

    /** Stub chung: decision/history rỗng cho mọi id trong danh sách — dùng lại ở nhiều test. */
    private void stubEmptyDecisionsAndHistory(List<Long> transportIds, List<Long> excavationIds) {
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(transportIds)).thenReturn(List.of());
        when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(excavationIds)).thenReturn(List.of());
        when(reconciliationDataHistoryRepository.findDistinctTripIdBySideAndTripIdIn(
                com.ecotel.thong_ke_cao_son.enums.ReconciliationSide.TRANSPORT, transportIds)).thenReturn(List.of());
        when(reconciliationDataHistoryRepository.findDistinctTripIdBySideAndTripIdIn(
                com.ecotel.thong_ke_cao_son.enums.ReconciliationSide.EXCAVATION, excavationIds)).thenReturn(List.of());
    }

    @Test
    @DisplayName("3 chuyến Vận tải + 3 chuyến Khai thác CÙNG khoá, đầu vào đã sắp xếp -> ghép đúng theo thứ tự (id 1-1, 2-2, 3-3)")
    void pairsDeterministicallyByRepositoryOrderWhenMultipleTripsShareTheSameKey() {
        LocalDate date = LocalDate.of(2026, 9, 10);
        Shift shift = shift(1L);
        Device vehicle = device(10L, "468");
        Device excavator = device(20L, "P17");
        User emp = employee(1L);

        // Đầu vào ĐÃ sắp xếp theo id tăng dần — đúng những gì ORDER BY r.reportDate, t.id
        // giờ đảm bảo ở tầng repository (không test được thật ở đây, xem javadoc lớp).
        List<TransportReportTrip> transportTrips = List.of(
                transportTrip(1L, date, shift, vehicle, excavator, emp),
                transportTrip(2L, date, shift, vehicle, excavator, emp),
                transportTrip(3L, date, shift, vehicle, excavator, emp));
        List<ExcavationReportTrip> excavationTrips = List.of(
                excavationTrip(1L, date, shift, vehicle, excavator, emp),
                excavationTrip(2L, date, shift, vehicle, excavator, emp),
                excavationTrip(3L, date, shift, vehicle, excavator, emp));

        when(transportReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(transportTrips);
        when(excavationReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(excavationTrips);
        when(reconciliationDecisionRepository.findByTransportReportTrip_IdIn(List.of(1L, 2L, 3L)))
                .thenReturn(List.of());
        when(reconciliationDecisionRepository.findByExcavationReportTrip_IdIn(List.of(1L, 2L, 3L)))
                .thenReturn(List.of());
        when(reconciliationDataHistoryRepository.findDistinctTripIdBySideAndTripIdIn(
                com.ecotel.thong_ke_cao_son.enums.ReconciliationSide.TRANSPORT, List.of(1L, 2L, 3L)))
                .thenReturn(List.of());
        when(reconciliationDataHistoryRepository.findDistinctTripIdBySideAndTripIdIn(
                com.ecotel.thong_ke_cao_son.enums.ReconciliationSide.EXCAVATION, List.of(1L, 2L, 3L)))
                .thenReturn(List.of());

        ReconciliationSearchRequest request = new ReconciliationSearchRequest();
        request.setFromDate(date);
        request.setToDate(date);

        Pageable pageable = PageRequest.of(0, 20);
        PageResponse<ReconciliationRowResponse> result = newService().search(request, pageable);

        List<Long> transportIdsInOrder = new ArrayList<>();
        List<Long> excavationIdsInOrder = new ArrayList<>();
        for (ReconciliationRowResponse row : result.getContent()) {
            transportIdsInOrder.add(row.getTransportReportTripId());
            excavationIdsInOrder.add(row.getExcavationReportTripId());
        }

        assertThat(transportIdsInOrder).containsExactly(1L, 2L, 3L);
        // Đúng hợp đồng poll() theo thứ tự chèn: chuyến Vận tải id=N ghép ĐÚNG
        // chuyến Khai thác id=N khi cả hai repository trả về theo cùng thứ tự
        // tăng dần (ORDER BY r.reportDate, t.id ở cả hai phía).
        assertThat(excavationIdsInOrder).containsExactly(1L, 2L, 3L);
    }

    @Test
    @DisplayName("2 bên nhập CÙNG khoá theo THỨ TỰ KHÁC NHAU (id không tương ứng) -> vẫn ghép ĐÚNG theo nội dung (cargoType), không theo id (Quality Gate lượt 3)")
    void pairsByContentEvenWhenTwoSidesInsertInDifferentOrder() {
        LocalDate date = LocalDate.of(2026, 9, 10);
        Shift shift = shift(1L);
        Device vehicle = device(10L, "468");
        Device excavator = device(20L, "P17");
        User emp = employee(1L);

        // Vận tải nhập "chuyến cargoType=5" (id transport=1) RỒI "chuyến
        // cargoType=7" (id transport=2). Khai thác nhập NGƯỢC LẠI: "chuyến
        // cargoType=7" trước (id excavation=1), "chuyến cargoType=5" sau (id
        // excavation=2) — ĐÚNG kịch bản thật Codex nêu: 2 sequence ID độc
        // lập, không có quan hệ thứ tự. Ghép theo id/insertion-order (thuật
        // toán CŨ) sẽ ghép NHẦM (transport id=1 với excavation id=1, dù
        // cargoType lệch 5 vs 7) — ghép theo NỘI DUNG (thuật toán MỚI) phải
        // ra đúng transport(cargoType=5)-excavation(cargoType=5).
        TransportReportTrip transport1 = transportTrip(1L, 5L, date, shift, vehicle, excavator, emp);
        TransportReportTrip transport2 = transportTrip(2L, 7L, date, shift, vehicle, excavator, emp);
        ExcavationReportTrip excavation1 = excavationTrip(1L, 7L, date, shift, vehicle, excavator, emp);
        ExcavationReportTrip excavation2 = excavationTrip(2L, 5L, date, shift, vehicle, excavator, emp);

        List<Long> transportIds = List.of(1L, 2L);
        List<Long> excavationIds = List.of(1L, 2L);
        when(transportReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(List.of(transport1, transport2));
        when(excavationReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(List.of(excavation1, excavation2));
        stubEmptyDecisionsAndHistory(transportIds, excavationIds);

        ReconciliationSearchRequest request = new ReconciliationSearchRequest();
        request.setFromDate(date);
        request.setToDate(date);
        PageResponse<ReconciliationRowResponse> result = newService().search(request, PageRequest.of(0, 20));

        var byTransportId = result.getContent().stream()
                .collect(java.util.stream.Collectors.toMap(ReconciliationRowResponse::getTransportReportTripId, r -> r));

        assertThat(byTransportId.get(1L).getExcavationReportTripId()).as("transport(cargoType=5) phải ghép excavation(cargoType=5) = id 2, KHÔNG phải id 1").isEqualTo(2L);
        assertThat(byTransportId.get(2L).getExcavationReportTripId()).as("transport(cargoType=7) phải ghép excavation(cargoType=7) = id 1, KHÔNG phải id 2").isEqualTo(1L);
        assertThat(byTransportId.get(1L).getPairingAmbiguous()).as("ghép được CHÍNH XÁC theo nội dung -> KHÔNG mơ hồ").isFalse();
        assertThat(byTransportId.get(2L).getPairingAmbiguous()).isFalse();
    }

    @Test
    @DisplayName("Nhiều ứng viên cùng khoá, KHÔNG cái nào khớp nội dung -> ambiguity THẬT, vẫn trả đủ dòng nhưng đánh dấu pairingAmbiguous")
    void flagsGenuineAmbiguityWhenNoCandidateMatchesByContent() {
        LocalDate date = LocalDate.of(2026, 9, 10);
        Shift shift = shift(1L);
        Device vehicle = device(10L, "468");
        Device excavator = device(20L, "P17");
        User emp = employee(1L);

        // 2 chuyến Vận tải CÙNG cargoType=5 (không phân biệt được với nhau
        // theo nội dung), 2 chuyến Khai thác CÙNG cargoType=9 (khác hẳn cả
        // hai bên Vận tải) — không có ứng viên nào isMatched với transport
        // nào cả => ambiguity thật sự theo đúng định nghĩa, không phải lỗi.
        TransportReportTrip transport1 = transportTrip(1L, 5L, date, shift, vehicle, excavator, emp);
        TransportReportTrip transport2 = transportTrip(2L, 5L, date, shift, vehicle, excavator, emp);
        ExcavationReportTrip excavation1 = excavationTrip(1L, 9L, date, shift, vehicle, excavator, emp);
        ExcavationReportTrip excavation2 = excavationTrip(2L, 9L, date, shift, vehicle, excavator, emp);

        List<Long> transportIds = List.of(1L, 2L);
        List<Long> excavationIds = List.of(1L, 2L);
        when(transportReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(List.of(transport1, transport2));
        when(excavationReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(List.of(excavation1, excavation2));
        stubEmptyDecisionsAndHistory(transportIds, excavationIds);

        ReconciliationSearchRequest request = new ReconciliationSearchRequest();
        request.setFromDate(date);
        request.setToDate(date);
        PageResponse<ReconciliationRowResponse> result = newService().search(request, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).as("vẫn phải ghép đủ — không được để trống dòng dù mơ hồ")
                .allMatch(row -> row.getExcavationReportTripId() != null);
        assertThat(result.getContent()).as("cả 2 dòng đều phải đánh dấu mơ hồ — không có tín hiệu nội dung nào phân biệt được")
                .allMatch(row -> Boolean.TRUE.equals(row.getPairingAmbiguous()));
    }

    @Test
    @DisplayName("2 ứng viên Khai thác CÙNG khớp nội dung với 1 chuyến Vận tải -> ambiguous (Quality Gate lượt 4 — lỗi thật ở bản trước: chỉ dừng ở ứng viên khớp ĐẦU TIÊN)")
    void flagsAmbiguityWhenMultipleCandidatesAllMatchByContent() {
        LocalDate date = LocalDate.of(2026, 9, 10);
        Shift shift = shift(1L);
        Device vehicle = device(10L, "468");
        Device excavator = device(20L, "P17");
        User emp = employee(1L);

        // 1 chuyến Vận tải, 2 chuyến Khai thác CÙNG khoá VÀ CÙNG khớp đủ 4
        // trường isMatched (cargoType/tripCount/loadLevel/employee) với
        // chuyến Vận tải đó — không có căn cứ nào để chọn excavation1 thay
        // vì excavation2 (hay ngược lại), dù cả hai đều "khớp". Bản trước
        // (lượt 3) chỉ duyệt tới ứng viên khớp ĐẦU TIÊN rồi dừng, không kiểm
        // tra còn ứng viên nào khác cũng khớp — chọn excavation1, đánh dấu
        // SAI thành ambiguous=false dù không có bằng chứng đó là đúng cặp.
        TransportReportTrip transport1 = transportTrip(1L, 5L, date, shift, vehicle, excavator, emp);
        ExcavationReportTrip excavation1 = excavationTrip(1L, 5L, date, shift, vehicle, excavator, emp);
        ExcavationReportTrip excavation2 = excavationTrip(2L, 5L, date, shift, vehicle, excavator, emp);

        List<Long> transportIds = List.of(1L);
        List<Long> excavationIds = List.of(1L, 2L);
        when(transportReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(List.of(transport1));
        when(excavationReportTripRepository.findForReconciliation(date, date, null, null))
                .thenReturn(List.of(excavation1, excavation2));
        stubEmptyDecisionsAndHistory(transportIds, excavationIds);

        ReconciliationSearchRequest request = new ReconciliationSearchRequest();
        request.setFromDate(date);
        request.setToDate(date);
        PageResponse<ReconciliationRowResponse> result = newService().search(request, PageRequest.of(0, 20));

        // Ghép 1 chuyến Vận tải -> tối đa 1 dòng có transportReportTripId=1;
        // chuyến Khai thác còn lại (không được chọn) rơi vào dòng riêng
        // (nhánh "remaining" trong search()).
        ReconciliationRowResponse transportRow = result.getContent().stream()
                .filter(r -> Long.valueOf(1L).equals(r.getTransportReportTripId()))
                .findFirst().orElseThrow();

        assertThat(transportRow.getExcavationReportTripId()).as("vẫn phải ghép 1 trong 2, không để trống")
                .isIn(1L, 2L);
        assertThat(transportRow.getPairingAmbiguous())
                .as("2 ứng viên cùng khớp -> không có căn cứ chọn 1 trong 2 -> PHẢI ambiguous=true")
                .isTrue();
    }
}
