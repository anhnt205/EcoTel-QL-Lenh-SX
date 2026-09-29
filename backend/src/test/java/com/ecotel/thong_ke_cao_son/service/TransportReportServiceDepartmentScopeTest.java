package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.TransportReportRequest;
import com.ecotel.thong_ke_cao_son.exception.ForbiddenException;
import com.ecotel.thong_ke_cao_son.mapper.TransportReportMapper;
import com.ecotel.thong_ke_cao_son.model.Department;
import com.ecotel.thong_ke_cao_son.model.Device;
import com.ecotel.thong_ke_cao_son.model.TransportReport;
import com.ecotel.thong_ke_cao_son.permission.PermissionDto;
import com.ecotel.thong_ke_cao_son.repository.*;
import com.ecotel.thong_ke_cao_son.security.AppUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@code TransportReportService} — phân quyền DỮ LIỆU theo đơn vị (Quality
 * Gate lượt 2+3 của Codex, 2026-09-10/11): trước đây tài khoản có đủ quyền
 * CHỨC NĂNG "transport-reports" vẫn đọc/sửa/xoá được báo cáo của xe thuộc
 * đơn vị KHÁC qua API trực tiếp (vd {@code GET /api/transport-reports/{id}})
 * — backend không hề lọc/xác minh theo {@code Device.department}.
 *
 * <p>Nhóm {@code getById} đại diện cho toàn bộ nhóm method áp dụng cùng
 * {@code assertDepartmentAccess} (update/delete/getTrip/updateTrip/
 * deleteTrip/bulk*); nhóm {@code search}/{@code export} test riêng vì dùng
 * {@code currentScopeDepartmentId} — logic khác {@code assertDepartmentAccess}
 * (lượt 3 sửa lỗi KHÔNG NHẤT QUÁN giữa 2 helper này). Chạy thuần Mockito,
 * không {@code @SpringBootTest} — cùng lý do với các test khác trong lớp
 * (project rule mục 3).
 */
@ExtendWith(MockitoExtension.class)
class TransportReportServiceDepartmentScopeTest {

    @Mock private TransportReportRepository transportReportRepository;
    @Mock private TransportReportTripRepository transportReportTripRepository;
    @Mock private ReconciliationDecisionRepository reconciliationDecisionRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private DeviceRepository deviceRepository;
    @Mock private UserRepository userRepository;
    @Mock private LocationRepository locationRepository;
    @Mock private ExcavationAreaRepository excavationAreaRepository;
    @Mock private ReceivingPointRepository receivingPointRepository;
    @Mock private UnloadingPointRepository unloadingPointRepository;
    @Mock private CargoTypeRepository cargoTypeRepository;
    @Mock private ReceivingFloorGroupCalculator floorGroupCalculator;
    @Mock private TransportReportMapper transportReportMapper;
    @Mock private ReconciliationEventPublisher reconciliationEventPublisher;
    @Mock private ReconciliationService reconciliationService;

