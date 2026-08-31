package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.DeviceProductionAttributesRequest;
import com.ecotel.thong_ke_cao_son.dto.response.DeviceResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.enums.DeviceGroup;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.DeviceMapper;
import com.ecotel.thong_ke_cao_son.model.Device;
import com.ecotel.thong_ke_cao_son.model.VehicleCategoryClass;
import com.ecotel.thong_ke_cao_son.model.VehicleFuelClass;
import com.ecotel.thong_ke_cao_son.repository.DeviceRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleCategoryClassRepository;
import com.ecotel.thong_ke_cao_son.repository.VehicleFuelClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Khai báo THUỘC TÍNH SẢN LƯỢNG cho thiết bị đã có (mục S3).
 *
 * <p>Thiết bị vốn chỉ-đọc trong hệ này (dữ liệu có sẵn từ trước, không có
 * màn thêm/sửa). Nhưng công thức sản lượng cần hạng xe, chất lượng, chủng
 * loại xe theo hai cách phân nhóm và gầu xúc — nên phải có đường nhập cho
 * riêng những trường đó.
 *
 * <p>Đây KHÔNG phải màn sửa thiết bị: chỉ ghi được đúng các trường sản lượng,
 * mọi thứ khác giữ nguyên.
 */
@Service
@RequiredArgsConstructor
public class DeviceProductionAttributesService {

    private final DeviceRepository deviceRepository;
    private final VehicleFuelClassRepository fuelClassRepository;
    private final VehicleCategoryClassRepository categoryClassRepository;
    private final DeviceMapper deviceMapper;

    @Transactional(readOnly = true)
    public PageResponse<DeviceResponse> getAll(String keyword, DeviceGroup categoryGroup, Pageable pageable) {
        return PageResponse.from(
                deviceRepository.search(keyword, null, categoryGroup, null, pageable)
                        .map(deviceMapper::toResponse));
    }

    @Transactional
    public DeviceResponse update(Long id, DeviceProductionAttributesRequest request) {
        Device device = deviceRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy thiết bị với id: " + id));
        apply(device, request);
        return deviceMapper.toResponse(deviceRepository.save(device));
    }

    /**
     * Ghi hàng loạt theo MÃ thiết bị — đường dùng cho nhập Excel.
     *
     * <p>Đội xe có hàng trăm chiếc; bắt sửa từng cái trên web là không thực
     * tế, mà bảng thuộc tính này người dùng vốn đã có sẵn dạng bảng tính.
     *
     * <p>Mã không tìm thấy thì <b>báo lỗi</b> chứ không bỏ qua: bỏ qua sẽ
     * khiến người nhập tưởng đã cập nhật xong cả file.
     *
     * <p><b>Ngữ nghĩa THAY THẾ, không phải bổ sung:</b> mọi thuộc tính sản
     * lượng của thiết bị được ghi đè theo đúng nội dung file, kể cả ô để
     * trống. Chọn cách này vì file do chính hệ xuất ra luôn có đủ cột, nên
     * "file là nguồn sự thật" là quy tắc dễ đoán nhất. Hệ quả cần biết: một
     * file tự chế chỉ có vài cột sẽ xoá trắng các cột còn lại — cảnh báo này
     * được ghi vào sheet "HuongDan" của file mẫu.
     */
    @Transactional
    public List<DeviceResponse> bulkUpsert(List<DeviceProductionAttributesRequest> requests) {
        List<String> missing = requests.stream()
                .map(DeviceProductionAttributesRequest::getCode)
                .filter(c -> c == null || c.isBlank() || deviceRepository.findByCode(c.trim()).isEmpty())
                .map(c -> c == null || c.isBlank() ? "(trống)" : c)
                .toList();
        if (!missing.isEmpty()) {
            throw new BadRequestException("Không tìm thấy thiết bị với mã: "
                    + String.join(", ", missing.stream().limit(10).toList())
                    + (missing.size() > 10 ? " … và " + (missing.size() - 10) + " mã khác" : ""));
        }

        return requests.stream().map(r -> {
            Device device = deviceRepository.findByCode(r.getCode().trim()).orElseThrow();
            apply(device, r);
            return deviceMapper.toResponse(deviceRepository.save(device));
        }).toList();
    }

    private void apply(Device device, DeviceProductionAttributesRequest r) {
        device.setCarRenovation(r.getCarRenovation());
        device.setVehicleClass(r.getVehicleClass());
        device.setQualityLevel(r.getQualityLevel());
        device.setBucketCapacity(r.getBucketCapacity());

        VehicleFuelClass fuelClass = null;
        if (r.getFuelClassId() != null) {
            fuelClass = fuelClassRepository.findById(r.getFuelClassId()).orElseThrow(
                    () -> new ResourceNotFoundException(
                            "Không tìm thấy chủng loại xe + DMNL id: " + r.getFuelClassId()));
        }
        device.setFuelClass(fuelClass);

        VehicleCategoryClass categoryClass = null;
        if (r.getCategoryClassId() != null) {
            categoryClass = categoryClassRepository.findById(r.getCategoryClassId()).orElseThrow(
                    () -> new ResourceNotFoundException(
                            "Không tìm thấy chủng loại xe + phân loại id: " + r.getCategoryClassId()));
        }
        device.setCategoryClass(categoryClass);
    }
}
