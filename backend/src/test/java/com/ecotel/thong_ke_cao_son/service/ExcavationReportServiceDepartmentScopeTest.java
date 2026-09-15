package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.ExcavationReportRequest;
import com.ecotel.thong_ke_cao_son.exception.ForbiddenException;
import com.ecotel.thong_ke_cao_son.mapper.ExcavationReportMapper;
import com.ecotel.thong_ke_cao_son.model.Department;
import com.ecotel.thong_ke_cao_son.model.Device;
import com.ecotel.thong_ke_cao_son.model.ExcavationReport;
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

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * {@code ExcavationReportService} — bản đối xứng của
 * {@code TransportReportServiceDepartmentScopeTest}, dùng
 * {@code excavatorDevice.department} thay vì {@code vehicle.department}. Xem
 * javadoc bên đó — cùng lý do, cùng lỗi Quality Gate lượt 3 của Codex
 * (2026-09-11) đã sửa.
 */
@ExtendWith(MockitoExtension.class)
class ExcavationReportServiceDepartmentScopeTest {

    @Mock private ExcavationReportRepository excavationReportRepository;
    @Mock private ExcavationReportTripRepository excavationReportTripRepository;
    @Mock private ReconciliationDecisionRepository reconciliationDecisionRepository;
    @Mock private ShiftRepository shiftRepository;
    @Mock private DeviceRepository deviceRepository;
    @Mock private LocationRepository locationRepository;
    @Mock private PickupPointRepository pickupPointRepository;
    @Mock private UserRepository userRepository;
    @Mock private CargoTypeRepository cargoTypeRepository;
    @Mock private ExcavationReportMapper excavationReportMapper;
    @Mock private ReconciliationEventPublisher reconciliationEventPublisher;
    @Mock private ReconciliationService reconciliationService;