    private TransportReportService newService() {
        return new TransportReportService(transportReportRepository, transportReportTripRepository,
                reconciliationDecisionRepository, shiftRepository, deviceRepository, userRepository,
                locationRepository, excavationAreaRepository, receivingPointRepository, unloadingPointRepository,
                cargoTypeRepository, floorGroupCalculator, transportReportMapper, reconciliationEventPublisher,
                reconciliationService);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static void loginAs(Long departmentId, boolean fullDataScope) {
        AppUserDetails user = AppUserDetails.builder()
                .permissions(Map.of("transport-reports", PermissionDto.builder().r(true).build()))
                .departmentId(departmentId)
                .fullDataScope(fullDataScope)
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private static TransportReport reportOfDepartment(Long departmentId) {
        Department dept = null;
        if (departmentId != null) {
            dept = new Department();
            dept.setId(departmentId);
        }
        Device vehicle = new Device();
        vehicle.setDepartment(dept);
        TransportReport report = new TransportReport();
        report.setId(100L);
        report.setVehicle(vehicle);
        return report;
    }

    @Nested
    @DisplayName("getById / assertDepartmentAccess")
    class GetById {

        @Test
        @DisplayName("Tài khoản đơn vị KT (id=1) đọc báo cáo xe đơn vị VT (id=2) -> 403 Forbidden")
        void crossDepartmentAccessIsForbidden() {
            loginAs(1L, false);
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(reportOfDepartment(2L)));

            assertThatThrownBy(() -> newService().getById(100L))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("Tài khoản đơn vị KT (id=1) đọc báo cáo CÙNG đơn vị -> cho phép")
        void sameDepartmentAccessIsAllowed() {
            loginAs(1L, false);
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(reportOfDepartment(1L)));

            newService().getById(100L); // không ném lỗi
        }

        @Test
        @DisplayName("Tài khoản fullDataScope=true (Thống kê) -> thấy báo cáo MỌI đơn vị")
        void fullScopeAccountSeesEveryDepartment() {
            loginAs(9L, true);
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(reportOfDepartment(2L)));

            newService().getById(100L); // không ném lỗi dù khác đơn vị
        }

        @Test
        @DisplayName("Xe CHƯA gán đơn vị + tài khoản SCOPED -> 403 (cách ly — Quality Gate lượt 3, sửa lại quyết định SAI ở lượt 2)")
        void deviceWithoutDepartmentIsQuarantinedFromScopedAccounts() {
            loginAs(1L, false);
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(reportOfDepartment(null)));

            assertThatThrownBy(() -> newService().getById(100L))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("Xe CHƯA gán đơn vị + tài khoản fullDataScope=true -> vẫn thấy (chỉ full-scope mới thấy dữ liệu chưa gán đơn vị)")
        void deviceWithoutDepartmentIsVisibleToFullScopeOnly() {
            loginAs(9L, true);
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(reportOfDepartment(null)));

            newService().getById(100L); // không ném lỗi
        }

        @Test
        @DisplayName("Tài khoản CHƯA gán đơn vị đọc báo cáo xe ĐÃ gán đơn vị -> 403 Forbidden (fail-closed)")
        void accountWithoutDepartmentCannotAccessScopedDevice() {
            loginAs(null, false);
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(reportOfDepartment(2L)));

