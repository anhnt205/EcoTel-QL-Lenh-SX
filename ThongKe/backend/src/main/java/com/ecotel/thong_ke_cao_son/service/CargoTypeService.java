package com.ecotel.thong_ke_cao_son.service;

import com.ecotel.thong_ke_cao_son.dto.request.CargoTypeRequest;
import com.ecotel.thong_ke_cao_son.dto.response.BulkDeleteResponse;
import com.ecotel.thong_ke_cao_son.dto.response.CargoTypeResponse;
import com.ecotel.thong_ke_cao_son.dto.response.PageResponse;
import com.ecotel.thong_ke_cao_son.exception.BadRequestException;
import com.ecotel.thong_ke_cao_son.exception.ResourceNotFoundException;
import com.ecotel.thong_ke_cao_son.mapper.CargoTypeMapper;
import com.ecotel.thong_ke_cao_son.model.CargoGroup;
import com.ecotel.thong_ke_cao_son.model.CargoType;
import com.ecotel.thong_ke_cao_son.repository.CargoGroupRepository;
import com.ecotel.thong_ke_cao_son.repository.AcceptanceProductRepository;
import com.ecotel.thong_ke_cao_son.repository.CargoTypeRepository;
import com.ecotel.thong_ke_cao_son.repository.TtlClhRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Danh mục Chủng loại hàng. */
@Service
@RequiredArgsConstructor
public class CargoTypeService {

    private final CargoTypeRepository cargoTypeRepository;
    private final CargoGroupRepository cargoGroupRepository;
    private final CargoTypeMapper cargoTypeMapper;
    private final AcceptanceProductRepository acceptanceProductRepository;
    private final TtlClhRepository ttlClhRepository;

    @Transactional(readOnly = true)
    public PageResponse<CargoTypeResponse> getAll(String keyword, Pageable pageable) {
        Page<CargoTypeResponse> page = cargoTypeRepository.search(keyword, pageable)
                .map(cargoTypeMapper::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public CargoTypeResponse getById(Long id) {
        return cargoTypeMapper.toResponse(find(id));
    }

    @Transactional
    public CargoTypeResponse create(CargoTypeRequest request) {
        ensureCodeAvailable(request.getCode(), null);
        CargoType entity = cargoTypeMapper.toEntity(request);
        applyRelations(entity, request);
        return cargoTypeMapper.toResponse(cargoTypeRepository.save(entity));
    }

    @Transactional
    public List<CargoTypeResponse> bulkCreate(List<CargoTypeRequest> requests) {
        // Ràng buộc UNIQUE của DB không bắt được trùng giữa các dòng của
        // CÙNG một lần insert -> phải chặn ở đây.
        List<String> codes = requests.stream().map(CargoTypeRequest::getCode).toList();
        if (codes.stream().distinct().count() != codes.size()) {
            throw new BadRequestException("Có mã chủng loại hàng bị trùng nhau trong danh sách gửi lên");
        }
        requests.forEach(r -> ensureCodeAvailable(r.getCode(), null));
        List<CargoType> entities = requests.stream().map(r -> {
            CargoType e = cargoTypeMapper.toEntity(r);
            applyRelations(e, r);
            return e;
        }).toList();
        return cargoTypeRepository.saveAll(entities).stream()
                .map(cargoTypeMapper::toResponse).toList();
    }

    @Transactional
    public CargoTypeResponse update(Long id, CargoTypeRequest request) {
        CargoType entity = find(id);
        ensureCodeAvailable(request.getCode(), id);
        cargoTypeMapper.updateEntity(entity, request);
        applyRelations(entity, request);
        return cargoTypeMapper.toResponse(cargoTypeRepository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        cargoTypeRepository.delete(find(id));
    }

    @Transactional
    public BulkDeleteResponse bulkDelete(List<Long> ids) {
        List<CargoType> found = cargoTypeRepository.findAllById(ids);
        cargoTypeRepository.deleteAll(found);
        return BulkDeleteResponse.builder()
                .requestedCount(ids.size())
                .deletedCount(found.size())
                .build();
    }

    private CargoType find(Long id) {
        return cargoTypeRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy chủng loại hàng với id: " + id));
    }

    private CargoGroup findGroup(Long id) {
        return cargoGroupRepository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Không tìm thấy nhóm chủng loại hàng với id: " + id));
    }

    /**
     * Gắn ba quan hệ từ id — MapStruct cố tình bỏ qua chúng.
     *
     * <p>Sản phẩm nghiệm thu và TTL CLH cho phép để trống (mục S1): dữ liệu
     * chủng loại hàng có sẵn từ trước, không thể bắt khai đủ ngay. Nhưng nếu
     * gửi id thì id đó phải tồn tại, không im lặng bỏ qua.
     */
    private void applyRelations(CargoType entity, CargoTypeRequest request) {
        entity.setCargoGroup(findGroup(request.getCargoGroupId()));

        entity.setAcceptanceProduct(request.getAcceptanceProductId() == null ? null
                : acceptanceProductRepository.findById(request.getAcceptanceProductId()).orElseThrow(
                        () -> new ResourceNotFoundException("Không tìm thấy sản phẩm nghiệm thu với id: "
                                + request.getAcceptanceProductId())));

        entity.setTtlClh(request.getTtlClhId() == null ? null
                : ttlClhRepository.findById(request.getTtlClhId()).orElseThrow(
                        () -> new ResourceNotFoundException("Không tìm thấy TTL CLH với id: "
                                + request.getTtlClhId())));
    }

    private void ensureCodeAvailable(String code, Long selfId) {
        boolean taken = selfId == null
                ? cargoTypeRepository.findByCode(code).isPresent()
                : cargoTypeRepository.existsByCodeAndIdNot(code, selfId);
        if (taken) {
            throw new BadRequestException("Mã chủng loại hàng đã tồn tại: " + code);
        }
    }
}