    private ExcavationReportService newService() {
        return new ExcavationReportService(excavationReportRepository, excavationReportTripRepository,
                reconciliationDecisionRepository, shiftRepository, deviceRepository, locationRepository,
                pickupPointRepository, userRepository, cargoTypeRepository, excavationReportMapper,
                reconciliationEventPublisher, reconciliationService);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static void loginAs(Long departmentId, boolean fullDataScope) {
        AppUserDetails user = AppUserDetails.builder()
                .permissions(Map.of("excavation-reports", PermissionDto.builder().r(true).build()))
                .departmentId(departmentId)
                .fullDataScope(fullDataScope)
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }

    private static ExcavationReport reportOfDepartment(Long departmentId) {
        Department dept = null;
        if (departmentId != null) {
            dept = new Department();
            dept.setId(departmentId);
        }
        Device excavator = new Device();
        excavator.setDepartment(dept);
        ExcavationReport report = new ExcavationReport();
        report.setId(200L);
        report.setExcavatorDevice(excavator);
        return report;
    }

    @Nested
    @DisplayName("getById / assertDepartmentAccess")
    class GetById {

        @Test
        @DisplayName("Tài khoản đơn vị KT1 đọc báo cáo máy xúc đơn vị khác -> 403 Forbidden")
        void crossDepartmentAccessIsForbidden() {
            loginAs(113L, false);
            when(excavationReportRepository.findById(200L)).thenReturn(Optional.of(reportOfDepartment(12L)));

            assertThatThrownBy(() -> newService().getById(200L)).isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("Tài khoản đọc báo cáo CÙNG đơn vị -> cho phép")
        void sameDepartmentAccessIsAllowed() {
            loginAs(113L, false);
            when(excavationReportRepository.findById(200L)).thenReturn(Optional.of(reportOfDepartment(113L)));

            newService().getById(200L); // không ném lỗi
        }

        @Test
        @DisplayName("Máy xúc CHƯA gán đơn vị + tài khoản scoped -> 403 (cách ly)")
        void deviceWithoutDepartmentIsQuarantinedFromScopedAccounts() {
            loginAs(113L, false);
            when(excavationReportRepository.findById(200L)).thenReturn(Optional.of(reportOfDepartment(null)));

            assertThatThrownBy(() -> newService().getById(200L)).isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("Máy xúc CHƯA gán đơn vị + tài khoản fullDataScope=true -> vẫn thấy")
        void deviceWithoutDepartmentIsVisibleToFullScopeOnly() {
            loginAs(9L, true);
            when(excavationReportRepository.findById(200L)).thenReturn(Optional.of(reportOfDepartment(null)));

            newService().getById(200L); // không ném lỗi
        }
    }

    @Nested
    @DisplayName("update() — kiểm tra CẢ máy xúc nguồn lẫn đích (Quality Gate lượt 4)")
    class Update {

        /** Xem javadoc tương ứng ở TransportReportServiceDepartmentScopeTest.Update — cùng lỗ hổng, cùng cách sửa. */
        @Test
        @DisplayName("Báo cáo NGUỒN thuộc đơn vị khác, máy xúc ĐÍCH thuộc đơn vị mình -> 403, KHÔNG mutation")
        void crossDepartmentSourceReportCannotBeUpdatedEvenWithOwnTargetExcavator() {
            loginAs(113L, false);
            ExcavationReport sourceReport = reportOfDepartment(12L); // đơn vị KHÁC
            when(excavationReportRepository.findById(200L)).thenReturn(Optional.of(sourceReport));

            ExcavationReportRequest request = new ExcavationReportRequest();
            request.setExcavatorDeviceId(999L);
            request.setTrips(List.of());

            assertThatThrownBy(() -> newService().update(200L, request))
                    .isInstanceOf(ForbiddenException.class);

            verify(excavationReportMapper, org.mockito.Mockito.never()).updateEntity(any(), any());
            verify(excavationReportRepository, org.mockito.Mockito.never()).save(any());
            verify(deviceRepository, org.mockito.Mockito.never()).findById(999L);
        }

        @Test
        @DisplayName("Báo cáo NGUỒN cùng đơn vị -> update không bị chặn ở department-scope (không regression)")
        void sameDepartmentSourceReportCanStillBeUpdated() {
            loginAs(113L, false);
            ExcavationReport sourceReport = reportOfDepartment(113L);
            when(excavationReportRepository.findById(200L)).thenReturn(Optional.of(sourceReport));
            when(shiftRepository.findById(any())).thenReturn(Optional.empty());

            ExcavationReportRequest request = new ExcavationReportRequest();
            request.setExcavatorDeviceId(999L);
            request.setShiftId(50L);
            request.setReceivingLocationId(60L);
            request.setEmployeeId(70L);
            request.setTrips(List.of());

            assertThatThrownBy(() -> newService().update(200L, request))
                    .isNotInstanceOf(ForbiddenException.class);
        }
    }

    @Nested
    @DisplayName("search()/findAllForExport()/getDistinctExcavationFloors() — currentScopeDepartmentId")
    class SearchExportFloors {

        private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
        private static final LocalDate TO = LocalDate.of(2026, 1, 31);

        @Test
        @DisplayName("Tài khoản SCOPED nhưng CHƯA gán đơn vị -> search() 403 Forbidden")
        void accountWithoutDepartmentCannotSearch() {
            loginAs(null, false);
            Pageable pageable = PageRequest.of(0, 20);

            assertThatThrownBy(() -> newService().search(FROM, TO, null, null, null, null, pageable))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("findAllForExport: tài khoản CHƯA gán đơn vị -> 403 Forbidden")
        void accountWithoutDepartmentCannotExport() {
            loginAs(null, false);

            assertThatThrownBy(() -> newService().findAllForExport(FROM, TO, null, null, null, null))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("getDistinctExcavationFloors: tài khoản CHƯA gán đơn vị -> 403 Forbidden (trước đây bỏ sót hoàn toàn)")
        void accountWithoutDepartmentCannotListFloors() {
            loginAs(null, false);

            assertThatThrownBy(() -> newService().getDistinctExcavationFloors(FROM, TO))
                    .isInstanceOf(ForbiddenException.class);
        }

        @Test
        @DisplayName("getDistinctExcavationFloors: tài khoản scoped -> truyền đúng departmentId của mình vào repository")
        void floorsQueryScopedByDepartment() {
            loginAs(113L, false);
            when(excavationReportRepository.findDistinctExcavationFloors(FROM, TO, 113L)).thenReturn(List.of("3"));

            newService().getDistinctExcavationFloors(FROM, TO);

            verify(excavationReportRepository).findDistinctExcavationFloors(FROM, TO, 113L);
        }

        @Test
        @DisplayName("getDistinctExcavationFloors: tài khoản fullDataScope=true -> truyền null (không lọc)")
        void floorsQueryFullScopeNoFilter() {
            loginAs(9L, true);
            when(excavationReportRepository.findDistinctExcavationFloors(FROM, TO, null)).thenReturn(List.of("1", "2", "3"));

            newService().getDistinctExcavationFloors(FROM, TO);

            verify(excavationReportRepository).findDistinctExcavationFloors(FROM, TO, null);
        }

        @Test
        @DisplayName("search: tài khoản scoped -> truyền đúng departmentId vào repository")
        void searchScopedByDepartment() {
            loginAs(113L, false);
            Pageable pageable = PageRequest.of(0, 20);
            when(excavationReportRepository.search(eq(FROM), eq(TO), any(), any(), any(), any(), eq(113L), eq(pageable)))
                    .thenReturn(new PageImpl<>(List.of()));

            newService().search(FROM, TO, null, null, null, null, pageable);

            verify(excavationReportRepository).search(eq(FROM), eq(TO), any(), any(), any(), any(), eq(113L), eq(pageable));
        }

        @Test
        @DisplayName("search: tài khoản fullDataScope=true -> truyền null (không lọc)")
        void searchFullScopeNoFilter() {
            loginAs(9L, true);
            Pageable pageable = PageRequest.of(0, 20);
            when(excavationReportRepository.search(eq(FROM), eq(TO), any(), any(), any(), any(), isNull(), eq(pageable)))
                    .thenReturn(new PageImpl<>(List.of()));

            newService().search(FROM, TO, null, null, null, null, pageable);

            verify(excavationReportRepository).search(eq(FROM), eq(TO), any(), any(), any(), any(), isNull(), eq(pageable));
        }
    }
}