            assertThatThrownBy(() -> newService().getById(100L))
                    .isInstanceOf(ForbiddenException.class);
        }
    }

    @Nested
    @DisplayName("update() — kiểm tra CẢ xe nguồn lẫn xe đích (Quality Gate lượt 4)")
    class Update {

        /**
         * Lỗ hổng thật Codex nêu (lượt 4, 2026-09-15): trước đây
         * {@code update()} chỉ kiểm tra đơn vị của xe ĐÍCH (trong
         * {@code applyRelations}) — KHÔNG kiểm tra đơn vị của xe NGUỒN (báo
         * cáo hiện có). Tài khoản đơn vị A biết id báo cáo của đơn vị B vẫn
         * update được (miễn gửi vehicleId thuộc đơn vị A) — chiếm đoạt báo
         * cáo B sang A.
         */
        @Test
        @DisplayName("Báo cáo NGUỒN thuộc đơn vị khác, xe ĐÍCH thuộc đơn vị mình -> 403, KHÔNG mutation")
        void crossDepartmentSourceReportCannotBeUpdatedEvenWithOwnTargetVehicle() {
            loginAs(1L, false);
            TransportReport sourceReport = reportOfDepartment(2L); // đơn vị KHÁC (id=2)
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(sourceReport));

            TransportReportRequest request = new TransportReportRequest();
            request.setVehicleId(999L); // xe ĐÍCH — giả định thuộc đơn vị 1 (của người gọi), không cần stub vì phải throw TRƯỚC khi đọc tới
            request.setTrips(List.of());

            assertThatThrownBy(() -> newService().update(100L, request))
                    .isInstanceOf(ForbiddenException.class);

            // Không mutation: mapper/save KHÔNG được gọi — lỗi phải xảy ra
            // TRƯỚC mọi thay đổi lên entity, không chỉ trước khi commit.
            verify(transportReportMapper, org.mockito.Mockito.never()).updateEntity(any(), any());
            verify(transportReportRepository, org.mockito.Mockito.never()).save(any());
            verify(deviceRepository, org.mockito.Mockito.never()).findById(999L);
        }

        @Test
        @DisplayName("Báo cáo NGUỒN cùng đơn vị -> update bình thường (không regression)")
        void sameDepartmentSourceReportCanStillBeUpdated() {
            loginAs(1L, false);
            TransportReport sourceReport = reportOfDepartment(1L);
            when(transportReportRepository.findById(100L)).thenReturn(Optional.of(sourceReport));
            // applyRelations() gọi shiftRepository TRƯỚC deviceRepository —
            // chỉ cần stub tới đây là đủ để chứng minh KHÔNG bị chặn ở
            // department-scope (ném ResourceNotFoundException ở bước sau,
            // không phải ForbiddenException). Không stub deviceRepository vì
            // sẽ không bao giờ được gọi tới (unnecessary stubbing).
            when(shiftRepository.findById(any())).thenReturn(Optional.empty());

            TransportReportRequest request = new TransportReportRequest();
            request.setVehicleId(999L);
            request.setShiftId(50L);
            request.setEmployeeId(60L);
            request.setTrips(List.of());

            // Không xác minh hết luồng update thành công (cần mock rất nhiều
            // repository khác không thuộc phạm vi test này) — chỉ xác nhận
            // KHÔNG bị chặn ở department-scope (ném lỗi khác, không phải
            // ForbiddenException do đơn vị).
            assertThatThrownBy(() -> newService().update(100L, request))
                    .isNotInstanceOf(ForbiddenException.class);
        }
    }

    @Nested
    @DisplayName("search()/findAllForExport() — currentScopeDepartmentId (Quality Gate lượt 3)")
    class SearchAndExport {

        private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
        private static final LocalDate TO = LocalDate.of(2026, 1, 31);

        @Test
        @DisplayName("Tài khoản scoped (id=1) -> truyền đúng departmentId=1 vào repository, KHÔNG null")
        void scopedAccountPassesOwnDepartmentToRepository() {
            loginAs(1L, false);
            Pageable pageable = PageRequest.of(0, 20);
            when(transportReportRepository.searchIds(eq(FROM), eq(TO), any(), any(), eq(1L), eq(pageable)))
                    .thenReturn(new PageImpl<>(List.of()));
            when(transportReportRepository.findAllByIdWithDetails(any())).thenReturn(List.of());

            newService().search(FROM, TO, null, null, pageable);

            verify(transportReportRepository).searchIds(eq(FROM), eq(TO), any(), any(), eq(1L), eq(pageable));
        }

        @Test
        @DisplayName("Tài khoản fullDataScope=true -> truyền departmentId=null (không lọc)")
        void fullScopeAccountPassesNullDepartmentToRepository() {
            loginAs(9L, true);
            Pageable pageable = PageRequest.of(0, 20);
            when(transportReportRepository.searchIds(eq(FROM), eq(TO), any(), any(), isNull(), eq(pageable)))
                    .thenReturn(new PageImpl<>(List.of()));
            when(transportReportRepository.findAllByIdWithDetails(any())).thenReturn(List.of());

            newService().search(FROM, TO, null, null, pageable);

            verify(transportReportRepository).searchIds(eq(FROM), eq(TO), any(), any(), isNull(), eq(pageable));
        }

        @Test
        @DisplayName("Tài khoản SCOPED nhưng CHƯA gán đơn vị -> 403 Forbidden, KHÔNG được xem 'toàn bộ' (lỗi thật đã sửa)")
        void accountWithoutDepartmentCannotSearch() {
            loginAs(null, false);
            Pageable pageable = PageRequest.of(0, 20);

            assertThatThrownBy(() -> newService().search(FROM, TO, null, null, pageable))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("findAllForExport: tài khoản SCOPED nhưng CHƯA gán đơn vị -> 403 Forbidden (cùng lỗi, đường export riêng)")
        void accountWithoutDepartmentCannotExport() {
            loginAs(null, false);

            assertThatThrownBy(() -> newService().findAllForExport(FROM, TO, null, null))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("findAllForExport: tài khoản scoped -> truyền đúng departmentId của mình")
        void exportPassesOwnDepartmentToRepository() {
            loginAs(1L, false);
            when(transportReportRepository.searchAllIds(eq(FROM), eq(TO), any(), any(), eq(1L)))
                    .thenReturn(List.of());
            when(transportReportRepository.findAllByIdWithDetails(any())).thenReturn(List.of());

            newService().findAllForExport(FROM, TO, null, null);

            verify(transportReportRepository).searchAllIds(eq(FROM), eq(TO), any(), any(), eq(1L));
        }
    }
}
