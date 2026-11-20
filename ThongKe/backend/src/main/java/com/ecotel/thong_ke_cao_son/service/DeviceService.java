package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.DeviceRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.DeviceResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.enums.DeviceStatus;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.DeviceMapper;
import com.ecotel.thong_ke_cao_son.model.Device;
import com.ecotel.thong_ke_cao_son.model.ExcavatorBucket;
import com.ecotel.thong_ke_cao_son.repository.DepartmentRepository;
import com.ecotel.thong_ke_cao_son.repository.ExcavatorBucketRepository;
import com.ecotel.thong_ke_cao_son.repository.DeviceModelRepository;
import com.ecotel.thong_ke_cao_son.repository.DeviceRepository;
import com.ecotel.thong_ke_cao_son.repository.DeviceTypeRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleCategoryClassRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleFuelClassRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleRankRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Danh mục thiết bị (Xe / Máy): đọc + thêm/sửa/xóa tay.
 *
 * <p>Lưu ý: thiết bị đồng bộ từ QL-TAISAN ({@code TaiSanSyncService}) vẫn có thể bị đồng bộ ghi đè
 * các trường nguồn (tên, loại, công suất...) ở lần đồng bộ kế tiếp; thiết bị nhập tay không có
 * {@code externalTaiSanId} nên không bị đồng bộ đụng tới.
 */
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceMapper deviceMapper;
    private final DeviceTypeRepository deviceTypeRepository;
    private final DeviceModelRepository deviceModelRepository;
    private final DepartmentRepository departmentRepository;
    private final VehicleFuelClassRepository fuelClassRepository;
    private final VehicleCategoryClassRepository categoryClassRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final VehicleRankRepository vehicleRankRepository;
    private final ExcavatorBucketRepository bucketRepository;

    @Transactional(readOnly = true)
    public PageResponse<DeviceResponse> getAll(String keyword, String categoryName, DeviceGroup categoryGroup, Long departmentId, Pageable pageable) {
        Page<DeviceResponse> page = deviceRepository.search(keyword, categoryName, categoryGroup, departmentId, pageable)
                .map(deviceMapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public DeviceResponse getById(Long id) {
        return deviceMapper.toResponse(find(id));
    }

    @Transactional
    public DeviceResponse create(DeviceRequest request) {
        String code = newCode(request);
        ensureCodeAvailable(code, null);
        Device device = new Device();
        device.setCode(code);
        apply(device, request);
        if (device.getStatus() == null) {
            device.setStatus(DeviceStatus.AVAILABLE);
        }
        return deviceMapper.toResponse(deviceRepository.save(device));
    }

    /** Tạo nhiều thiết bị trong một lần (màn Thêm mới nhập nhiều dòng). */
    @Transactional
    public List<DeviceResponse> bulkCreate(List<DeviceRequest> requests) {
        List<String> codes = requests.stream().map(this::newCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có biển số / mã thiết bị bị trùng nhau trong danh sách gửi lên");
        }
        codes.forEach(c -> ensureCodeAvailable(c, null));
        return deviceRepository.saveAll(requests.stream().map(r -> {
                    Device d = new Device();
                    d.setCode(newCode(r));
                    apply(d, r);
                    if (d.getStatus() == null) {
                        d.setStatus(DeviceStatus.AVAILABLE);
                    }
                    return d;
                }).toList())
                .stream().map(deviceMapper::toResponse).toList();
    }

    @Transactional
    public DeviceResponse update(Long id, DeviceRequest request) {
        Device device = find(id);
        apply(device, request);
        return deviceMapper.toResponse(deviceRepository.save(device));
    }

    @Transactional
    public void delete(Long id) {
        deviceRepository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<Device> found = deviceRepository.findAllById(ids);
        deviceRepository.deleteAll(found);
        return BulkDeleteResponse.builder().requestedCount(ids.size()).deletedCount(found.size()).build();
    }

    private void apply(Device d, DeviceRequest r) {
        d.setName(r.getName());
        d.setVehicleNumber(r.getVehicleNumber() == null ? null : r.getVehicleNumber().trim());
        d.setFuelType(r.getFuelType());
        d.setCapacity(r.getCapacity());
        d.setNote(r.getNote());
        if (r.getStatus() != null) {
            d.setStatus(r.getStatus());
        }
        // Loại thiết bị / chủng loại: chỉ ghi khi biểu mẫu có gửi (màn Xe không còn hai ô này => giữ nguyên giá trị cũ khi sửa).
        if (r.getCategoryId() != null) {
            d.setCategory(deviceTypeRepository.findById(r.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại thiết bị với id: " + r.getCategoryId())));
        } else if (d.getCategory() == null && r.getCategoryGroup() != null) {
            // Thiết bị mới không chọn loại: gán loại đầu tiên của nhóm (XE/MAY) để thiết bị vẫn thuộc đúng danh mục Xe/Máy.
            d.setCategory(deviceTypeRepository.findFirstByGroupOrderByIdAsc(r.getCategoryGroup())
                    .orElseThrow(() -> new BadRequestException("Chưa có loại thiết bị nào thuộc nhóm " + r.getCategoryGroup()
                            + " — hãy tạo loại thiết bị trước")));
        }
        if (r.getMaterialId() != null) {
            d.setMaterial(deviceModelRepository.findById(r.getMaterialId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chủng loại với id: " + r.getMaterialId())));
        }
        d.setDepartment(r.getDepartmentId() == null ? null : departmentRepository.findById(r.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn vị với id: " + r.getDepartmentId())));
        applyProductionAttributes(d, r);
    }

    /**
     * Ghi bộ thuộc tính sản lượng theo nhóm màn (XE / MAY): THAY THẾ các trường của nhóm đó theo nội dung biểu mẫu
     * (ô trống = xoá). Không có nhóm thì không đụng tới. Trường {@code vehicleClass} (chuỗi cũ, đã khai tử) giữ nguyên.
     */
    private void applyProductionAttributes(Device d, DeviceRequest r) {
        if (r.getCategoryGroup() == DeviceGroup.XE) {
            d.setCarRenovation(r.getCarRenovation());
            d.setQualityLevel(r.getQualityLevel());
            d.setFuelClass(r.getFuelClassId() == null ? null : fuelClassRepository.findById(r.getFuelClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chủng loại xe + DMNL id: " + r.getFuelClassId())));
            d.setVehicleType(r.getVehicleTypeId() == null ? null : vehicleTypeRepository.findById(r.getVehicleTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chủng loại xe id: " + r.getVehicleTypeId())));
            d.setVehicleRank(r.getVehicleRankId() == null ? null : vehicleRankRepository.findById(r.getVehicleRankId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hạng xe id: " + r.getVehicleRankId())));
            d.setCategoryClass(r.getCategoryClassId() == null ? null : categoryClassRepository.findById(r.getCategoryClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chủng loại xe + phân loại id: " + r.getCategoryClassId())));
        } else if (r.getCategoryGroup() == DeviceGroup.MAY) {
            // Gầu xúc chọn từ danh mục: ô trống = bỏ gán gầu, nhưng KHÔNG xoá dung tích gầu cũ (dữ liệu đồng bộ từ DSMAY).
            ExcavatorBucket bucket = r.getBucketId() == null ? null : bucketRepository.findById(r.getBucketId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gầu xúc id: " + r.getBucketId()));
            d.setBucket(bucket);
            // Hạng xe/máy: danh mục dùng chung cho Xe và Máy; ô trống = bỏ gán
            d.setVehicleRank(r.getVehicleRankId() == null ? null : vehicleRankRepository.findById(r.getVehicleRankId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hạng xe/máy id: " + r.getVehicleRankId())));
            if (bucket != null && bucket.getCapacity() != null) {
                d.setBucketCapacity(bucket.getCapacity());
            } else if (r.getBucketCapacity() != null) {
                d.setBucketCapacity(r.getBucketCapacity());
            }
        }
    }

    /**
     * Mã (khóa) của thiết bị MỚI: lấy `code` nếu có, không thì lấy "Số xe / Số máy" (cột đã gộp với Biển số). Mã chỉ đặt lúc tạo,
     * sửa sau đó không đổi mã (mã là khóa tham chiếu của báo cáo, nhập liệu, thuộc tính sản lượng).
     */
    private String newCode(DeviceRequest r) {
        String code = r.getCode() != null && !r.getCode().isBlank() ? r.getCode() : r.getVehicleNumber();
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Số xe / số máy là bắt buộc");
        }
        return code.trim();
    }

    private Device find(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị với id: " + id));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        String trimmed = code.trim();
        boolean taken = selfId == null
                ? deviceRepository.existsByCode(trimmed)
                : deviceRepository.existsByCodeAndIdNot(trimmed, selfId);
        if (taken) {
            throw new BadRequestException("Biển số / mã thiết bị đã tồn tại: " + trimmed);
        }
    }
}
